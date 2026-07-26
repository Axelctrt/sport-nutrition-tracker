import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyReviewSnapshot } from '@/application/weekly-review/weeklyReviewService';
import type { UserProfile } from '@/domain/models/profile';
import { WeeklyReviewPage } from '@/features/weekly-review/pages/WeeklyReviewPage';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';
import {
  createCalorieAdaptationAssessment,
  createWeeklyReview,
} from '@/test/factories/weeklyReviewFactory';

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  reject: vi.fn(),
  refresh: vi.fn(),
  snapshot: undefined as WeeklyReviewSnapshot | undefined,
  profile: undefined as UserProfile | undefined,
}));

vi.mock('@/app/providers/profile/useProfile', () => ({
  useProfile: () => ({
    profile: mocks.profile,
  }),
}));

vi.mock('@/features/weekly-review/hooks/useWeeklyReview', () => ({
  useWeeklyReview: () => ({
    data: mocks.snapshot,
    status: 'ready',
    actionStatus: 'idle',
    errorMessage: undefined,
    refresh: mocks.refresh,
    accept: mocks.accept,
    reject: mocks.reject,
  }),
}));

function renderPage() {
  render(
    <MemoryRouter>
      <WeeklyReviewPage />
    </MemoryRouter>,
  );
}

describe('WeeklyReviewPage adaptative', () => {
  beforeEach(() => {
    mocks.accept.mockReset();
    mocks.reject.mockReset();
    mocks.profile = createEntity(createProfileInput(), 'profile');
  });

  it('présente la conclusion avant une correction soumise à validation', () => {
    const review = createWeeklyReview({
      proposedDecision: 'decrease',
      proposedAdjustmentKcal: -100,
      resultingCumulativeAdjustmentKcal: -100,
      adaptation: createCalorieAdaptationAssessment(),
    });
    mocks.snapshot = {
      review,
      reviews: [review],
      adjustments: [],
    };

    renderPage();

    expect(screen.getByRole('heading', { name: 'Plateau probable' })).toBeInTheDocument();
    expect(screen.getAllByText('-100 kcal/j')).not.toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Accepter la proposition' })).toBeInTheDocument();
  });

  it('demande une confirmation explicite même lorsque la cible est maintenue', () => {
    const review = createWeeklyReview({
      proposedDecision: 'keep',
      proposedAdjustmentKcal: 0,
      resultingCumulativeAdjustmentKcal: 0,
      adaptation: createCalorieAdaptationAssessment({
        detectedState: 'onTrack',
        reasons: ['La tendance reste cohérente avec l’objectif.'],
        rawWeightBasedAdjustmentKcal: 0,
        proposedAdjustmentKcal: 0,
      }),
    });
    mocks.snapshot = {
      review,
      reviews: [review],
      adjustments: [],
    };

    renderPage();

    expect(screen.getByRole('heading', { name: 'Progression conforme' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirmer le maintien' })).toBeInTheDocument();
  });
});
