import { cleanup, render, screen } from '@testing-library/react';
import { afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { HistoryDaySummary } from '@/domain/models/analytics';
import { HistoryDayCard } from '@/features/history/components/HistoryDayCard';

const day: HistoryDaySummary = {
  date: '2026-06-25',
  weightKg: 60.2,
  totalSteps: 10_500,
  activityCount: 2,
  sportMinutes: 75,
  estimatedActivityCaloriesKcal: 650,
  consumedCaloriesKcal: 2_100,
  targetCaloriesKcal: 2_200,
  consumedProteinGrams: 130,
  targetProteinGrams: 120,
  journalComplete: true,
};

afterEach(cleanup);

describe('HistoryDayCard', () => {
  it('présente la journée de façon compacte et conserve les bons liens', () => {
    render(<HistoryDayCard day={day} />, { wrapper: MemoryRouter });

    expect(screen.getByText(/jeudi 25 juin 2026/i)).toBeInTheDocument();
    expect(screen.getByText('60,2 kg')).toBeInTheDocument();
    expect(screen.getByText(/10.?500/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Journal' })).toHaveAttribute('href', '/food?date=2026-06-25');
    expect(screen.getByRole('link', { name: 'Activités' })).toHaveAttribute('href', '/activities?date=2026-06-25');
    expect(screen.getByRole('link', { name: 'Pesée' })).toHaveAttribute('href', '/weight?date=2026-06-25');
  });
});
