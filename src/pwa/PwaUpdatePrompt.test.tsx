import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PwaUpdatePrompt } from '@/pwa/PwaUpdatePrompt';
import {
  configurePwaRegisterMock,
  resetPwaRegisterMock,
} from '@/test/mocks/pwaRegisterReact';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((currentResolve) => {
    resolve = currentResolve;
  });

  return { promise, resolve };
}

describe('PwaUpdatePrompt', () => {
  beforeEach(() => {
    resetPwaRegisterMock();
  });

  afterEach(() => {
    resetPwaRegisterMock();
  });

  it('désactive les actions pendant la sécurisation des données', async () => {
    const updateServiceWorker = vi.fn(async () => undefined);
    const applyUpdate = vi.fn(async (): Promise<void> => undefined);
    const gate = deferred();
    configurePwaRegisterMock({ needRefresh: true, updateServiceWorker });
    applyUpdate.mockReturnValue(gate.promise);

    render(<PwaUpdatePrompt applyUpdate={applyUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour maintenant' }));

    const pendingButton = await screen.findByRole('button', {
      name: 'Sécurisation des données…',
    });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Plus tard' })).toBeDisabled();
    expect(applyUpdate).toHaveBeenCalledWith(updateServiceWorker);

    gate.resolve();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mettre à jour maintenant' })).toBeEnabled();
    });
  });

  it('conserve la bannière et affiche une erreur si la mise à jour échoue', async () => {
    const applyUpdate = vi.fn(async () => {
      throw new Error('échec simulé');
    });
    configurePwaRegisterMock({ needRefresh: true });

    render(<PwaUpdatePrompt applyUpdate={applyUpdate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Mettre à jour maintenant' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'La mise à jour n’a pas été appliquée',
    );
    expect(screen.getByRole('button', { name: 'Mettre à jour maintenant' })).toBeEnabled();
  });
});
