import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { vi } from 'vitest';

import { ExpandableCard } from '@/shared/ui/ExpandableCard';

function ExpandableCardHarness({ onAction = vi.fn() }: { onAction?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <ExpandableCard
      summary={<h2>Résumé pilote</h2>}
      actions={<button type="button" onClick={onAction}>Action secondaire</button>}
      details={<p>Détails progressifs</p>}
      expanded={expanded}
      onExpandedChange={setExpanded}
      expandLabel="Afficher les détails"
      collapseLabel="Masquer les détails"
    />
  );
}

describe('ExpandableCard', () => {
  it('révèle et replie les détails avec un contrôle accessible', async () => {
    const user = userEvent.setup();
    render(<ExpandableCardHarness />);

    const toggle = screen.getByRole('button', { name: 'Afficher les détails' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Détails progressifs')).not.toBeInTheDocument();

    await user.click(toggle);

    const collapse = screen.getByRole('button', { name: 'Masquer les détails' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Résumé pilote' })).toHaveTextContent('Détails progressifs');

    await user.click(collapse);
    expect(screen.queryByText('Détails progressifs')).not.toBeInTheDocument();
  });

  it('sépare les actions secondaires du contrôle d’ouverture', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<ExpandableCardHarness onAction={onAction} />);

    await user.click(screen.getByRole('button', { name: 'Action secondaire' }));

    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Afficher les détails' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('n’affiche pas de contrôle lorsque la carte ne possède aucun détail', () => {
    render(
      <ExpandableCard
        summary={<h2>Résumé seul</h2>}
        expanded={false}
        onExpandedChange={vi.fn()}
        expandLabel="Afficher les détails"
        collapseLabel="Masquer les détails"
      />,
    );

    expect(screen.getByText('Résumé seul')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Afficher les détails' })).not.toBeInTheDocument();
  });
});
