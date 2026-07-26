import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EnergyArchitectureDiagnostic } from '@/features/weekly-review/components/EnergyArchitectureDiagnostic';
import {
  createEnergyArchitectureRetrospectiveReport,
} from '@/test/factories/energyArchitectureRetrospectiveFactory';

describe('EnergyArchitectureDiagnostic', () => {
  it('explique pourquoi les données sont encore insuffisantes', () => {
    render(
      <EnergyArchitectureDiagnostic
        report={createEnergyArchitectureRetrospectiveReport()}
      />,
    );

    expect(screen.getByText('Diagnostic du moteur énergétique')).toBeInTheDocument();
    expect(screen.getByText('Comparaison expérimentale, sans effet sur ta cible'))
      .toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Couverture des données' }))
      .toHaveAttribute('aria-valuenow', '8');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('présente les erreurs sans transformer le signal en action', () => {
    render(
      <EnergyArchitectureDiagnostic
        report={createEnergyArchitectureRetrospectiveReport({
          eligibleDayCount: 28,
          excludedDayCount: 0,
          weighInCount: 28,
          validWindowCount: 15,
          exclusionCounts: {
            missingCheckOut: 0,
            incompleteFoodJournal: 0,
            missingFoodData: 0,
            missingLinkedSteps: 0,
            missingDailyTarget: 0,
          },
          status: 'candidateSupported',
          blockingFactors: [],
          summary: {
            medianCurrentAbsoluteErrorKcal: 200,
            medianCandidateAbsoluteErrorKcal: 20,
            p90CurrentAbsoluteErrorKcal: 210,
            p90CandidateAbsoluteErrorKcal: 30,
            candidateMedianImprovementPercent: 90,
            maximumDailyDifferenceKcal: 180,
            candidateMeetsAccuracyThresholds: true,
          },
        })}
      />,
    );

    expect(screen.getByText('Signal favorable au candidat')).toBeInTheDocument();
    expect(screen.getByText('200 kcal/j')).toBeInTheDocument();
    expect(screen.getByText('20 kcal/j')).toBeInTheDocument();
    expect(screen.getByText(/ne déclenche jamais une correction/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('ouvre automatiquement le détail lorsqu’une revue est nécessaire', () => {
    const { container } = render(
      <EnergyArchitectureDiagnostic
        report={createEnergyArchitectureRetrospectiveReport({
          status: 'reviewRequired',
          eligibleDayCount: 28,
          excludedDayCount: 0,
          validWindowCount: 15,
          summary: {
            medianCurrentAbsoluteErrorKcal: 200,
            medianCandidateAbsoluteErrorKcal: 100,
            p90CurrentAbsoluteErrorKcal: 220,
            p90CandidateAbsoluteErrorKcal: 120,
            candidateMedianImprovementPercent: 50,
            maximumDailyDifferenceKcal: 300,
            candidateMeetsAccuracyThresholds: false,
          },
        })}
      />,
    );

    expect(container.querySelector('details')).toHaveAttribute('open');
    expect(screen.getByText('Un écart important doit être examiné'))
      .toBeInTheDocument();
  });
});
