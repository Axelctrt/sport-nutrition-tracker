import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import type { HistoryDaySummary } from '@/domain/models/analytics';
import { HistorySummary } from '@/features/history/components/HistorySummary';

const days: HistoryDaySummary[] = [
  {
    date: '2026-06-25',
    weightKg: 60,
    totalSteps: 8_000,
    activityCount: 1,
    sportMinutes: 45,
    estimatedActivityCaloriesKcal: 400,
    consumedCaloriesKcal: 2_000,
    targetCaloriesKcal: 2_100,
    journalComplete: true,
  },
  {
    date: '2026-06-24',
    totalSteps: 12_000,
    activityCount: 0,
    sportMinutes: 0,
    estimatedActivityCaloriesKcal: 0,
    journalComplete: false,
  },
];

afterEach(cleanup);

describe('HistorySummary', () => {
  it('regroupe les indicateurs de la période dans une seule carte', () => {
    render(<HistorySummary days={days} dailyStepGoal={10_000} />);

    expect(screen.getByText('Sport')).toBeInTheDocument();
    expect(screen.getByText('Pas moyens')).toBeInTheDocument();
    expect(screen.getByText(/10.?000/)).toBeInTheDocument();
    expect(screen.getByText('Pesées')).toBeInTheDocument();
    expect(screen.getByText('Journaux terminés')).toBeInTheDocument();
    expect(screen.getByText('1 objectif atteint')).toBeInTheDocument();
  });
});
