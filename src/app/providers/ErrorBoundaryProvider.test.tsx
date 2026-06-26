import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundaryProvider } from '@/app/providers/ErrorBoundaryProvider';

function RouteSensitiveContent() {
  if (window.location.hash !== '#/') {
    throw new Error('Écran de test indisponible');
  }

  return <p>Tableau de bord restauré</p>;
}

describe('ErrorBoundaryProvider', () => {
  it('permet de quitter un écran en erreur sans supprimer les données locales', async () => {
    const user = userEvent.setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    window.location.hash = '#/route-en-erreur';

    render(
      <ErrorBoundaryProvider>
        <RouteSensitiveContent />
      </ErrorBoundaryProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Une erreur inattendue est survenue');
    await user.click(screen.getByRole('button', { name: 'Retour à l’accueil' }));

    expect(window.location.hash).toBe('#/');
    expect(await screen.findByText('Tableau de bord restauré')).toBeInTheDocument();
  });
});
