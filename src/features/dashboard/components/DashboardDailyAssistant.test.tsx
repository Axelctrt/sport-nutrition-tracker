import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { DailyCoachingDay } from '@/application/daily/dailyCoachingService';
import type { DailyActivityPlanningSnapshot } from '@/application/planning/dailyActivityPlanningService';
import type { WorkoutSessionSummary } from '@/application/strength/workoutSessionService';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import type { OtherActivity } from '@/domain/models/activity';
import type { WorkoutSession, WorkoutTemplate } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import { DashboardDailyAssistant } from '@/features/dashboard/components/DashboardDailyAssistant';
import type { DailyDashboardNutrition } from '@/features/dashboard/hooks/useDailyDashboard';
import { ToastProvider } from '@/shared/toast/ToastProvider';
import { createEntity } from '@/shared/utils/entities';

afterEach(cleanup);

function snapshot(): DailyTargetSnapshot {
  return {
    date: '2026-07-29',
    weight: {
      weightKg: 61.5,
      source: 'profile',
      period: { start: '2026-07-20', end: '2026-07-26' },
      dailyWeights: [],
    },
    dateWeightEntry: undefined,
    stepsEntry: undefined,
    activities: [],
    plannedActivities: [],
  } as unknown as DailyTargetSnapshot;
}

const nutrition: DailyDashboardNutrition = {
  consumed: {
    caloriesKcal: 0,
    proteinGrams: 0,
    carbohydratesGrams: 0,
    fatGrams: 0,
    entryCount: 0,
  },
  remaining: {
    caloriesKcal: 2_000,
    proteinGrams: 110,
    carbohydratesGrams: 245,
    fatGrams: 55,
  },
  journalStatus: undefined,
};

const emptyDay: DailyCoachingDay = {
  checkIn: undefined,
  activityDecision: undefined,
  checkOut: undefined,
};

const emptyPlanning: DailyActivityPlanningSnapshot = {
  strengthSessions: [],
  enduranceSessions: [],
  templates: [],
};

function strengthPlan(
  status: WorkoutSession['status'] = 'planned',
): WorkoutSessionSummary {
  return {
    session: createEntity<WorkoutSession>({
      date: '2026-07-29',
      plannedDate: '2026-07-29',
      plannedAt: '2026-07-28T18:00:00.000Z',
      status,
      sourceTemplateId: 'template-push',
      sourceTemplateNameSnapshot: 'Push',
      plannedDurationMinutes: 60,
      strengthSessionStyle: 'classic',
      ...(status === 'inProgress'
        ? { startedAt: '2026-07-29T08:00:00.000Z' }
        : {}),
    }, 'strength-push'),
    exerciseCount: 5,
  };
}

function endurancePlan(
  overrides: Partial<PlannedEnduranceSession> = {},
): PlannedEnduranceSession {
  return {
    id: 'endurance-run',
    title: 'Footing facile',
    activityType: 'running',
    date: '2026-07-29',
    intensity: 'low',
    targetDurationMinutes: 30,
    status: 'planned',
    createdAt: '2026-07-28T18:00:00.000Z',
    updatedAt: '2026-07-28T18:00:00.000Z',
    ...overrides,
  };
}

function pushTemplate(): WorkoutTemplateSummary {
  return {
    template: createEntity<WorkoutTemplate>({
      name: 'Push',
      isArchived: false,
    }, 'template-push'),
    exerciseCount: 5,
  };
}

function renderAssistant(
  dailyCoaching: DailyCoachingDay = emptyDay,
  overrides: Partial<{
    currentHour: number;
    snapshot: DailyTargetSnapshot;
    nutrition: DailyDashboardNutrition;
    activityPlanning: DailyActivityPlanningSnapshot;
  }> = {},
) {
  const onSaveCheckIn = vi.fn().mockResolvedValue(undefined);
  const onSaveActivityDecision = vi.fn().mockResolvedValue(undefined);
  const onSaveCheckOut = vi.fn().mockResolvedValue(undefined);
  const onPlanStrength = vi.fn().mockResolvedValue(undefined);
  const onUpdateStrength = vi.fn().mockResolvedValue(undefined);
  const onStartStrength = vi.fn().mockResolvedValue(undefined);
  const onSkipStrength = vi.fn().mockResolvedValue(undefined);
  const onSaveEndurance = vi.fn().mockResolvedValue(undefined);
  const onSkipEndurance = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardDailyAssistant
          date="2026-07-29"
          snapshot={overrides.snapshot ?? snapshot()}
          nutrition={overrides.nutrition ?? nutrition}
          dailyCoaching={dailyCoaching}
          activityPlanning={overrides.activityPlanning ?? emptyPlanning}
          currentHour={overrides.currentHour ?? 9}
          onSaveCheckIn={onSaveCheckIn}
          onSaveActivityDecision={onSaveActivityDecision}
          onSaveCheckOut={onSaveCheckOut}
          onPlanStrength={onPlanStrength}
          onUpdateStrength={onUpdateStrength}
          onStartStrength={onStartStrength}
          onSkipStrength={onSkipStrength}
          onSaveEndurance={onSaveEndurance}
          onSkipEndurance={onSkipEndurance}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
  return {
    onSaveCheckIn,
    onSaveActivityDecision,
    onSaveCheckOut,
    onPlanStrength,
    onUpdateStrength,
    onStartStrength,
    onSkipStrength,
    onSaveEndurance,
    onSkipEndurance,
  };
}

