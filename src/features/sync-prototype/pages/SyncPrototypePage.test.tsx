import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SyncPrototypePage } from '@/features/sync-prototype/pages/SyncPrototypePage';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const scrollIntoViewMock = vi.fn();
const writeTextMock = vi.fn(async (_text: string) => undefined);

beforeEach(() => {
  scrollIntoViewMock.mockClear();
  writeTextMock.mockClear();
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: scrollIntoViewMock,
  });
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: writeTextMock },
  });
});

afterEach(cleanup);

function createFakeDiagnostics(accountFingerprint?: string) {
  return {
    databaseName: 'sportpilot-sync-prototype',
    databaseVersion: 1,
    visibleWeightCount: 0,
    deletedWeightCount: 0,
    ...(accountFingerprint ? { accountFingerprint } : {}),
  };
}

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
    weights: {
      weights: [],
      deletedCount: 0,
      isLoading: false,
    },
    diagnostics: createFakeDiagnostics(),
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
          weights: {
            weights: [],
            deletedCount: 0,
            isLoading: false,
          },
          diagnostics: {
            ...createFakeDiagnostics('acct-TEST0001'),
            lastRefreshAt: '2026-06-30T08:00:00.000Z',
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
      weights: {
        weights: [],
        deletedCount: 0,
        isLoading: false,
      },
      diagnostics: createFakeDiagnostics(),
    };
    emit();
  });
  const syncNow = vi.fn(async () => undefined);
  const saveWeight = vi.fn(
    async (draft: {
      date: string;
      weightKg: number;
      note?: string;
    }) => {
      const now = '2026-06-30T08:00:00.000Z';
      const entry = {
        id: `weight:${draft.date}`,
        date: draft.date,
        weightKg: draft.weightKg,
        ...(draft.note ? { note: draft.note } : {}),
        createdAt: now,
        updatedAt: now,
      };
      snapshot = {
        ...snapshot,
        weights: {
          ...snapshot.weights,
          weights: [
            entry,
            ...snapshot.weights.weights.filter(
              (item) => item.id !== entry.id,
            ),
          ],
        },
        diagnostics: {
          ...snapshot.diagnostics,
          visibleWeightCount: 1,
          latestWeightUpdatedAt: now,
          lastRefreshAt: now,
        },
      };
      emit();
      return entry;
    },
  );
  const deleteWeight = vi.fn(async (weightId: string) => {
    snapshot = {
      ...snapshot,
      weights: {
        weights: snapshot.weights.weights.filter(
          (item) => item.id !== weightId,
        ),
        deletedCount: snapshot.weights.deletedCount + 1,
        isLoading: false,
      },
      diagnostics: {
        ...snapshot.diagnostics,
        visibleWeightCount: 0,
        deletedWeightCount:
          snapshot.diagnostics.deletedWeightCount + 1,
        lastRefreshAt: '2026-06-30T08:05:00.000Z',
      },
    };
    emit();
  });

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
    saveWeight,
    deleteWeight,
  };

  return {
    client,
    initialize,
    login,
    submitInteraction,
    logout,
    syncNow,
    saveWeight,
    deleteWeight,
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
    expect(
      await screen.findByText('Synchronisation effectuée'),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Synchronisation demandée'),
    ).not.toBeInTheDocument();

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


  it('vide le champ email après la déconnexion', async () => {
    const user = userEvent.setup();
    const { client } = createFakeClient();

    renderPage(client);

    const emailInput = await screen.findByRole('textbox', {
      name: /adresse email/i,
    });
    await user.type(emailInput, 'test@example.com');
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
      screen.getByRole('button', {
        name: 'Déconnecter le prototype',
      }),
    );

    expect(
      await screen.findByRole('textbox', { name: /adresse email/i }),
    ).toHaveValue('');
  });

  it('copie un diagnostic C3 sans email ni donnée réelle', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: writeTextMock },
    });
    const { client } = createFakeClient();

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

    const diagnosticsToggle = screen.getByRole('button', {
      name: /Diagnostic C3/i,
    });
    expect(diagnosticsToggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(diagnosticsToggle);

    expect(diagnosticsToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('acct-TEST0001')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Copier le diagnostic' }),
    );

    await waitFor(() => expect(writeTextMock).toHaveBeenCalledTimes(1));
    const report = String(writeTextMock.mock.calls[0]?.[0]);
    expect(report).toContain('sportpilot-sync-prototype');
    expect(report).toContain('acct-TEST0001');
    expect(report).not.toContain('test@example.com');
    expect(report).not.toContain('sportpilot-local-database');
    expect(
      await screen.findByText('Diagnostic copié'),
    ).toBeInTheDocument();
  });

  it('ajoute, modifie puis supprime une pesée fictive', async () => {
    const user = userEvent.setup();
    const { client, saveWeight, deleteWeight } = createFakeClient();

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

    const weightSectionToggle = screen.getByRole('button', {
      name: /Pesées fictives synchronisées/i,
    });
    expect(weightSectionToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText(/^Date/)).not.toBeInTheDocument();

    await user.click(weightSectionToggle);

    expect(weightSectionToggle).toHaveAttribute('aria-expanded', 'true');
    const dateInput = await screen.findByLabelText(/^Date/);
    const weightInput = screen.getByLabelText(/^Poids en kilogrammes/);
    const noteInput = screen.getByLabelText(/^Note de test/);

    await user.clear(dateInput);
    await user.type(dateInput, '2026-06-30');
    await user.type(weightInput, '75.4');
    await user.type(noteInput, 'Test ordinateur');
    await user.click(
      screen.getByRole('button', {
        name: 'Ajouter la pesée fictive',
      }),
    );

    expect(saveWeight).toHaveBeenCalledWith({
      date: '2026-06-30',
      weightKg: 75.4,
      note: 'Test ordinateur',
    });
    expect(await screen.findByText('75.4 kg')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Modifier la pesée du 2026-06-30',
      }),
    );

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
      expect(
        screen.getByLabelText(/^Poids en kilogrammes/),
      ).toHaveFocus();
    });

    await user.clear(screen.getByLabelText(/^Poids en kilogrammes/));
    await user.type(screen.getByLabelText(/^Poids en kilogrammes/), '75.1');
    await user.click(
      screen.getByRole('button', {
        name: 'Enregistrer la modification',
      }),
    );

    expect(saveWeight).toHaveBeenLastCalledWith({
      date: '2026-06-30',
      weightKg: 75.1,
      note: 'Test ordinateur',
    });
    expect(await screen.findByText('75.1 kg')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Supprimer la pesée du 2026-06-30',
      }),
    );
    await user.click(
      screen.getByRole('button', { name: 'Supprimer' }),
    );

    expect(deleteWeight).toHaveBeenCalledWith('weight:2026-06-30');
    expect(
      await screen.findByText('Aucune pesée fictive'),
    ).toBeInTheDocument();
    expect(screen.getByText(/1 marqueur de suppression/i)).toBeInTheDocument();
  });
});
