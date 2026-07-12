import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  MemoryRouter,
  Outlet,
  RouterProvider,
} from 'react-router-dom';
import { PageHeader } from '@/app/layouts/PageHeader';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

function renderHeader(pathname: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[pathname]}>
        <PageHeader />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

function HeaderLayout() {
  return (
    <ThemeProvider>
      <PageHeader />
      <Outlet />
    </ThemeProvider>
  );
}

describe('PageHeader', () => {
  it('place les paramètres à gauche sur une rubrique principale', () => {
    renderHeader('/food');
    const settingsLink = screen.getByRole('link', { name: 'Ouvrir les paramètres' });
    expect(settingsLink).toHaveAttribute('href', '/settings');
    expect(settingsLink).toHaveClass('size-[var(--sp-touch-target)]');
    expect(screen.queryByRole('link', { name: 'Retour' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retour' })).not.toBeInTheDocument();
  });

  it('utilise un lien de repli sur un écran secondaire ouvert directement', () => {
    renderHeader('/food/add');
    expect(screen.getByRole('link', { name: 'Retour' })).toHaveAttribute('href', '/food');
    expect(screen.queryByRole('link', { name: 'Ouvrir les paramètres' })).not.toBeInTheDocument();
  });

  it('revient à l’entrée précédente avec sa requête lorsque l’historique est exploitable', async () => {
    const user = userEvent.setup();
    const router = createMemoryRouter([
      {
        element: <HeaderLayout />,
        children: [
          { path: '/food', element: <h1>Journal du 12 juillet</h1> },
          { path: '/food/add', element: <h1>Ajouter un aliment</h1> },
        ],
      },
    ], {
      initialEntries: [
        { pathname: '/food', search: '?date=2026-07-12', key: 'journal-entry' },
        { pathname: '/food/add', key: 'editor-entry' },
      ],
      initialIndex: 1,
    });

    render(<RouterProvider router={router} />);
    await user.click(screen.getByRole('button', { name: 'Retour' }));

    expect(await screen.findByRole('heading', { name: 'Journal du 12 juillet' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/food');
    expect(router.state.location.search).toBe('?date=2026-07-12');
  });
});
