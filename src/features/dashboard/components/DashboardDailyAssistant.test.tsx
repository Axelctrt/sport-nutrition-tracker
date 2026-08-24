import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { DailyCoachingDay } from '@/application/daily/dailyCoachingService';
import type { DailyActivityPlanningSnapshot } from '@/application/planning/dailyActivityPlanningService';
import type { WorkoutSessionSummary } from '@/application/strength/workoutSessionService';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import { dashboardMealAddPath } from '@/app/routePaths';
import type { OtherActivity } from '@/domain/models/activity';
import type { WorkoutSession, WorkoutTemplate } from '@/domain/models/strength';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import { DashboardDailyAssistant } from '@/features/dashboard/components/DashboardDailyAssistant';
import type {
  ActiveWorkoutSummary,
  DailyDashboardNutrition,
} from '@/features/dashboard/hooks/useDailyDashboard';
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
  entryCounts: {
    breakfast: 0,
    lunch: 0,
    dinner: 0,
    snacks: 0,
  },
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

function completedActivity(
  id: string,
  durationMinutes: number,
  type: OtherActivity['type'] = 'walking',
): OtherActivity {
  return createEntity<OtherActivity>({
    date: '2026-07-29',
    type,
    durationMinutes,
    intensity: 'moderate',
    met: 4,
    includedInDailySteps: true,
    calculation: {
      weightKg: 61.5,
      estimatedCaloriesKcal: 180,
      calculationVersion: 1,
    },
  }, id);
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
    activeWorkout: ActiveWorkoutSummary;
    initialEntry: string;
  }> = {},
) {
  const onSaveCheckIn = vi.fn().mockResolvedValue(undefined);
  const onSaveActivityDecision = vi.fn().mockResolvedValue(undefined);
  const onSaveCheckOut = vi.fn().mockResolvedValue(undefined);
  const onPlanStrength = vi.fn().mockResolvedValue(undefined);
  const onUpdateStrength = vi.fn().mockResolvedValue(undefined);
  const onStartStrength = vi.fn().mockResolvedValue(undefined);
  const onSkipStrength = vi.fn().mockResolvedValue(undefined);
  const onRestoreStrength = vi.fn().mockResolvedValue(undefined);
  const onSaveEndurance = vi.fn().mockResolvedValue(undefined);
  const onSkipEndurance = vi.fn().mockResolvedValue(undefined);
  const onRestoreEndurance = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter initialEntries={[overrides.initialEntry ?? '/']}>
      <ToastProvider>
        <DashboardDailyAssistant
          date="2026-07-29"
          snapshot={overrides.snapshot ?? snapshot()}
          nutrition={overrides.nutrition ?? nutrition}
          dailyCoaching={dailyCoaching}
          activityPlanning={overrides.activityPlanning ?? emptyPlanning}
          {...(overrides.activeWorkout ? { activeWorkout: overrides.activeWorkout } : {})}
          currentHour={overrides.currentHour ?? 9}
          onSaveCheckIn={onSaveCheckIn}
          onSaveActivityDecision={onSaveActivityDecision}
          onSaveCheckOut={onSaveCheckOut}
          onPlanStrength={onPlanStrength}
          onUpdateStrength={onUpdateStrength}
          onStartStrength={onStartStrength}
          onSkipStrength={onSkipStrength}
          onRestoreStrength={onRestoreStrength}
          onSaveEndurance={onSaveEndurance}
          onSkipEndurance={onSkipEndurance}
          onRestoreEndurance={onRestoreEndurance}
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
    onRestoreStrength,
    onSaveEndurance,
    onSkipEndurance,
    onRestoreEndurance,
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

    const checkInPayload = onSaveCheckIn.mock.calls[0]?.[0];
    expect(checkInPayload).toEqual(expect.objectContaining({
      date: '2026-07-29',
      weightKg: null,
      contextFlags: [],
    }));
    expect(checkInPayload).not.toHaveProperty('sleepQuality');
    expect(checkInPayload).not.toHaveProperty('readiness');
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
    expect(screen.getByRole('button', { name: /Ajouter un repas/i })).toBeInTheDocument();
    expect(screen.getByRole('button', {
      name: 'Prévoir une activité malgré le repos',
    })).toBeInTheDocument();
    expect(screen.getByText('Repos prévu')).not.toHaveClass('whitespace-nowrap');
    expect(screen.getByRole('link', { name: 'Planification avancée' }))
      .not.toHaveClass('whitespace-nowrap');
    expect(screen.getByRole('link', { name: 'Planification avancée' }))
      .toHaveClass('text-brand-700');
    expect(screen.queryByRole('button', { name: 'Prévoir une autre activité' }))
      .not.toBeInTheDocument();
  });

  it('confirme une journée de repos depuis la section sport', async () => {
    const user = userEvent.setup();
    const { onSaveActivityDecision } = renderAssistant();

    await user.click(screen.getByRole('button', { name: 'Prévoir du repos aujourd’hui' }));

    expect(onSaveActivityDecision).toHaveBeenCalledWith({
      date: '2026-07-29',
      decision: 'rest',
    });
    expect(screen.getByRole('button', { name: /Prévoir du repos aujourd/ }))
      .toHaveClass('border-brand-300');
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

  it('ne preselectionne pas la seance libre et permet de la planifier', async () => {
    const user = userEvent.setup();
    const { onPlanStrength } = renderAssistant();

    await user.click(screen.getByRole('button', { name: /voir une activit/ }));
    const dialog = screen.getByRole('dialog', { name: /voir une activit/ });
    await user.click(within(dialog).getByRole('radio', { name: 'Musculation' }));

    const freeSession = within(dialog).getByRole('radio', { name: /ance libre/ });
    expect(freeSession).not.toBeChecked();
    await user.click(freeSession);
    await user.click(within(dialog).getByRole('button', { name: 'Continuer' }));
    await user.click(within(dialog).getByRole('button', { name: /Planifier pour aujourd/ }));

    expect(onPlanStrength).toHaveBeenCalledWith({
      date: '2026-07-29',
      plannedDurationMinutes: 60,
      strengthSessionStyle: 'classic',
    });
  });

  it('laisse une activite seulement prevue dans l etat a faire', () => {
    const dailyCoaching: DailyCoachingDay = {
      ...emptyDay,
      checkIn: createEntity({
        date: '2026-07-29',
        contextFlags: [],
        contextSyncPreference: 'localOnly' as const,
        completedAt: '2026-07-29T07:00:00.000Z',
      }),
    };

    renderAssistant(dailyCoaching, {
      activityPlanning: {
        ...emptyPlanning,
        strengthSessions: [strengthPlan()],
      },
    });

    expect(screen.getByText(/Sport pr/).closest('[data-stage-state]'))
      .toHaveAttribute('data-stage-state', 'current');
    expect(screen.getByText(/1 .*tape sur 4/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Repos aujourd/ })).not.toBeInTheDocument();
  });

  it('restaure les methodes d ajout depuis l URL de l accueil', () => {
    renderAssistant(emptyDay, {
      initialEntry: dashboardMealAddPath('dinner', 'method'),
    });

    const dialog = screen.getByRole('dialog', { name: 'Ajouter un repas' });
    expect(within(dialog).getByRole('link', { name: /Scanner un produit/ })).toHaveAttribute(
      'href',
      '/food/barcode-scanner?date=2026-07-29&slot=dinner',
    );
    expect(within(dialog).queryByRole('radio')).not.toBeInTheDocument();
  });

  it('ouvre un seul parcours nutrition et présélectionne le repas pertinent', async () => {
    const user = userEvent.setup();
    renderAssistant(emptyDay, {
      currentHour: 20,
      nutrition: {
        ...nutrition,
        entryCounts: {
          breakfast: 0,
          lunch: 2,
          dinner: 0,
          snacks: 0,
        },
      },
    });

    expect(screen.queryByRole('link', { name: 'Scanner' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Journal' })).not.toBeInTheDocument();
    const addMealButton = screen.getByRole('button', { name: 'Ajouter un repas' });
    expect(addMealButton).not.toHaveClass('whitespace-nowrap');
    expect(addMealButton).toHaveClass('min-h-11');
    await user.click(addMealButton);

    const dialog = screen.getByRole('dialog', { name: 'Ajouter un repas' });
    const dinner = within(dialog).getByRole('radio', { name: /Dîner/ });
    expect(dinner).toBeChecked();
    await user.click(dinner);
    expect(within(dialog).getByRole('button', { name: 'Terminer le repas' })).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ajouter un élément' }));
    expect(within(dialog).getByRole('link', { name: /Scanner un produit/ })).toHaveAttribute(
      'href',
      '/food/barcode-scanner?date=2026-07-29&slot=dinner',
    );
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

    await user.click(screen.getByRole('button', { name: 'Actions pour Push' }));
    const strengthActions = screen.getByRole('menu', { name: 'Actions pour Push' });
    expect(within(strengthActions).getAllByRole('menuitem').map((item) => item.textContent))
      .toEqual(['Modifier', 'Retirer']);
    expect(within(strengthActions).getByRole('separator')).toBeInTheDocument();
    await user.click(within(strengthActions).getByRole('menuitem', { name: 'Modifier' }));
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

    await user.click(screen.getByRole('button', { name: 'Actions pour Footing facile' }));
    const enduranceActions = screen.getByRole('menu', { name: 'Actions pour Footing facile' });
    expect(within(enduranceActions).getAllByRole('menuitem').map((item) => item.textContent))
      .toEqual(['Modifier', 'Retirer']);
    expect(within(enduranceActions).getByRole('separator')).toBeInTheDocument();
    await user.click(within(enduranceActions).getByRole('menuitem', { name: 'Retirer' }));
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

    expect(screen.getByRole('link', { name: 'Reprendre' }))
      .toHaveAttribute('href', expect.stringContaining('strength-push'));
    expect(screen.getByText('Marche')).toBeInTheDocument();
    expect(screen.getByText(/Sport r/).closest('[data-stage-state]'))
      .toHaveAttribute('data-stage-state', 'complete');
    expect(screen.getByText('42 min réalisés')).toBeInTheDocument();
    expect(screen.getByText('Terminée')).toBeInTheDocument();
  });

  it('ne résume aucun surplus lorsque la journée ne contient aucune activité réalisée', () => {
    renderAssistant();

    expect(screen.queryByText(/autre activité.*aujourd’hui/u)).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Voir les activités du jour' })).not.toBeInTheDocument();
  });

  it('affiche le détail de deux activités réalisées sans résumé supplémentaire', () => {
    const currentSnapshot = snapshot();
    currentSnapshot.activities = [
      completedActivity('activity-one', 21),
      completedActivity('activity-two', 34, 'otherCardio'),
    ];

    renderAssistant(emptyDay, { snapshot: currentSnapshot });

    expect(screen.getByText('21 min réalisés')).toBeInTheDocument();
    expect(screen.getByText('34 min réalisés')).toBeInTheDocument();
    expect(screen.queryByText(/autre activité.*aujourd’hui/u)).not.toBeInTheDocument();
  });

  it('limite les détails à deux activités et résume le surplus', () => {
    const currentSnapshot = snapshot();
    currentSnapshot.activities = [
      completedActivity('activity-one', 10),
      completedActivity('activity-two', 20, 'otherCardio'),
      completedActivity('activity-three', 30),
      completedActivity('activity-four', 40, 'otherCardio'),
    ];

    renderAssistant(emptyDay, { snapshot: currentSnapshot });

    expect(screen.getByText('10 min réalisés')).toBeInTheDocument();
    expect(screen.getByText('20 min réalisés')).toBeInTheDocument();
    expect(screen.queryByText('30 min réalisés')).not.toBeInTheDocument();
    expect(screen.queryByText('40 min réalisés')).not.toBeInTheDocument();
    expect(screen.getByText('+ 2 autres activités aujourd’hui')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir les activités du jour' })).toHaveAttribute(
      'href',
      '/activities?date=2026-07-29',
    );
  });

  it('affiche les calories et les trois macronutriments avec un libellé explicite', () => {
    renderAssistant(emptyDay, {
      nutrition: {
        ...nutrition,
        consumed: {
          caloriesKcal: 439.6,
          carbohydratesGrams: 49.7,
          proteinGrams: 40.2,
          fatGrams: 19.8,
          entryCount: 1,
        },
      },
    });

    const summary = screen.getByLabelText(
      '440 kilocalories, 50 grammes de glucides, 40 grammes de protéines, 20 grammes de lipides',
    );
    expect(summary).toHaveTextContent('440 kcal · 50 g G · 40 g P · 20 g L');
    expect(summary).toHaveClass('whitespace-normal', 'break-words');
  });

  it('affiche des valeurs nulles cohérentes lorsque le journal contient une entrée vide', () => {
    renderAssistant(emptyDay, {
      nutrition: {
        ...nutrition,
        consumed: {
          ...nutrition.consumed,
          entryCount: 1,
        },
      },
    });

    expect(screen.getByText('0 kcal · 0 g G · 0 g P · 0 g L')).toBeInTheDocument();
  });

  it('signale une séance ancienne interrompue sans en créer une nouvelle', () => {
    const startedAt = new Date(Date.now() - 3 * 60 * 60 * 1_000).toISOString();
    const activeWorkout: ActiveWorkoutSummary = {
      session: createEntity<WorkoutSession>({
        date: '2026-07-28',
        status: 'inProgress',
        startedAt,
        sourceTemplateNameSnapshot: 'Full body',
      }, 'interrupted-session', startedAt),
      exerciseCount: 6,
    };

    renderAssistant(emptyDay, { activeWorkout });

    expect(screen.getByText('Séance interrompue')).toBeInTheDocument();
    expect(screen.getByText(/Dernière activité il y a 3 h/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Reprendre' })).toHaveAttribute(
      'href',
      '/strength/sessions/interrupted-session',
    );
    expect(screen.getByRole('link', { name: 'Terminer' })).toHaveAttribute(
      'href',
      '/strength/sessions/interrupted-session?finish=true',
    );
  });

  it('permet d’annuler le retrait d’une activité planifiée', async () => {
    const user = userEvent.setup();
    const { onSkipEndurance, onRestoreEndurance } = renderAssistant(emptyDay, {
      activityPlanning: {
        ...emptyPlanning,
        enduranceSessions: [{ session: endurancePlan() }],
      },
    });

    await user.click(screen.getByRole('button', { name: 'Actions pour Footing facile' }));
    const enduranceActions = screen.getByRole('menu', { name: 'Actions pour Footing facile' });
    expect(within(enduranceActions).getAllByRole('menuitem').map((item) => item.textContent))
      .toEqual(['Modifier', 'Retirer']);
    expect(within(enduranceActions).getByRole('separator')).toBeInTheDocument();
    await user.click(within(enduranceActions).getByRole('menuitem', { name: 'Retirer' }));
    expect(onSkipEndurance).toHaveBeenCalledWith('endurance-run');

    await user.click(await screen.findByRole('button', { name: 'Annuler le retrait de l’activité' }));
    expect(onRestoreEndurance).toHaveBeenCalledWith('endurance-run');
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

    const checkOutPayload = onSaveCheckOut.mock.calls[0]?.[0];
    expect(checkOutPayload).toEqual(expect.objectContaining({
      date: '2026-07-29',
      actualSteps: null,
      hunger: 'high',
      foodJournalComplete: true,
      contextFlags: [],
    }));
    expect(checkOutPayload).not.toHaveProperty('energy');
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
