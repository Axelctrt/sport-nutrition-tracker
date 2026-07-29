import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AdaptiveAssessmentCard } from '@/features/weekly-review/components/AdaptiveAssessmentCard';
import { createCalorieAdaptationAssessment } from '@/test/factories/weeklyReviewFactory';

describe('AdaptiveAssessmentCard', () => {
  it('résume une tendance exploitable sans afficher le score interne', () => {
    render(
      <AdaptiveAssessmentCard assessment={createCalorieAdaptationAssessment()} />,
    );

    expect(screen.getByRole('heading', { name: 'Plateau probable' })).toBeInTheDocument();
    expect(screen.getAllByText('Analyse fiable')).not.toHaveLength(0);
    expect(screen.getByText('Fenêtre de 21 jours')).toBeInTheDocument();
    expect(screen.getByText('18 j')).toBeInTheDocument();
    expect(screen.queryByText('100/100')).not.toBeInTheDocument();
  });

  it('explique pourquoi une cible reste inchangée', () => {
    render(
      <AdaptiveAssessmentCard
        assessment={createCalorieAdaptationAssessment({
          trackingSpanDays: 8,
          detectedState: 'insufficientData',
          confidence: {
            weight: 30,
            food: 40,
            activity: 20,
            recovery: 10,
            overall: 30,
            level: 'insufficient',
          },
          blockingFactors: ['Au moins 14 jours de suivi sont nécessaires.'],
        })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Données insuffisantes' })).toBeInTheDocument();
    expect(screen.getByText('Pourquoi la cible reste inchangée')).toBeInTheDocument();
    expect(screen.getByText(/Au moins 14 jours/)).toBeInTheDocument();
  });
});
