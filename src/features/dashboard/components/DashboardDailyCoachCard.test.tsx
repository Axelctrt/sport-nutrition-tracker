import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardDailyCoachCard } from '@/features/dashboard/components/DashboardDailyCoachCard';
import type { DailyCoachResult } from '@/domain/coach/dailyCoach';

function result(
  verdict: DailyCoachResult['verdict'],
  title: string,
): DailyCoachResult {
  return {
    verdict,
    title,
    message: 'Message utilisateur déterministe.',
    priority: verdict === 'attentionRequired' ? 'high' : 'low',
    coachState: verdict === 'attentionRequired' ? 'excessiveLoss' : 'onTrack',
    confidence: {
      weight: 80,
      food: 80,
      activity: 80,
      recovery: 80,
      overall: 80,
      level: 'reliable',
    },
  };
}

describe('DashboardDailyCoachCard', () => {
  it.each([
    ['insufficientData', 'Données encore insuffisantes'],
    ['planMaintained', 'Plan maintenu'],
    ['recoveryToWatch', 'Récupération à surveiller'],
    ['temporaryVariation', 'Variation temporaire probable'],
    ['attentionRequired', 'Rythme à réévaluer'],
  ] satisfies Array<[DailyCoachResult['verdict'], string]>) (
    'rend le verdict utilisateur %s sous forme de carte',
    (verdict, title) => {
      render(<MemoryRouter><DashboardDailyCoachCard result={result(verdict, title)} /></MemoryRouter>);
      expect(screen.getByText('Coach du jour')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
      expect(screen.getByText('Message utilisateur déterministe.')).toBeInTheDocument();
    },
  );

  it('n’affiche ni codes techniques, scores bruts, action métier ni modal', () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardDailyCoachCard
          result={result('attentionRequired', 'Récupération à prioriser')}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText('attentionRequired')).not.toBeInTheDocument();
    expect(screen.queryByText('80')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voir le Coach' })).toHaveAttribute('href', '/coach');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(container.querySelector('article')).toBeInTheDocument();
  });

  it('rend un fallback local accessible en cas d’indisponibilité', () => {
    render(<MemoryRouter><DashboardDailyCoachCard unavailable /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Coach du jour indisponible' })).toBeInTheDocument();
    expect(screen.getByText(/reste de tes données reste accessible/i)).toBeInTheDocument();
  });
});
