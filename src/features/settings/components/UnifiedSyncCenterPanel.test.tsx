import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { UnifiedSyncCenterPanel } from '@/features/settings/components/UnifiedSyncCenterPanel';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

function createClient() {
  const listeners = new Set<() => void>();
  let snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: 'user-e3', email: 'user@example.com' },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realAccountPreferences: { enabled: true, status: 'idle' },
    realWeights: { enabled: true, status: 'idle' },
    realActivities: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-e3'),
  };
  const notify = () => listeners.forEach((listener) => listener());
  const updateDomain = (
    key: 'realAccountPreferences' | 'realWeights' | 'realActivities',
    differingEntityCount: number,
  ) => {
    snapshot = {
      ...snapshot,
      [key]: {
        enabled: true,
        status: 'ready',
        preview: { differingEntityCount },
      },
    } as SyncPrototypeSnapshot;
    notify();
  };

  const analyzeRealAccountPreferences = vi.fn(async () => {
    updateDomain('realAccountPreferences', 2);
    return { differingEntityCount: 2 };
  });
  const analyzeRealWeights = vi.fn(async () => {
    updateDomain('realWeights', 0);
    return { differingEntityCount: 0 };
  });
  const analyzeRealActivities = vi
    .fn()
    .mockRejectedValueOnce(new Error('Réseau indisponible pour les activités.'))
    .mockImplementation(async () => {
      updateDomain('realActivities', 0);
      return { differingEntityCount: 0 };
    });

  const syncRealAccountPreferences = vi.fn(async () => {
    updateDomain('realAccountPreferences', 0);
    return {};
  });
  const syncRealWeights = vi.fn(async () => {
    updateDomain('realWeights', 0);
    return {};
  });
  const syncRealActivities = vi
    .fn()
    .mockRejectedValueOnce(new Error('Échec temporaire des activités.'))
    .mockImplementation(async () => {
      updateDomain('realActivities', 0);
      return {};
    });

  const client = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    logout: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealAccountPreferences,
    syncRealAccountPreferences,
    analyzeRealWeights,
    syncRealWeights,
    analyzeRealActivities,
    syncRealActivities,
    saveWeight: vi.fn(async () => { throw new Error('Non utilisé'); }),
    deleteWeight: vi.fn(async () => undefined),
  } as unknown as SyncPrototypeClient;

  return {
    client,
    analyzeRealAccountPreferences,
    analyzeRealWeights,
    analyzeRealActivities,
    syncRealAccountPreferences,
    syncRealWeights,
    syncRealActivities,
  };
}

