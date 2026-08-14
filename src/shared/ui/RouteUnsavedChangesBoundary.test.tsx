import { type ReactNode, useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  createMemoryRouter,
  Link,
  Outlet,
  RouterProvider,
} from 'react-router-dom';

import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { RouteUnsavedChangesBoundary } from '@/shared/ui/RouteUnsavedChangesBoundary';

function BoundaryLayout() {
  return (
    <RouteUnsavedChangesBoundary>
      <Outlet />
    </RouteUnsavedChangesBoundary>
  );
}

function ReminderFixture() {
  const [value, setValue] = useState('08:00');
  const [saved, setSaved] = useState(false);

  return (
    <>
      <label>
        Heure
        <input
          type="time"
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSaved(false);
          }}
        />
      </label>
      <button type="button" onClick={() => setSaved(true)}>
        Enregistrer les rappels
      </button>
      {saved ? <p role="status">Préférences enregistrées.</p> : null}
      <Link to="/destination">Quitter la page</Link>
    </>
  );
}

function DashboardFixture() {
  const [compact, setCompact] = useState(false);

  return (
    <form>
      <label>
        <input
          type="checkbox"
          checked={compact}
          onChange={(event) => setCompact(event.target.checked)}
        />
        Affichage compact
      </label>
      <button type="submit">Enregistrer</button>
      <Link to="/destination">Quitter la page</Link>
    </form>
  );
}

function SettingsFixture() {
  const [automaticSync, setAutomaticSync] = useState(false);
  const [theme, setTheme] = useState('system');

  return (
    <>
      <label>
        <input
          type="checkbox"
          checked={automaticSync}
          onChange={(event) => setAutomaticSync(event.target.checked)}
        />
        Synchronisation automatique
      </label>
      <form>
        <label>
          Thème
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="system">Système</option>
            <option value="dark">Sombre</option>
          </select>
        </label>
        <button type="submit">Enregistrer les paramètres</button>
      </form>
      <Link to="/destination">Quitter la page</Link>
    </>
  );
}

function ResettableSettingsFixture() {
  const [theme, setTheme] = useState('dark');
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <>
      <form>
        <label>
          Thème
          <select
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
          >
            <option value="system">Système</option>
            <option value="light">Clair</option>
            <option value="dark">Sombre</option>
          </select>
        </label>
        <button type="submit">Enregistrer les paramètres</button>
        <button type="button" onClick={() => setResetOpen(true)}>
          Rétablir les valeurs par défaut
        </button>
      </form>
      <ConfirmationDialog
        open={resetOpen}
        title="Rétablir les paramètres par défaut ?"
        description="Les valeurs recommandées seront restaurées."
        confirmLabel="Rétablir"
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          setTheme('light');
          setResetOpen(false);
        }}
      />
      <Link to="/destination">Quitter la page</Link>
    </>
  );
}

function renderRoute(path: string, element: ReactNode) {
  const router = createMemoryRouter([
    {
      path: '/',
      element: <BoundaryLayout />,
      children: [
        { path: path.slice(1), element },
        { path: 'destination', element: <p>Destination</p> },
      ],
    },
  ], { initialEntries: [path] });

  render(<RouterProvider router={router} />);
}

describe('RouteUnsavedChangesBoundary', () => {
  it('laisse quitter un écran protégé intact', async () => {
    const user = userEvent.setup();
    renderRoute('/settings/reminders', <ReminderFixture />);

    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));

    expect(await screen.findByText('Destination')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('protège une modification et conserve le brouillon après annulation', async () => {
    const user = userEvent.setup();
    renderRoute('/settings/reminders', <ReminderFixture />);

    const input = screen.getByLabelText('Heure');
    fireEvent.change(input, { target: { value: '09:30' } });
    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(input).toHaveValue('09:30');

    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));
    await user.click(screen.getByRole('button', { name: 'Quitter' }));
    expect(await screen.findByText('Destination')).toBeInTheDocument();
  });

  it('désactive la garde après une sauvegarde réussie', async () => {
    const user = userEvent.setup();
    renderRoute('/settings/reminders', <ReminderFixture />);

    const input = screen.getByLabelText('Heure');
    fireEvent.change(input, { target: { value: '10:15' } });
    await user.click(screen.getByRole('button', { name: 'Enregistrer les rappels' }));
    await screen.findByText('Préférences enregistrées.');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Préférences enregistrées.');
    });
    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));

    expect(await screen.findByText('Destination')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('limite la personnalisation au formulaire portant son action principale', async () => {
    const user = userEvent.setup();
    renderRoute('/settings/dashboard', <DashboardFixture />);

    await user.click(screen.getByRole('checkbox', { name: 'Affichage compact' }));
    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('ignore les contrôles à écriture immédiate hors du formulaire ciblé', async () => {
    const user = userEvent.setup();
    renderRoute('/settings/advanced', <SettingsFixture />);

    await user.click(screen.getByRole('checkbox', { name: 'Synchronisation automatique' }));
    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));

    expect(await screen.findByText('Destination')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('protège le formulaire avancé ciblé', async () => {
    const user = userEvent.setup();
    renderRoute('/settings/advanced', <SettingsFixture />);

    await user.selectOptions(screen.getByLabelText('Thème'), 'dark');
    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
  });

  it('désactive la garde après une réinitialisation persistée depuis le portail', async () => {
    const user = userEvent.setup();
    renderRoute('/settings/advanced', <ResettableSettingsFixture />);

    await user.selectOptions(screen.getByLabelText('Thème'), 'system');
    await user.click(screen.getByRole('button', { name: 'Rétablir les valeurs par défaut' }));
    await user.click(screen.getByRole('button', { name: 'Rétablir' }));

    await waitFor(() => {
      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Thème')).toHaveValue('light');
    });

    await user.click(screen.getByRole('link', { name: 'Quitter la page' }));

    expect(await screen.findByText('Destination')).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
