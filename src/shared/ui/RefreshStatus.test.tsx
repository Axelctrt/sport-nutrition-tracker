import { render, screen } from '@testing-library/react';

import { RefreshStatus } from '@/shared/ui/RefreshStatus';

describe('RefreshStatus', () => {
  it('n’affiche rien hors actualisation', () => {
    render(<RefreshStatus visible={false} />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('annonce une actualisation sans masquer les données présentes', () => {
    render(<RefreshStatus visible label="Actualisation du journal…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Actualisation du journal…');
  });
});
