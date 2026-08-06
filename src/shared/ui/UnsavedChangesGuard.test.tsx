import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import {
  RouterProvider,
  createMemoryRouter,
  useNavigate,
} from 'react-router-dom';

import { UnsavedChangesGuard } from '@/shared/ui/UnsavedChangesGuard';

function EditablePage({ dirty }: { dirty: boolean }) {
  const navigate = useNavigate();

  return (
    <>
      <h1>Profil</h1>
      <button type="button" onClick={() => navigate('/other')}>
        Changer de page
      </button>
      <UnsavedChangesGuard when={dirty} />
    </>
  );
}

function SavingEditablePage() {
  const navigate = useNavigate();
  const [dirty, setDirty] = useState(true);

  return (
    <>
      <h1>Profil</h1>
      <button
        type="button"
        onClick={() => {
          setDirty(false);
          navigate('/other');
        }}
      >
        Enregistrer et changer de page
      </button>
      <UnsavedChangesGuard when={dirty} />
    </>
  );
}

function renderRouter(dirty: boolean) {
  return render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { path: '/profile', element: <EditablePage dirty={dirty} /> },
          { path: '/other', element: <h1>Autre page</h1> },
        ],
        { initialEntries: ['/profile'] },
      )}
    />,
  );
}

function renderSavingRouter() {
  return render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { path: '/profile', element: <SavingEditablePage /> },
          { path: '/other', element: <h1>Autre page</h1> },
        ],
        { initialEntries: ['/profile'] },
      )}
    />,
  );
}

afterEach(cleanup);

describe('UnsavedChangesGuard', () => {
  it('bloque une navigation interne tant que l’utilisateur ne confirme pas', async () => {
    const user = userEvent.setup();
    renderRouter(true);

    await user.click(screen.getByRole('button', { name: 'Changer de page' }));
    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Profil' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Changer de page' }));
    await user.click(screen.getByRole('button', { name: 'Quitter' }));
    expect(await screen.findByRole('heading', { name: 'Autre page' })).toBeInTheDocument();
  });

  it('laisse naviguer immédiatement lorsque le formulaire est intact', async () => {
    const user = userEvent.setup();
    renderRouter(false);

    await user.click(screen.getByRole('button', { name: 'Changer de page' }));
    expect(await screen.findByRole('heading', { name: 'Autre page' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('reprend une navigation bloquée lorsque la sauvegarde rend le formulaire propre', async () => {
    const user = userEvent.setup();
    renderSavingRouter();

    await user.click(screen.getByRole('button', { name: 'Enregistrer et changer de page' }));

    expect(await screen.findByRole('heading', { name: 'Autre page' })).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('protège aussi un rechargement lorsque des changements existent', () => {
    renderRouter(true);
    const blockedEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(blockedEvent);
    expect(blockedEvent.defaultPrevented).toBe(true);

    cleanup();
    renderRouter(false);
    const allowedEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(allowedEvent);
    expect(allowedEvent.defaultPrevented).toBe(false);
  });
});
