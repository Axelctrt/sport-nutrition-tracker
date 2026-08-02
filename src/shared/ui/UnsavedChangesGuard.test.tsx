import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('protège aussi un rechargement lorsque des changements existent', () => {
    const { rerender } = render(<UnsavedChangesGuard when />);
    const blockedEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(blockedEvent);
    expect(blockedEvent.defaultPrevented).toBe(true);

    rerender(<UnsavedChangesGuard when={false} />);
    const allowedEvent = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(allowedEvent);
    expect(allowedEvent.defaultPrevented).toBe(false);
  });
});
