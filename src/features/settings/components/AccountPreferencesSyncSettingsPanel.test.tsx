import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { AccountPreferencesSyncSettingsPanel } from '@/features/settings/components/AccountPreferencesSyncSettingsPanel';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

function createClient() {
  const listeners = new Set<() => void>();
  let snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: 'user-1' },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realAccountPreferences: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };
  const notify = () => listeners.forEach((listener) => listener());
  const preview = {
    localProfilePresent: true,
    cloudProfilePresent: false,
    localSettingsPresent: true,
    cloudSettingsPresent: false,
    differingEntityCount: 2,
  };
  const analyzeRealAccountPreferences = vi.fn(async () => {
    snapshot = {
      ...snapshot,
      realAccountPreferences: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealAccountPreferences = vi.fn(async () => {
    const readyPreview = {
      ...preview,
      cloudProfilePresent: true,
      cloudSettingsPresent: true,
      differingEntityCount: 0,
    };
    const result = {
      ...readyPreview,
      uploadedProfiles: 1,
      downloadedProfiles: 0,
      uploadedSettings: 1,
      downloadedSettings: 0,
      completedAt: '2026-07-02T12:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realAccountPreferences: {
        enabled: true,
        status: 'ready',
        preview: readyPreview,
        lastResult: result,
      },
    };
    notify();
    return result;
  });

  const client: SyncPrototypeClient = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    logout: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    })),
    syncRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
      uploadedWeights: 0,
      downloadedWeights: 0,
      removedLocalWeights: 0,
      removedCloudWeights: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-07-02T12:00:00.000Z',
    })),
    analyzeRealAccountPreferences,
    syncRealAccountPreferences,
    saveWeight: vi.fn(async () => { throw new Error('Non utilisé'); }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return { client, analyzeRealAccountPreferences, syncRealAccountPreferences };
}

describe('AccountPreferencesSyncSettingsPanel', () => {
  it('explique les réglages conservés sur l’appareil', () => {
    render(
      <MemoryRouter>
        <AccountPreferencesSyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Profil et réglages non activés')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gérer le compte de synchronisation' }))
      .toHaveAttribute('href', '/settings/account-devices');
  });

  it('analyse puis synchronise après confirmation sans inclure les rappels', async () => {
    const user = userEvent.setup();
    const { client, analyzeRealAccountPreferences, syncRealAccountPreferences } = createClient();

    render(
      <MemoryRouter>
        <AccountPreferencesSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Les rappels seront traités séparément/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Analyser sans modifier' }));
    await waitFor(() => expect(analyzeRealAccountPreferences).toHaveBeenCalledTimes(1));
    expect(screen.getByText('2 éléments diffèrent entre cet appareil et le cloud.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Synchroniser le profil et les réglages' }));
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));
    await waitFor(() => expect(syncRealAccountPreferences).toHaveBeenCalledTimes(1));
    expect(screen.getByText('2 éléments mis à jour.')).toBeInTheDocument();
  });
});
