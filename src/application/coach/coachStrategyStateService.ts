import { calculateIntegratedCoachAnalysis } from '@/application/coach/integratedCoachDecisionService';
import { buildCoachReviewSnapshot } from '@/domain/coach/coachReview';
import { buildCoachExplanation } from '@/domain/coach/coachExplanation';
import { composeAppSettings, normalizeUserSettings, normalizeDeviceSettings } from '@/domain/defaults/appSettings';
import { LOCAL_USER_PROFILE_ID, USER_SETTINGS_ID, DEVICE_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { CoachStrategyKind } from '@/domain/coach/coachStrategy';
import {
  appendStrategyProposal, createLegacyCoachStrategyState, emptyCoachStrategyState,
  findStrategyResponseRetry, projectActiveStrategy, respondToStrategyProposal,
  type StrategyAcceptance,
} from '@/domain/coach/coachStrategyState';
import type { CoachStrategyRepository, CoachStrategySources } from '@/infrastructure/repositories/contracts/CoachStrategyRepository';
import { repositories } from '@/infrastructure/repositories/repositories';

const between = <T extends { date: string }>(values: T[], start: string, end: string) =>
  values.filter(({ date }) => date >= start && date <= end);

/** Existing C4/C5/C8 over detached source rows. No normalizing repository writes. */
export async function analyzeStrategyContext(sources: CoachStrategySources, referenceDate: string, referenceWeightKg: number) {
  const profile = sources.userProfile.find(({ id }) => id === LOCAL_USER_PROFILE_ID);
  const user = sources.userSettings.find(({ id }) => id === USER_SETTINGS_ID);
  const device = sources.deviceSettings.find(({ id }) => id === DEVICE_SETTINGS_ID);
  if (!profile || !user || !device) throw new Error('Contexte Coach incomplet.');
  const sessions = {
    listAll: async () => sources.workoutSessions,
    listExercises: async (id: string) => sources.workoutSessionExercises.filter(({ sessionId }) => sessionId === id),
  };
  const analysis = await calculateIntegratedCoachAnalysis({ referenceDate, profile, referenceWeightKg }, {
    settings: { get: async () => composeAppSettings(normalizeUserSettings(user), normalizeDeviceSettings(device)) },
    weight: { listBetween: async (a, b) => between(sources.weights, a, b) },
    food: {
      listEntriesBetween: async (a, b) => between(sources.foodEntries, a, b),
      listJournalStatusesBetween: async (a, b) => between(sources.dailyJournalStatuses, a, b),
    },
    targets: { listTargetsBetween: async (a, b) => between(sources.dailyTargets, a, b) },
    steps: { listBetween: async (a, b) => between(sources.dailySteps, a, b) },
    dailyCoaching: {
      listCheckInsBetween: async (a, b) => between(sources.dailyCheckIns, a, b),
      listCheckOutsBetween: async (a, b) => between(sources.dailyCheckOuts, a, b),
    },
    activities: { listBetween: async (a, b) => between(sources.activities, a, b) },
    workoutSessions: sessions,
    weeklyReviews: { listAdjustments: async () => sources.acceptedCalorieAdjustments },
    strengthPerformance: {
      workoutSessions: sessions,
      strengthSets: { listBySession: async (id) => sources.strengthSets.filter(({ sessionId }) => sessionId === id) },
      strengthExercises: { listAll: async () => sources.exerciseDefinitions },
      weight: { listAll: async () => sources.weights },
    },
  });
  const review = buildCoachReviewSnapshot({
    weekStart: analysis.calorieAssessment.analysisStart,
    weekEnd: analysis.calorieAssessment.analysisEnd,
  }, analysis);
  return { profile, review,
    explanation: buildCoachExplanation({ currentReview: review, safetyAssessment: analysis.safetyAssessment, memories: [] }) };
}

export class CoachStrategyStateService {
  private readonly repository: CoachStrategyRepository;
  private readonly now: () => string;
  constructor(repository: CoachStrategyRepository = repositories.coachStrategy, now: () => string = () => new Date().toISOString()) {
    this.repository = repository;
    this.now = now;
  }

  async project() { return projectActiveStrategy(await this.repository.read()); }

  /** Strategy is explicit input. No engine selects it; the MVP only permits initial adoption. */
  async propose(input: { id: string; strategy: CoachStrategyKind; expectedRevision: number;
    referenceDate: string; referenceWeightKg: number }) {
    let explanation: Awaited<ReturnType<typeof analyzeStrategyContext>>['explanation'] | undefined;
    const state = await this.repository.transact(async (stored, sources, fingerprint) => {
      const context = await analyzeStrategyContext(sources, input.referenceDate, input.referenceWeightKg);
      const current = stored ?? createLegacyCoachStrategyState(context.profile.goal, 'legacyCompatibility')
        ?? emptyCoachStrategyState();
      if (current.revision !== input.expectedRevision) throw new Error('Version Strategy périmée.');
      explanation = context.explanation;
      return appendStrategyProposal(current, {
        id: input.id, version: 1, status: 'pending', objective: context.profile.goal,
        strategy: input.strategy, reasons: context.review.primaryReasons,
        context: { origin: 'c4c5', referenceDate: input.referenceDate, referenceWeightKg: input.referenceWeightKg,
          sourceFingerprint: fingerprint, primaryAction: context.review.decision.primaryAction,
          safetyStatus: context.review.safetyAssessment.status },
      });
    });
    return { state, explanation };
  }

  async respond(input: Omit<StrategyAcceptance, 'decidedAt'> & { expectedRevision: number; referenceDate: string }) {
    return this.repository.transact(async (state, sources, fingerprint) => {
      if (!state) throw new Error('Proposition absente.');
      if (findStrategyResponseRetry(state, input)) return state;
      if (state.revision !== input.expectedRevision) throw new Error('Version Strategy périmée.');
      const proposal = state.proposals.find(({ id }) => id === input.proposalId);
      if (!proposal) throw new Error('Proposition absente.');
      if (input.response === 'accepted') {
        const context = await analyzeStrategyContext(sources, input.referenceDate, proposal.context.referenceWeightKg);
        if (context.profile.goal !== proposal.objective || fingerprint !== proposal.context.sourceFingerprint
          || input.referenceDate !== proposal.context.referenceDate) throw new Error('Contexte Strategy périmé.');
        // C8 remains context, never a new Strategy veto. Calorie acceptance is not called.
      }
      return respondToStrategyProposal(state, {
        id: input.id, proposalId: input.proposalId, proposalVersion: input.proposalVersion,
        response: input.response, decidedAt: this.now(),
      });
    });
  }
}
