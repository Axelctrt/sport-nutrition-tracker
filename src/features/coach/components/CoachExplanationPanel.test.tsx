import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CoachExplanation } from '@/domain/coach/coachExplanation';
import { CoachExplanationPanel } from '@/features/coach/components/CoachExplanationPanel';

function explanation(overrides: Partial<CoachExplanation> = {}): CoachExplanation {
  return {
    availability: 'available',
    title: 'Maintenir le plan',
    summary: 'Maintenir le plan · Progression conforme',
    reasons: ['La progression reste cohérente avec le plan.'],
    blockingFactors: [],
    watchPoints: ['La récupération reste stable.'],
    comparison: {
      status: 'firstDecision',
      summary: 'C’est la première décision enregistrée : aucune comparaison historique n’est disponible.',
      changes: [],
    },
    nextReview: { type: 'date', date: '2026-09-06' },
    ...overrides,
  };
}

describe('CoachExplanationPanel', () => {
  it('ouvre une explication structurée depuis une action explicite', async () => {
    const user = userEvent.setup();
    render(<CoachExplanationPanel explanation={explanation()} />);

    const trigger = screen.getByRole('button', { name: 'Comprendre cette décision' });
    await user.click(trigger);

    const dialog = screen.getByRole('dialog', { name: 'Comprendre la décision' });
    expect(within(dialog).getByRole('heading', { name: 'Pourquoi cette décision ?' }))
      .toBeInTheDocument();
    expect(within(dialog).getByText(/La progression reste cohérente avec le plan\./))
      .toBeInTheDocument();
    expect(within(dialog).getByText(/première décision enregistrée/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/La récupération reste stable\./)).toBeInTheDocument();
  });

  it('affiche les données insuffisantes et la Safety active sans inventer de raison', async () => {
    const user = userEvent.setup();
    render(<CoachExplanationPanel explanation={explanation({
      availability: 'insufficientData',
      title: 'Compléter les données',
      summary: 'Le Coach manque encore d’éléments fiables pour expliquer une décision plus précise.',
      reasons: [],
      safety: {
        status: 'doNotIntensify',
        title: 'Pas d’intensification pour le moment.',
        reasons: ['Une douleur ou blessure est signalée dans le check-in du jour.'],
      },
    })} />);

    await user.click(screen.getByRole('button', { name: 'Comprendre cette décision' }));
    const dialog = screen.getByRole('dialog', { name: 'Comprendre la décision' });
    expect(within(dialog).getByText(/manque encore d’éléments fiables/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Aucune raison fiable supplémentaire n’est disponible.'))
      .toBeInTheDocument();
    expect(within(dialog).getByText('Pas d’intensification pour le moment.')).toBeInTheDocument();
    expect(within(dialog).getByText(/douleur ou blessure/i)).toBeInTheDocument();
  });
});
