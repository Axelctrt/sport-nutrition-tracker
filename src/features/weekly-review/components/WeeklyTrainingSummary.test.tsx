import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { WeeklyReviewInsights } from '@/domain/reviews/weeklyReviewInsights';
import { WeeklyTrainingSummary } from '@/features/weekly-review/components/WeeklyTrainingSummary';

const insights: WeeklyReviewInsights = {
  training: {
    hasPlanning: true,
    plannedSessions: 4,
    completedPlannedSessions: 3,
    skippedPlannedSessions: 1,
    abandonedPlannedSessions: 0,
    pendingPlannedSessions: 0,
    adherencePercent: 75,
    actualSessions: 4,
    activityMinutes: 210,
    strengthSessions: 2,
    enduranceSessions: 2,
    runningDistanceKm: 12.5,
    cyclingDistanceKm: 0,
    swimmingDistanceMeters: 1500,
  },
  successes: [],
  attentionPoints: [],
  recommendations: [],
};

describe('WeeklyTrainingSummary', () => {
  it('affiche les indicateurs sportifs essentiels sans tableau horizontal', () => {
    render(<WeeklyTrainingSummary insights={insights} />);

    expect(screen.getByRole('heading', { name: 'Activité de la semaine' })).toBeInTheDocument();
    expect(screen.getByText('75 %')).toBeInTheDocument();
    expect(screen.getByText('3 h 30')).toBeInTheDocument();
    expect(screen.getByText('12,5 km')).toBeInTheDocument();
    expect(screen.getByText('1 500 m')).toBeInTheDocument();
  });
});
