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
});

describe('AutomaticSyncSettingsPanel', () => {
  it('autorise le compte connecté et désactive l’ancien automatisme des pesées', async () => {
    const initial = settings();
    const loadSettings = vi.fn().mockResolvedValue(initial);
    const saveSettings = vi.fn().mockImplementation(async (changes) => ({
      ...initial,
      ...changes,
    }));
    const user = userEvent.setup();

    render(
      <AutomaticSyncSettingsPanel
        client={client()}
        loadSettings={loadSettings}
        saveSettings={saveSettings}
      />,
    );

    const button = await screen.findByRole('button', {
      name: 'Activer pour ce compte',
    });
    await user.click(button);

    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          automaticAccountSyncEnabled: true,
          automaticWeightSyncEnabled: false,
          automaticWeightSyncAccountFingerprint: undefined,
        }),
      ),
    );
    expect(
      saveSettings.mock.calls[0]?.[0]
        .automaticAccountSyncAccountFingerprint,
    ).toBeTruthy();
  });

  it('enregistre le mode Wi-Fi uniquement sans activer automatiquement le compte', async () => {
    const initial = settings();
    const loadSettings = vi.fn().mockResolvedValue(initial);
    const saveSettings = vi.fn().mockImplementation(async (changes) => ({
      ...initial,
      ...changes,
    }));
    const user = userEvent.setup();

    render(
      <AutomaticSyncSettingsPanel
        client={client()}
        loadSettings={loadSettings}
        saveSettings={saveSettings}
      />,
    );

    await user.click(
      await screen.findByRole('radio', { name: /Wi-Fi uniquement/i }),
    );

    await waitFor(() =>
      expect(saveSettings).toHaveBeenCalledWith({
        automaticAccountSyncConnectionMode: 'wifi-only',
      }),
    );
  });

  it('conserve une erreur d’enregistrement sur la surface', async () => {
    const initial = settings();
    const saveSettings = vi
      .fn()
      .mockRejectedValue(new Error('Synchronisation non enregistrée.'));
    const user = userEvent.setup();

    render(
      <AutomaticSyncSettingsPanel
        client={client()}
        loadSettings={vi.fn().mockResolvedValue(initial)}
        saveSettings={saveSettings}
      />,
    );

    await user.click(
      await screen.findByRole('button', {
        name: 'Activer pour ce compte',
      }),
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Synchronisation non enregistrée.',
    );
  });
});
