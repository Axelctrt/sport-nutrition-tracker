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

  it('n’affiche pas de volume nul pour un exercice au poids du corps', () => {
    const base = createExerciseHistoryEntry();
    const workingSet = {
      ...base.workingSets[0]!,
      weightKg: 0,
      repetitions: 12,
    };
    const history = [{
      ...base,
      sessionExercise: {
        ...base.sessionExercise,
        loadUnitSnapshot: 'bodyweight' as const,
        trackingModeSnapshot: 'bodyweightRepetitions' as const,
      },
      sets: [workingSet],
      workingSets: [workingSet],
      bodyWeightKg: 70,
      totalVolumeKg: 840,
      totalAdditionalVolumeKg: 0,
    }];

    render(
      <StrengthHistorySummary
        sessionCount={history.length}
        analytics={buildStrengthExerciseAnalytics(history)}
      />,
    );

    expect(screen.getByLabelText('Répétitions : 12')).toBeInTheDocument();
    expect(screen.getByLabelText('Meilleure série : 12 rép.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Volume :/)).not.toBeInTheDocument();
  });

});
