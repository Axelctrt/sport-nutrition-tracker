import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import type { WeeklyReviewInsights } from '@/domain/reviews/weeklyReviewInsights';
import { WeeklyReviewGuidance } from '@/features/weekly-review/components/WeeklyReviewGuidance';

const insights: WeeklyReviewInsights = {
  training: {
    hasPlanning: true,
    plannedSessions: 4,
    completedPlannedSessions: 3,
    skippedPlannedSessions: 1,
    abandonedPlannedSessions: 0,
    pendingPlannedSessions: 0,
    adherencePercent: 75,
    actualSessions: 3,
    activityMinutes: 180,
    strengthSessions: 2,
    enduranceSessions: 1,
    runningDistanceKm: 8,
    cyclingDistanceKm: 0,
    swimmingDistanceMeters: 0,
  },
  successes: ['3 séances réalisées sur 4 prévues.'],
  attentionPoints: ['3 séances réalisées sur 4 prévues.'],
  recommendations: [
    {
      id: 'planning',
      title: 'Ajuster le prochain planning',
      detail: 'Conserve un volume réaliste.',
      action: 'planning',
      actionLabel: 'Voir le planning',
    },
  ],
};

describe('WeeklyReviewGuidance', () => {
  it('distingue les constats des actions proposées', () => {
    render(
      <MemoryRouter>
        <WeeklyReviewGuidance insights={insights} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Réussites' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Points d’attention' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Voir le planning/i })).toHaveAttribute(
      'href',
      '/strength/planning',
    );
  });
});
