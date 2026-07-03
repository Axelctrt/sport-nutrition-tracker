import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { AutomaticSyncSettingsPanel } from '@/features/settings/components/AutomaticSyncSettingsPanel';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import type { AppSettings } from '@/domain/models/settings';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

const repositoryMocks = vi.hoisted(() => ({
  get: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/infrastructure/repositories/repositories', () => ({
  repositories: {
    settings: {
      get: repositoryMocks.get,
      update: repositoryMocks.update,
    },
  },
}));

function snapshot(): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: 'automatic-sync-panel-user',
    },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    diagnostics: createEmptySyncPrototypeDiagnostics(),
  };
}

function client(): SyncPrototypeClient {
  const current = snapshot();
  return {
    getSnapshot: () => current,
    subscribe: () => () => undefined,
  } as unknown as SyncPrototypeClient;
}

function settings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    ...createDefaultAppSettings(),
    automaticAccountSyncEnabled: false,
    automaticAccountSyncConnectionMode: 'any-connection',
    automaticWeightSyncEnabled: true,
    automaticWeightSyncAccountFingerprint: 'legacy-account',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AutomaticSyncSettingsPanel', () => {
  it('autorise le compte connecté et désactive l’ancien automatisme des pesées', async () => {
    const initial = settings();
    repositoryMocks.get.mockResolvedValue(initial);
    repositoryMocks.update.mockImplementation(async (changes) => ({
      ...initial,
      ...changes,
    }));
    const user = userEvent.setup();

    render(<AutomaticSyncSettingsPanel client={client()} />);

    const button = await screen.findByRole('button', {
      name: 'Activer pour ce compte',
    });
    await user.click(button);

    await waitFor(() =>
      expect(repositoryMocks.update).toHaveBeenCalledWith(
        expect.objectContaining({
          automaticAccountSyncEnabled: true,
          automaticWeightSyncEnabled: false,
          automaticWeightSyncAccountFingerprint: undefined,
        }),
      ),
    );
    expect(
      repositoryMocks.update.mock.calls[0]?.[0]
        .automaticAccountSyncAccountFingerprint,
    ).toBeTruthy();
  });

  it('enregistre le mode Wi-Fi uniquement sans activer automatiquement le compte', async () => {
    const initial = settings();
    repositoryMocks.get.mockResolvedValue(initial);
    repositoryMocks.update.mockImplementation(async (changes) => ({
      ...initial,
      ...changes,
    }));
    const user = userEvent.setup();

    render(<AutomaticSyncSettingsPanel client={client()} />);

    await user.click(
      await screen.findByRole('radio', { name: /Wi-Fi uniquement/i }),
    );

    await waitFor(() =>
      expect(repositoryMocks.update).toHaveBeenCalledWith({
        automaticAccountSyncConnectionMode: 'wifi-only',
      }),
    );
  });
});
