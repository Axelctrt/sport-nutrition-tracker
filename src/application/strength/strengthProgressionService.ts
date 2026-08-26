import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type {
  ProgressionSuggestion,
  ProgressionSuggestionStatus,
  StrengthSet,
  WorkoutSessionExercise,
} from '@/domain/models/strength';
import {
  evaluateStrengthProgressionEligibility,
  roundStrengthLoad,
} from '@/domain/strength/strengthProgressionEligibility';
import type { ProgressionSuggestionRepository } from '@/infrastructure/repositories/contracts/ProgressionSuggestionRepository';
import type { StrengthSetRepository } from '@/infrastructure/repositories/contracts/StrengthSetRepository';
import type { WorkoutSessionRepository } from '@/infrastructure/repositories/contracts/WorkoutSessionRepository';
import type { WorkoutTemplateRepository } from '@/infrastructure/repositories/contracts/WorkoutTemplateRepository';
import { currentIsoDateTime } from '@/shared/utils/entities';

export type ProgressionDecision = Extract<
  ProgressionSuggestionStatus,
  'accepted' | 'rejected' | 'deferred'
>;

function createSuggestionInput(
  sessionId: EntityId,
  templateId: EntityId,
  exercise: WorkoutSessionExercise,
  sets: StrengthSet[],
): NewEntity<ProgressionSuggestion> | undefined {
  const evaluation = evaluateStrengthProgressionEligibility(exercise, sets);
  if (!evaluation.eligible || !exercise.sourceTemplateExerciseId) {
    return undefined;
  }

  return {
    sessionId,
    sessionExerciseId: exercise.id,
    exerciseDefinitionId: exercise.exerciseDefinitionId,
    templateId,
    templateExerciseId: exercise.sourceTemplateExerciseId,
    currentLoadKg: evaluation.currentLoadKg,
    suggestedLoadKg: evaluation.suggestedLoadKg,
    incrementKg: evaluation.incrementKg,
    status: 'pending',
    reason: 'repetitionRangeCompleted',
  };
}

export async function generateProgressionSuggestions(
  sessionRepository: WorkoutSessionRepository,
  setRepository: StrengthSetRepository,
  suggestionRepository: ProgressionSuggestionRepository,
  sessionId: EntityId,
): Promise<ProgressionSuggestion[]> {
  const session = await sessionRepository.getById(sessionId);
  if (!session) throw new RepositoryError('Séance introuvable.', 'create');
  if (session.status !== 'completed' || !session.sourceTemplateId) return [];

  const [exercises, sets, existingSuggestions] = await Promise.all([
    sessionRepository.listExercises(sessionId),
    setRepository.listBySession(sessionId),
    suggestionRepository.listBySession(sessionId),
  ]);
  const existingExerciseIds = new Set(
    existingSuggestions.map((suggestion) => suggestion.sessionExerciseId),
  );

  const suggestions = exercises.flatMap((exercise) => {
    if (existingExerciseIds.has(exercise.id)) return [];
    const input = createSuggestionInput(
      session.id,
      session.sourceTemplateId!,
      exercise,
      sets.filter((set) => set.sessionExerciseId === exercise.id),
    );
    return input ? [input] : [];
  });

  if (suggestions.length === 0) return existingSuggestions;
  const created = await suggestionRepository.createMany(suggestions);
  return [...existingSuggestions, ...created];
}

export function listProgressionSuggestionsForSession(
  repository: ProgressionSuggestionRepository,
  sessionId: EntityId,
): Promise<ProgressionSuggestion[]> {
  return repository.listBySession(sessionId);
}

export async function decideProgressionSuggestion(
  suggestionRepository: ProgressionSuggestionRepository,
  templateRepository: WorkoutTemplateRepository,
  suggestionId: EntityId,
  decision: ProgressionDecision,
  acceptedLoadKg?: number,
): Promise<ProgressionSuggestion> {
  const suggestion = await suggestionRepository.getById(suggestionId);
  if (!suggestion) throw new RepositoryError('Suggestion de progression introuvable.', 'update');
  if (suggestion.status === 'accepted' || suggestion.status === 'rejected') {
    throw new RepositoryError('Cette suggestion a déjà reçu une décision définitive.', 'update');
  }

  const decidedAt = currentIsoDateTime();
  if (decision !== 'accepted') {
    return suggestionRepository.update(suggestion.id, {
      status: decision,
      decidedAt,
      appliedAt: undefined,
    });
  }

  const selectedLoadKg = roundStrengthLoad(acceptedLoadKg ?? suggestion.suggestedLoadKg);
  if (!Number.isFinite(selectedLoadKg) || selectedLoadKg <= suggestion.currentLoadKg) {
    throw new RepositoryError(
      'La charge retenue doit être supérieure à la charge actuelle.',
      'update',
    );
  }
  if (!suggestion.templateExerciseId) {
    throw new RepositoryError(
      'Cette suggestion n’est plus liée à un exercice de séance modèle.',
      'update',
    );
  }

  const templateExercise = await templateRepository.getExerciseById(suggestion.templateExerciseId);
  if (!templateExercise) {
    throw new RepositoryError(
      'L’exercice de la séance modèle n’existe plus. La suggestion n’a pas été appliquée.',
      'update',
    );
  }

  await templateRepository.updateExercise(templateExercise.id, { targetLoadKg: selectedLoadKg });
  return suggestionRepository.update(suggestion.id, {
    suggestedLoadKg: selectedLoadKg,
    status: 'accepted',
    decidedAt,
    appliedAt: decidedAt,
  });
}
