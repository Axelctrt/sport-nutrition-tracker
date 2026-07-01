import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NutritionLibrarySyncSettingsPanel } from '@/features/settings/components/NutritionLibrarySyncSettingsPanel';
import {
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

function createClient() {
  const listeners = new Set<() => void>();
  let snapshot: SyncPrototypeSnapshot = {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      email: 'sportpilot@example.com',
    },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realNutritionLibrary: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };

  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealNutritionLibrary = vi.fn(async () => {
    const preview = {
      localProductCount: 2,
      cloudProductCount: 1,
      localRecipeCount: 1,
      cloudRecipeCount: 0,
      localFavoriteMealCount: 1,
      cloudFavoriteMealCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 1,
    };
    snapshot = {
      ...snapshot,
      realNutritionLibrary: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealNutritionLibrary = vi.fn(async () => {
    const preview = {
      localProductCount: 2,
      cloudProductCount: 2,
      localRecipeCount: 1,
      cloudRecipeCount: 1,
      localFavoriteMealCount: 1,
      cloudFavoriteMealCount: 1,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    };
    const result = {
      ...preview,
      uploadedProducts: 1,
      downloadedProducts: 0,
      uploadedRecipes: 1,
      downloadedRecipes: 0,
      uploadedFavoriteMeals: 1,
      downloadedFavoriteMeals: 0,
      removedLocalEntities: 0,
      removedCloudEntities: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      remappedProductReferences: 0,
      completedAt: '2026-07-01T12:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realNutritionLibrary: {
        enabled: true,
        status: 'ready',
        preview,
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
      remappedProductReferences: 0,
      completedAt: '2026-07-01T12:00:00.000Z',
    })),
    analyzeRealNutritionLibrary,
    syncRealNutritionLibrary,
    saveWeight: vi.fn(async () => {
      throw new Error('Non utilisé');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return {
    client,
    analyzeRealNutritionLibrary,
    syncRealNutritionLibrary,
  };
}

describe('NutritionLibrarySyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque C2 est indisponible', () => {
    render(
      <MemoryRouter>
        <NutritionLibrarySyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Bibliothèque nutritionnelle non activée'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'Gérer le compte de synchronisation',
    })).toHaveAttribute('href', '/settings/sync-prototype');
  });

  it('analyse puis synchronise la bibliothèque après confirmation', async () => {
    const user = userEvent.setup();
    const {
      client,
      analyzeRealNutritionLibrary,
      syncRealNutritionLibrary,
    } = createClient();

    render(
      <MemoryRouter>
        <NutritionLibrarySyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(client.initialize).toHaveBeenCalledTimes(1),
    );

    await user.click(screen.getByRole('button', {
      name: 'Analyser sans modifier',
    }));

    await waitFor(() =>
      expect(analyzeRealNutritionLibrary).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('1 élément diffère entre cet appareil et le cloud.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Synchroniser la bibliothèque nutritionnelle',
    }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() =>
      expect(syncRealNutritionLibrary).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('3 éléments mis à jour et 0 suppression appliquée.'),
    ).toBeInTheDocument();
  });
});
