import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SyncPrototypePage } from '@/features/sync-prototype/pages/SyncPrototypePage';
import type { SyncPrototypeClient, SyncPrototypeSnapshot } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { ToastProvider } from '@/shared/toast/ToastProvider';

function createClient(origin: 'unknown' | 'both') {
  const preview = {
    localGoalCount: 2,
    cloudGoalCount: 1,
    localDeletionCount: 0,
    cloudDeletionCount: 0,
    differingEntityCount: 1,
    changeOrigin: origin,
  } as const;
  const snapshot: SyncPrototypeSnapshot = {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-goals-diagnostic',
      email: 'goals@example.com',
    },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realGoals: { enabled: true, status: 'ready', preview },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-goals-diagnostic'),
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => undefined,
    initialize: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    logout: vi.fn(async () => undefined),
    analyzeRealGoals: vi.fn(async () => preview),
    syncRealGoals: vi.fn(async () => {
      throw new Error('Ne doit pas être appelé pour une provenance ambiguë');
    }),
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
      completedAt: '2026-08-17T20:00:00.000Z',
    })),
  } as unknown as SyncPrototypeClient;
}

function renderPage(client: SyncPrototypeClient) {
  return render(
    <MemoryRouter initialEntries={['/settings/sync-prototype']}>
      <ToastProvider>
        <SyncPrototypePage client={client} diagnosticsEnabled={false} />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('/settings/sync-prototype — détail Goals réel', () => {
  it('ouvre le détail Objectifs réel et expose unknown sans action directionnelle', async () => {
    const user = userEvent.setup();
    renderPage(createClient('unknown'));

    await user.click(screen.getByRole('button', { name: 'Examiner les différences' }));

    expect(screen.getByRole('heading', { name: 'Objectifs' })).toBeInTheDocument();
    expect(screen.getByText('unknown — origine indéterminée')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Réconcilier les objectifs' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Synchroniser les objectifs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conserver cet appareil' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Utiliser le cloud' })).not.toBeInTheDocument();
  });

  it('ouvre le détail Objectifs réel et expose both sans aucune résolution', async () => {
    const user = userEvent.setup();
    renderPage(createClient('both'));

    await user.click(screen.getByRole('button', { name: 'Examiner les différences' }));

    expect(screen.getByRole('heading', { name: 'Objectifs' })).toBeInTheDocument();
    expect(screen.getByText('both — modifications des deux côtés')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Synchroniser les objectifs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réconcilier les objectifs' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conserver cet appareil' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Utiliser le cloud' })).not.toBeInTheDocument();
  });
});
