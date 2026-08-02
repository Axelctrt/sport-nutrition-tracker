import { cleanup, render, screen } from '@testing-library/react';
import { Circle } from 'lucide-react';

import { EmptyState, type EmptyStateVariant } from '@/shared/ui/EmptyState';

const variants: EmptyStateVariant[] = ['first-use', 'filtered', 'completed', 'unavailable'];

describe('EmptyState', () => {
  afterEach(() => cleanup());

  it.each(variants)('expose la variante sémantique %s', (variant) => {
    render(
      <EmptyState
        icon={Circle}
        variant={variant}
        title={`Titre ${variant}`}
        description="Description utile"
        primaryAction={<button type="button">Action principale</button>}
        secondaryAction={<button type="button">Action secondaire</button>}
      />,
    );

    const heading = screen.getByRole('heading', { name: `Titre ${variant}` });
    expect(heading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      variant,
    );
    expect(screen.getByText('Description utile')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action principale' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Action secondaire' })).toBeInTheDocument();
  });

  it('reste rétrocompatible sans variante explicite', () => {
    render(<EmptyState icon={Circle} title="État historique" compact />);

    const heading = screen.getByRole('heading', { name: 'État historique' });
    expect(heading.closest('[data-empty-state-variant]')).toHaveAttribute(
      'data-empty-state-variant',
      'first-use',
    );
  });
});
