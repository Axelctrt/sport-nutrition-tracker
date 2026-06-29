import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncPrototypePage } from '@/features/sync-prototype/pages/SyncPrototypePage';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { ToastProvider } from '@/shared/toast/ToastProvider';

afterEach(cleanup);

function createFakeClient() {
  let snapshot: SyncPrototypeSnapshot = {
    account: {
      isLoggedIn: false,
      isLoading: false,
    },
    sync: {
      status: 'not-started',
      phase: 'initial',
    },
  };
  const listeners = new Set<() => void>();
  let resolveLogin: (() => void) | undefined;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const initialize = vi.fn(async () => undefined);
  const login = vi.fn(
    (email: string) =>
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
        snapshot = {
          ...snapshot,
          interaction: {
            type: 'otp',
            title: 'Vérifier votre adresse',
            alerts: [
              {
                type: 'info',
                messageCode: 'OTP_SENT',
                message: 'Code envoyé',
                messageParams: { email },
              },
            ],
            submitLabel: 'Valider le code',
            cancelLabel: 'Annuler',
          },
        };
        emit();
      }),
  );
  const submitInteraction = vi.fn(
    (params: Readonly<Record<string, string>>) => {
      if (snapshot.interaction?.type === 'otp' && params.otp) {
        const { interaction: _interaction, ...withoutInteraction } =
          snapshot;
        snapshot = {
          ...withoutInteraction,
          account: {
            isLoggedIn: true,
            isLoading: false,
            email: 'test@example.com',
          },
          sync: {
            status: 'connected',
            phase: 'in-sync',
            progress: 100,
          },
        };
        emit();
        resolveLogin?.();
      }
    },
  );
  const cancelInteraction = vi.fn(() => {
    const { interaction: _interaction, ...withoutInteraction } =
      snapshot;
    snapshot = withoutInteraction;
    emit();
    resolveLogin?.();
  });
  const logout = vi.fn(async () => {
    snapshot = {
      account: {
        isLoggedIn: false,
        isLoading: false,
      },
      sync: {
        status: 'disconnected',
        phase: 'not-in-sync',
      },
    };
    emit();
  });
  const syncNow = vi.fn(async () => undefined);

  const client: SyncPrototypeClient = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    initialize,
    login,
    submitInteraction,
    cancelInteraction,
    logout,
    syncNow,
  };

  return {
    client,
    initialize,
    login,
    submitInteraction,
    logout,
    syncNow,
  };
}

function renderPage(client: SyncPrototypeClient) {
  return render(
    <ToastProvider>
      <SyncPrototypePage client={client} />
    </ToastProvider>,
  );
}

describe('écran du prototype Dexie Cloud', () => {
  it('intègre l’email et le code OTP directement dans la page', async () => {
    const user = userEvent.setup();
    const { client, initialize, login, submitInteraction } =
      createFakeClient();

    renderPage(client);

    expect(
      screen.getByRole('heading', {
        name: 'Prototype de synchronisation',
      }),
    ).toBeInTheDocument();
    expect(initialize).toHaveBeenCalledTimes(1);

    const emailInput = await screen.findByRole('textbox', {
      name: /adresse email/i,
    });
    await user.type(emailInput, 'test@example.com');
    await user.click(
      screen.getByRole('button', { name: 'Recevoir mon code' }),
    );

    expect(login).toHaveBeenCalledWith('test@example.com');
    expect(
      await screen.findByRole('textbox', {
        name: /code de connexion/i,
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/te\*\*\*@example\.com/i),
    ).toBeInTheDocument();

    await user.type(
      screen.getByRole('textbox', { name: /code de connexion/i }),
      '123456',
    );
    await user.click(
      screen.getByRole('button', { name: 'Valider le code' }),
    );

    expect(submitInteraction).toHaveBeenCalledWith({ otp: '123456' });
    expect(await screen.findByText('Connecté')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('permet une synchronisation manuelle puis la déconnexion', async () => {
    const user = userEvent.setup();
    const { client, syncNow, logout } = createFakeClient();

    renderPage(client);

    await user.type(
      await screen.findByRole('textbox', { name: /adresse email/i }),
      'test@example.com',
    );
    await user.click(
      screen.getByRole('button', { name: 'Recevoir mon code' }),
    );
    await user.type(
      await screen.findByRole('textbox', {
        name: /code de connexion/i,
      }),
      '123456',
    );
    await user.click(
      screen.getByRole('button', { name: 'Valider le code' }),
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Synchroniser maintenant',
      }),
    );
    expect(syncNow).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole('button', {
        name: 'Déconnecter le prototype',
      }),
    );
    expect(logout).toHaveBeenCalledTimes(1);
    expect(
      await screen.findByRole('button', {
        name: 'Recevoir mon code',
      }),
    ).toBeInTheDocument();
  });
});