describe('UnifiedSyncCenterPanel', () => {
  it('explique que le centre dépend de la synchronisation cloud', () => {
    render(
      <MemoryRouter>
        <UnifiedSyncCenterPanel client={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Synchronisation non activée')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gérer le compte de synchronisation' }))
      .toHaveAttribute('href', '/settings/account-devices');
  });

  it('présente d’abord le compte, l’état global et l’action principale', async () => {
    const { client } = createClient();

    render(
      <MemoryRouter>
        <UnifiedSyncCenterPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    expect(screen.getByText('Compte actif')).toBeInTheDocument();
    expect(screen.getByText('user@example.com')).toBeInTheDocument();
    expect(screen.getByText('Dernière synchronisation réussie')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Synchroniser maintenant' })).toBeInTheDocument();

    const advanced = screen.getByText('Détails techniques et historique').closest('details');
    expect(advanced).not.toBeNull();
    expect(advanced).not.toHaveAttribute('open');
  });

  it('analyse toutes les rubriques et relance uniquement celle en échec', async () => {
    const user = userEvent.setup();
    const {
      client,
      analyzeRealAccountPreferences,
      analyzeRealWeights,
      analyzeRealActivities,
    } = createClient();

    render(
      <MemoryRouter>
        <UnifiedSyncCenterPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    await user.click(screen.getByText('Détails techniques et historique'));
    await user.click(screen.getByRole('button', { name: 'Analyser tout' }));

    await waitFor(() => {
      expect(analyzeRealAccountPreferences).toHaveBeenCalledTimes(1);
      expect(analyzeRealWeights).toHaveBeenCalledTimes(1);
      expect(analyzeRealActivities).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('2 différences')).toBeInTheDocument();
    expect(screen.getByText('Réseau indisponible pour les activités.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Relancer uniquement les rubriques en échec' }))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Relancer uniquement les rubriques en échec' }));

    await waitFor(() => expect(analyzeRealActivities).toHaveBeenCalledTimes(2));
    expect(analyzeRealAccountPreferences).toHaveBeenCalledTimes(1);
    expect(analyzeRealWeights).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Réseau indisponible pour les activités.')).not.toBeInTheDocument();
  });



  it('ouvre un panneau détaillé sans transformer l’ancre en route du HashRouter', async () => {
    const user = userEvent.setup();
    const { client } = createClient();
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    });

    try {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <UnifiedSyncCenterPanel client={client} />
          <section id="sync-detail-account-preferences">Détail du profil</section>
        </MemoryRouter>,
      );

      await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
      await user.click(screen.getByText('Détails techniques et historique'));
      const row = screen.getByText('Profil et réglages').closest('li');
      expect(row).not.toBeNull();
      await user.click(within(row!).getByRole('button', { name: 'Détail' }));

      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
      expect(screen.getByText('Détail du profil')).toBeInTheDocument();
    } finally {
      Object.defineProperty(Element.prototype, 'scrollIntoView', {
        configurable: true,
        writable: true,
        value: originalScrollIntoView,
      });
    }
  });



  it('délègue l’ouverture du détail et indique la rubrique déjà affichée', async () => {
    const user = userEvent.setup();
    const { client } = createClient();
    const onOpenDetail = vi.fn();

    render(
      <MemoryRouter>
        <UnifiedSyncCenterPanel
          client={client}
          activeDetailId="sync-detail-account-preferences"
          onOpenDetail={onOpenDetail}
        />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    await user.click(screen.getByText('Détails techniques et historique'));
    const row = screen.getByText('Profil et réglages').closest('li');
    expect(row).not.toBeNull();
    const button = within(row!).getByRole('button', { name: 'Masquer' });
    expect(button).toHaveAttribute('aria-expanded', 'true');

    await user.click(button);

    expect(onOpenDetail).toHaveBeenCalledWith(
      'sync-detail-account-preferences',
    );
  });

  it('explique qu’une pesée peut légitimement modifier l’objectif du journal', async () => {
    const user = userEvent.setup();
    const snapshot: SyncPrototypeSnapshot = {
      account: { isLoggedIn: true, isLoading: false, userId: 'user-journal' },
      sync: { status: 'connected', phase: 'in-sync' },
      weights: { weights: [], deletedCount: 0, isLoading: false },
      realNutritionJournal: {
        enabled: true,
        status: 'ready',
        preview: {
          localDayCount: 1,
          cloudDayCount: 1,
          localEntryCount: 0,
          cloudEntryCount: 0,
          localDeletionCount: 0,
          cloudDeletionCount: 0,
          differingEntityCount: 1,
        },
      },
      diagnostics: createEmptySyncPrototypeDiagnostics('user-journal'),
    };
    const client = {
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      initialize: vi.fn(async () => undefined),
      analyzeRealNutritionJournal: vi.fn(async () => ({ differingEntityCount: 1 })),
      syncRealNutritionJournal: vi.fn(async () => ({})),
    } as unknown as SyncPrototypeClient;

    render(
      <MemoryRouter>
        <UnifiedSyncCenterPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    await user.click(screen.getByText('Détails techniques et historique'));
    expect(screen.getByText(/objectifs quotidiens recalculés, notamment après une pesée/i))
      .toBeInTheDocument();
    expect(screen.getByText(/peut modifier l’objectif quotidien sans changer les aliments/i))
      .toBeInTheDocument();
  });

  it('confirme la synchronisation globale puis confirme la relance des seuls échecs', async () => {
    const user = userEvent.setup();
    const {
      client,
      syncRealAccountPreferences,
      syncRealWeights,
      syncRealActivities,
    } = createClient();

    render(
      <MemoryRouter>
        <UnifiedSyncCenterPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'Synchroniser maintenant' }));

    let dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Synchroniser toutes les rubriques ?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Synchroniser tout' }));

    await waitFor(() => {
      expect(syncRealAccountPreferences).toHaveBeenCalledTimes(1);
      expect(syncRealWeights).toHaveBeenCalledTimes(1);
      expect(syncRealActivities).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('Échec temporaire des activités.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Relancer uniquement les rubriques en échec' }));
    dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText('Relancer les synchronisations en échec ?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Relancer les échecs' }));

    await waitFor(() => expect(syncRealActivities).toHaveBeenCalledTimes(2));
    expect(syncRealAccountPreferences).toHaveBeenCalledTimes(1);
    expect(syncRealWeights).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Échec temporaire des activités.')).not.toBeInTheDocument();
  });
});
