import { render, screen } from '@testing-library/react';
import { buildStrengthExerciseAnalytics } from '@/application/strength/strengthAnalyticsService';
import { StrengthHistorySummary } from '@/features/strength-history/components/StrengthHistorySummary';
import { createExerciseHistoryEntry } from '@/test/factories/strengthUxFactory';

describe('StrengthHistorySummary', () => {
  it('regroupe les métriques principales de progression', () => {
    const history = [createExerciseHistoryEntry()];
    render(<StrengthHistorySummary sessionCount={history.length} analytics={buildStrengthExerciseAnalytics(history)} />);

    expect(screen.getByLabelText('Séances : 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Séries travail : 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Répétitions : 8')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume : 640 kg')).toBeInTheDocument();
  });
});
