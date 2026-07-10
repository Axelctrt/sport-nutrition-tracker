import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';

import { AppRouteErrorPage } from '@/app/errors/AppRouteErrorPage';

function renderError(error: Error) {
  const router = createMemoryRouter([
    {
      path: '/',
      loader: () => {
        throw error;
      },
      element: <div>Page</div>,
      errorElement: <AppRouteErrorPage />,
    },
  ]);

  return render(<RouterProvider router={router} />);
}

describe('AppRouteErrorPage', () => {
  it('explique comment récupérer un chunk obsolète', async () => {
    renderError(new TypeError(
      'Failed to fetch dynamically imported module: https://example.test/assets/Dashboard.js',
    ));

    expect(await screen.findByRole('heading', {
      name: 'SportPilot n’a pas pu ouvrir cette page',
    })).toBeInTheDocument();
    expect(screen.getByText(/nouvelle version de l’application/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recharger la page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Retour à l’accueil' })).toBeInTheDocument();
  });

  it('rassure sur la conservation locale pour une erreur métier', async () => {
    renderError(new Error('Lecture impossible'));

    expect(await screen.findByText(/données locales restent conservées/i)).toBeInTheDocument();
    expect(screen.getByText('Lecture impossible')).toBeInTheDocument();
  });
});
