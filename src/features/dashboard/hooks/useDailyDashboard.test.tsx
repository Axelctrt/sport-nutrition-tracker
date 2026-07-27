import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileContext } from '@/app/providers/profile/ProfileContext';
import {
  useDailyDashboard,
  type DailyDashboardDependencies,
} from '@/features/dashboard/hooks/useDailyDashboard';

const mocks = vi.hoisted(() => ({
  calculateTarget: vi.fn(),
  recalculateTargets: vi.fn(),
  upsertWeight: vi.fn(),
  upsertSteps: vi.fn(),
  listFoodEntries: vi.fn(),
  getJournalStatus: vi.fn(),
  getInProgress: vi.fn(),
  listExercises: vi.fn(),
  readDailyCoaching: vi.fn(),
  completeCheckIn: vi.fn(),
  setActivityDecision: vi.fn(),
  completeCheckOut: vi.fn(),
}));

const profile = {
  id: 'profile-1',
  createdAt: '2026-07-01T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
  sexForEnergyEquation: 'male' as const,
  ageInformation: {
    mode: 'birthDate' as const,
    birthDate: '2004-01-01',
  },
  heightCm: 177,
  initialWeightKg: 60,
  goal: 'maintenance' as const,
  targetWeeklyWeightChangePercent: 0,
  occupationalActivity: 'sedentary' as const,
  dailyStepGoal: 10_000,
  proteinGramsPerKg: 1.8,
  fatGramsPerKg: 0.9,
};

function ProfileWrapper({ children }: PropsWithChildren) {
  return (
    <ProfileContext.Provider
      value={{
        status: 'ready',
        profile,
        errorMessage: undefined,
        saveProfile: vi.fn(),
        clearProfile: vi.fn(),
        refreshProfile: vi.fn(),
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

const dependencies: DailyDashboardDependencies = {
  calculateTarget: mocks.calculateTarget,
  recalculateTargetsAfterWeightChange: mocks.recalculateTargets,
  dailyCoaching: {
    read: mocks.readDailyCoaching,
    completeCheckIn: mocks.completeCheckIn,
    setActivityDecision: mocks.setActivityDecision,
    completeCheckOut: mocks.completeCheckOut,
  },
  repositories: {
    weight: { upsert: mocks.upsertWeight },
    food: {
      listEntriesByDate: mocks.listFoodEntries,
      getJournalStatus: mocks.getJournalStatus,
    },
    workoutSessions: {
      getInProgress: mocks.getInProgress,
      listExercises: mocks.listExercises,
    },
    steps: { upsert: mocks.upsertSteps },
  },
};

function snapshot() {
  return {
    date: '2026-07-09',
    target: {
      targetCaloriesKcal: 2_000,
      macros: { proteinGrams: 110, carbohydratesGrams: 245, fatGrams: 55 },
    },
    calculation: { steps: { totalSteps: 0 } },
  };
}

describe('useDailyDashboard', () => {
  beforeEach(() => {
    mocks.calculateTarget.mockResolvedValue(snapshot());
    mocks.recalculateTargets.mockResolvedValue([]);
    mocks.upsertWeight.mockResolvedValue(undefined);
    mocks.upsertSteps.mockResolvedValue(undefined);
    mocks.listFoodEntries.mockResolvedValue([]);
    mocks.getJournalStatus.mockResolvedValue(undefined);
    mocks.getInProgress.mockResolvedValue(undefined);
    mocks.listExercises.mockResolvedValue([]);
    mocks.readDailyCoaching.mockResolvedValue({
      checkIn: undefined,
      activityDecision: undefined,
      checkOut: undefined,
    });
    mocks.completeCheckIn.mockResolvedValue(undefined);
    mocks.setActivityDecision.mockResolvedValue(undefined);
    mocks.completeCheckOut.mockResolvedValue(undefined);
  });

  it('recalcule les cibles affectées après une pesée enregistrée depuis l’accueil', async () => {
    const { result } = renderHook(
      () => useDailyDashboard({ profileOverride: profile, dependencies }),
      { wrapper: ProfileWrapper },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => {
      await result.current.saveWeight({ date: '2026-07-09', weightKg: 60.2 });
    });

    expect(mocks.upsertWeight).toHaveBeenCalledWith({
      date: '2026-07-09',
      weightKg: 60.2,
    });
    expect(mocks.recalculateTargets).toHaveBeenCalledWith(
      '2026-07-09',
      profile,
    );
  });

  it('enregistre le check-in puis recharge le cycle quotidien', async () => {
    const { result } = renderHook(
      () => useDailyDashboard({ profileOverride: profile, dependencies }),
      { wrapper: ProfileWrapper },
    );

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.nutrition?.entryCounts).toEqual({
      breakfast: 0,
      lunch: 0,
      dinner: 0,
      snacks: 0,
    });

    await act(async () => {
      await result.current.saveCheckIn({
        date: '2026-07-09',
        weightKg: null,
        readiness: 'normal',
      });
    });

    expect(mocks.completeCheckIn).toHaveBeenCalledWith({
      date: '2026-07-09',
      weightKg: null,
      readiness: 'normal',
    });
    expect(mocks.calculateTarget).toHaveBeenCalledTimes(2);
  });
});
