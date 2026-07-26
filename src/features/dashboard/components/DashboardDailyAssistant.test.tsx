import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type { DailyCoachingDay } from '@/application/daily/dailyCoachingService';
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

function renderAssistant(
  dailyCoaching: DailyCoachingDay = emptyDay,
  overrides: Partial<{
    currentHour: number;
    snapshot: DailyTargetSnapshot;
    nutrition: DailyDashboardNutrition;
  }> = {},
) {
  const onSaveCheckIn = vi.fn().mockResolvedValue(undefined);
  const onSaveActivityDecision = vi.fn().mockResolvedValue(undefined);
  const onSaveCheckOut = vi.fn().mockResolvedValue(undefined);
  render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardDailyAssistant
          date="2026-07-29"
          snapshot={overrides.snapshot ?? snapshot()}
          nutrition={overrides.nutrition ?? nutrition}
          dailyCoaching={dailyCoaching}
          currentHour={overrides.currentHour ?? 9}
          onSaveCheckIn={onSaveCheckIn}
          onSaveActivityDecision={onSaveActivityDecision}
          onSaveCheckOut={onSaveCheckOut}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
  return { onSaveCheckIn, onSaveActivityDecision, onSaveCheckOut };
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
  });

  it('confirme une journée de repos depuis la section sport', async () => {
    const user = userEvent.setup();
    const { onSaveActivityDecision } = renderAssistant();

    await user.click(screen.getByRole('button', { name: 'Choisir' }));
    const dialog = screen.getByRole('dialog', { name: 'Sport aujourd’hui' });
    await user.click(within(dialog).getByRole('radio', { name: /Repos/ }));
    await user.click(within(dialog).getByRole('button', { name: 'Confirmer' }));

    expect(onSaveActivityDecision).toHaveBeenCalledWith({
      date: '2026-07-29',
      decision: 'rest',
    });
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
