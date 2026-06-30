import type Dexie from 'dexie';

import { appDatabase } from '@/infrastructure/database/database';
import { waitForDatabaseIdle } from '@/infrastructure/database/databaseWriteBarrier';

export type UpdateServiceWorker = (reloadPage?: boolean) => Promise<void>;

type ServiceWorkerControllerChangeTarget = Pick<
  ServiceWorkerContainer,
  'addEventListener' | 'removeEventListener'
>;

interface ApplyPwaUpdateOptions {
  serviceWorker?: ServiceWorkerControllerChangeTarget;
  reloadPage?: () => void;
  controllerChangeTimeoutMs?: number;
}

interface ControllerChangeWaiter {
  promise: Promise<void>;
  cancel: () => void;
}

const DEFAULT_CONTROLLER_CHANGE_TIMEOUT_MS = 30_000;

function resolveServiceWorkerContainer(): ServiceWorkerControllerChangeTarget {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    throw new Error('Le service worker est indisponible dans ce navigateur.');
  }

  return navigator.serviceWorker;
}

function reloadCurrentPage(): void {
  if (typeof window === 'undefined') {
    throw new Error('Le rechargement de la page est indisponible.');
  }

  window.location.reload();
}

function createControllerChangeWaiter(
  serviceWorker: ServiceWorkerControllerChangeTarget,
  timeoutMs: number,
): ControllerChangeWaiter {
  let settled = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let resolvePromise!: () => void;
  let rejectPromise!: (reason: Error) => void;

  const cleanup = () => {
    serviceWorker.removeEventListener('controllerchange', onControllerChange);
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  };

  const onControllerChange: EventListener = () => {
    if (settled) return;
    settled = true;
    cleanup();
    resolvePromise();
  };

  const promise = new Promise<void>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;

    serviceWorker.addEventListener('controllerchange', onControllerChange, {
      once: true,
    });

    timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      rejectPromise(
        new Error(
          'Le nouveau service worker n’a pas pris le contrôle dans le délai prévu.',
        ),
      );
    }, timeoutMs);
  });

  return {
    promise,
    cancel: () => {
      if (settled) return;
      settled = true;
      cleanup();
    },
  };
}

export async function applyPwaUpdate(
  updateServiceWorker: UpdateServiceWorker,
  database: Dexie = appDatabase,
  options: ApplyPwaUpdateOptions = {},
): Promise<void> {
  await waitForDatabaseIdle(database);

  const serviceWorker =
    options.serviceWorker ?? resolveServiceWorkerContainer();
  const controllerChange = createControllerChangeWaiter(
    serviceWorker,
    options.controllerChangeTimeoutMs ??
      DEFAULT_CONTROLLER_CHANGE_TIMEOUT_MS,
  );

  try {
    // Depuis vite-plugin-pwa 0.13.2, le paramètre de rechargement est ignoré.
    // Le rechargement est donc piloté explicitement après controllerchange.
    await updateServiceWorker(false);
    await controllerChange.promise;
  } catch (error) {
    controllerChange.cancel();
    throw error;
  }

  (options.reloadPage ?? reloadCurrentPage)();
}