describe('DashboardDailyAssistant', () => {
  it('met le check-in en avant et permet de ne pas se peser', async () => {
    const user = userEvent.setup();
    const { onSaveCheckIn } = renderAssistant();

    expect(screen.getByText('Check-in rapide').closest('[data-stage-state]'))
      .toHaveAttribute('data-stage-state', 'current');

    await user.click(screen.getByRole('button', { name: 'Faire le check-in' }));
    const dialog = screen.getByRole('dialog', { name: 'Check-in du matin' });
    await user.click(within(dialog).getByRole('radio', { name: 'Pas aujourd’hui' }));
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer le check-in' }));

    expect(onSaveCheckIn).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-07-29',
      weightKg: null,
      sleepQuality: 'average',
      readiness: 'normal',
      contextFlags: [],
    }));
  });

  it('donne la priorité au check-out le soir sans masquer la nutrition', () => {
    const dailyCoaching: DailyCoachingDay = {
      checkIn: createEntity({
        date: '2026-07-29',
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-07-29T07:00:00.000Z',
      }),
      activityDecision: createEntity({
        date: '2026-07-29',
        decision: 'rest' as const,
        confirmedAt: '2026-07-29T07:02:00.000Z',
      }),
      checkOut: undefined,
    };

    renderAssistant(dailyCoaching, { currentHour: 20 });

    expect(screen.getByText('Check-out').closest('[data-stage-state]'))
      .toHaveAttribute('data-stage-state', 'current');
    expect(screen.getByRole('link', { name: /Ajouter un repas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prévoir malgré tout' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prévoir une autre activité' }))
      .not.toBeInTheDocument();
  });

  it('confirme une journée de repos depuis la section sport', async () => {
    const user = userEvent.setup();
    const { onSaveActivityDecision } = renderAssistant();

    await user.click(screen.getByRole('button', { name: 'Repos aujourd’hui' }));

    expect(onSaveActivityDecision).toHaveBeenCalledWith({
      date: '2026-07-29',
      decision: 'rest',
    });
  });

  it('reste actionnable sans plan précis, y compris pour une ancienne décision activities', () => {
    renderAssistant({
      ...emptyDay,
      activityDecision: createEntity({
        date: '2026-07-29',
        decision: 'activities' as const,
        confirmedAt: '2026-07-29T07:02:00.000Z',
      }),
    });

    expect(screen.getByText(/ancienne intention sportive/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prévoir une activité' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Musculation' })).not.toBeInTheDocument();
    expect(screen.getByText('Sport aujourd’hui').closest('[data-stage-state]'))
      .toHaveAttribute('data-stage-state', 'todo');
  });

  it('planifie un modèle de musculation sans démarrer la séance', async () => {
    const user = userEvent.setup();
    const { onPlanStrength, onStartStrength } = renderAssistant(emptyDay, {
      activityPlanning: {
        ...emptyPlanning,
        templates: [pushTemplate()],
      },
    });

    await user.click(screen.getByRole('button', { name: 'Prévoir une activité' }));
    const dialog = screen.getByRole('dialog', { name: 'Prévoir une activité' });
    await user.click(within(dialog).getByRole('radio', { name: 'Musculation' }));
    await user.click(within(dialog).getByRole('radio', { name: /Push/ }));
    await user.clear(within(dialog).getByLabelText('Durée prévue'));
    await user.type(within(dialog).getByLabelText('Durée prévue'), '75');
    await user.click(within(dialog).getByRole('button', { name: 'Continuer' }));
    await user.click(within(dialog).getByRole('button', { name: 'Planifier pour aujourd’hui' }));

    expect(onPlanStrength).toHaveBeenCalledWith({
      date: '2026-07-29',
      templateId: 'template-push',
      plannedDurationMinutes: 75,
      strengthSessionStyle: 'classic',
    });
    expect(onStartStrength).not.toHaveBeenCalled();
  });

  it('affiche plusieurs activités et pilote démarrage, modification et retrait', async () => {
    const user = userEvent.setup();
    const planning: DailyActivityPlanningSnapshot = {
      templates: [pushTemplate()],
      strengthSessions: [strengthPlan()],
      enduranceSessions: [{ session: endurancePlan() }],
    };
    const {
      onStartStrength,
      onUpdateStrength,
      onSkipEndurance,
    } = renderAssistant(emptyDay, { activityPlanning: planning });

    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('Footing facile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Prévoir une autre activité' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Démarrer' })).toHaveAttribute(
      'href',
      expect.stringContaining('plannedId=endurance-run'),
    );

    const startButtons = screen.getAllByRole('button', { name: 'Démarrer' });
    await user.click(startButtons[0]!);
    expect(onStartStrength).toHaveBeenCalledWith('strength-push');

    const modifyButtons = screen.getAllByRole('button', { name: 'Modifier' });
    await user.click(modifyButtons[0]!);
    const dialog = screen.getByRole('dialog', { name: 'Modifier l’activité prévue' });
    await user.clear(within(dialog).getByLabelText('Durée prévue'));
    await user.type(within(dialog).getByLabelText('Durée prévue'), '50');
    await user.click(within(dialog).getByRole('button', { name: 'Continuer' }));
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer les modifications' }));
    expect(onUpdateStrength).toHaveBeenCalledWith(expect.objectContaining({
      sessionId: 'strength-push',
      date: '2026-07-29',
      plannedDurationMinutes: 50,
    }));

    const removeButtons = screen.getAllByRole('button', { name: 'Retirer' });
    await user.click(removeButtons.at(-1)!);
    expect(onSkipEndurance).toHaveBeenCalledWith('endurance-run');
  });

  it('propose de reprendre une séance en cours et montre une activité réelle terminée', () => {
    const currentSnapshot = snapshot();
    currentSnapshot.activities = [
      createEntity<OtherActivity>({
        date: '2026-07-29',
        type: 'walking',
        durationMinutes: 42,
        intensity: 'moderate',
        met: 4,
        includedInDailySteps: true,
        calculation: {
          weightKg: 61.5,
          estimatedCaloriesKcal: 180,
          calculationVersion: 1,
        },
      }, 'activity-walk'),
    ];

    renderAssistant(emptyDay, {
      snapshot: currentSnapshot,
      activityPlanning: {
        ...emptyPlanning,
        strengthSessions: [strengthPlan('inProgress')],
      },
    });

    expect(screen.getByRole('link', { name: 'Reprendre la séance' }))
      .toHaveAttribute('href', expect.stringContaining('strength-push'));
    expect(screen.getByText('Marche')).toBeInTheDocument();
    expect(screen.getByText('42 min réalisés')).toBeInTheDocument();
    expect(screen.getByText('Terminée')).toBeInTheDocument();
  });

  it('clôt la journée sans fabriquer de pas lorsque ceux-ci sont ignorés', async () => {
    const user = userEvent.setup();
    const dailyCoaching: DailyCoachingDay = {
      checkIn: createEntity({
        date: '2026-07-29',
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-07-29T07:00:00.000Z',
      }),
      activityDecision: createEntity({
        date: '2026-07-29',
        decision: 'rest' as const,
        confirmedAt: '2026-07-29T07:02:00.000Z',
      }),
      checkOut: undefined,
    };
    const { onSaveCheckOut } = renderAssistant(dailyCoaching, { currentHour: 20 });

    await user.click(screen.getByRole('button', { name: 'Clôturer la journée' }));
    const dialog = screen.getByRole('dialog', { name: 'Check-out du soir' });
    await user.click(within(dialog).getByRole('radio', { name: 'Forte' }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Journal alimentaire complet/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Clôturer la journée' }));

    expect(onSaveCheckOut).toHaveBeenCalledWith(expect.objectContaining({
      date: '2026-07-29',
      actualSteps: null,
      hunger: 'high',
      energy: 'normal',
      foodJournalComplete: true,
      contextFlags: [],
    }));
  });

  it('compacte les étapes terminées et affiche les données du check-out', () => {
    const currentSnapshot = snapshot();
    currentSnapshot.stepsEntry = createEntity(
      { date: '2026-07-29', totalSteps: 8_750, source: 'manual' },
      'steps:2026-07-29',
    );
    const dailyCoaching: DailyCoachingDay = {
      checkIn: createEntity({
        date: '2026-07-29',
        sleepDurationMinutes: 440,
        readiness: 'high' as const,
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-07-29T07:00:00.000Z',
      }),
      activityDecision: createEntity({
        date: '2026-07-29',
        decision: 'rest' as const,
        confirmedAt: '2026-07-29T07:02:00.000Z',
      }),
      checkOut: createEntity({
        date: '2026-07-29',
        stepsEntryId: 'steps:2026-07-29',
        foodJournalComplete: true,
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-07-29T21:00:00.000Z',
      }),
    };

    renderAssistant(dailyCoaching, {
      currentHour: 21,
      snapshot: currentSnapshot,
      nutrition: {
        ...nutrition,
        journalStatus: createEntity({
          date: '2026-07-29',
          isComplete: true,
          completedAt: '2026-07-29T21:00:00.000Z',
        }),
      },
    });

    expect(screen.getByText('Journée complète')).toBeInTheDocument();
    expect(screen.getByText(/7 h 20 · en forme/)).toBeInTheDocument();
    expect(screen.getByText(/8 750 pas · journal complet/)).toBeInTheDocument();
  });
});
