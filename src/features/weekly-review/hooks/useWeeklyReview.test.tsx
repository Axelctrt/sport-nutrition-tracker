import { act, renderHook, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import type { WeeklyReviewSnapshot } from '@/application/weekly-review/weeklyReviewService';
import { useWeeklyReview } from '@/features/weekly-review/hooks/useWeeklyReview';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createAcceptedAdjustment, createWeeklyReview } from '@/test/factories/weeklyReviewFactory';
import {
  createEnergyArchitectureRetrospectiveReport,
} from '@/test/factories/energyArchitectureRetrospectiveFactory';

const loadWeeklyReview = vi.fn();
const acceptCoachWeeklyReview = vi.fn();
const rejectWeeklyReview = vi.fn();

vi.mock('@/application/weekly-review/weeklyReviewService', () => ({
  loadWeeklyReview: (...args: unknown[]) => loadWeeklyReview(...args),
  acceptCoachWeeklyReview: (...args: unknown[]) => acceptCoachWeeklyReview(...args),
  rejectWeeklyReview: (...args: unknown[]) => rejectWeeklyReview(...args),
}));

function snapshot(status: 'pending' | 'accepted' = 'pending'): WeeklyReviewSnapshot {
  const review = createWeeklyReview({ decisionStatus: status });
  return {
    review,
    reviews: [review],
    adjustments: status === 'accepted' ? [createAcceptedAdjustment()] : [],
    energyRetrospective: createEnergyArchitectureRetrospectiveReport(),
  };
}

describe('useWeeklyReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadWeeklyReview.mockResolvedValue(snapshot());
    acceptCoachWeeklyReview.mockResolvedValue(createWeeklyReview({ decisionStatus: 'accepted' }));
    rejectWeeklyReview.mockResolvedValue(createWeeklyReview({ decisionStatus: 'rejected' }));
  });

  it('conserve les données affichées pendant l’acceptation puis recharge silencieusement', async () => {
    const profile = createEntity(createProfileInput(), 'profile');
    const { result } = renderHook(() => useWeeklyReview('2026-06-10', profile));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    loadWeeklyReview.mockResolvedValueOnce(snapshot('accepted'));

    await act(async () => {
      await result.current.accept();
    });

    expect(acceptCoachWeeklyReview).toHaveBeenCalledWith('2026-06-08', profile);
    expect(result.current.status).toBe('ready');
    expect(result.current.data?.review.decisionStatus).toBe('accepted');
  });
});
