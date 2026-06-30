import type Dexie from 'dexie';

import { trackDatabaseWrite } from '@/infrastructure/database/databaseWriteBarrier';
import { applyPwaUpdate } from '@/pwa/applyPwaUpdate';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((currentResolve) => {
    resolve = currentResolve;
  });

  return { promise, resolve };
}

function createDatabase(
  transaction: (
    mode: string,
    tables: unknown[],
    scope: () => Promise<void>,
  ) => Promise<void>,
): Dexie {
  return {
    isOpen: () => true,
    open: vi.fn(async () => undefined),
    tables: [],
    transaction,
  } as unknown as Dexie;
}

function createServiceWorkerTarget(): EventTarget & ServiceWorkerContainer {
  return new EventTarget() as EventTarget & ServiceWorkerContainer;
}

describe('applyPwaUpdate', () => {
  it('attend les écritures, la prise de contrôle puis recharge une seule fois', async () => {
    const events: string[] = [];
    const writeGate = deferred();
    const serviceWorker = createServiceWorkerTarget();
    const write = trackDatabaseWrite(async () => {
      events.push('write:start');
      await writeGate.promise;
      events.push('write:end');
    });
    const database = createDatabase(async (_mode, _tables, scope) => {
      events.push('database:idle');
      await scope();
    });
    const updateServiceWorker = vi.fn(async (reloadPage?: boolean) => {
      events.push(`update:${String(reloadPage)}`);
      serviceWorker.dispatchEvent(new Event('controllerchange'));
    });

    const update = applyPwaUpdate(updateServiceWorker, database, {
      serviceWorker,
      reloadPage: () => events.push('reload'),
    });
    await Promise.resolve();

    expect(updateServiceWorker).not.toHaveBeenCalled();

    writeGate.resolve();
    await write;
    await update;

    expect(events).toEqual([
      'write:start',
      'write:end',
      'database:idle',
      'update:false',
      'reload',
    ]);
  });

  it('ne déclenche pas le service worker si la base ne devient pas disponible', async () => {
    const database = createDatabase(async () => {
      throw new Error('transaction bloquée');
    });
    const updateServiceWorker = vi.fn(async () => undefined);

    await expect(
      applyPwaUpdate(updateServiceWorker, database, {
        serviceWorker: createServiceWorkerTarget(),
        reloadPage: vi.fn(),
      }),
    ).rejects.toThrow('transaction bloquée');
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it('annule le rechargement si le nouveau worker ne prend pas le contrôle', async () => {
    const database = createDatabase(async (_mode, _tables, scope) => {
      await scope();
    });
    const updateServiceWorker = vi.fn(async () => undefined);
    const reloadPage = vi.fn();

    await expect(
      applyPwaUpdate(updateServiceWorker, database, {
        serviceWorker: createServiceWorkerTarget(),
        reloadPage,
        controllerChangeTimeoutMs: 1,
      }),
    ).rejects.toThrow('n’a pas pris le contrôle');

    expect(updateServiceWorker).toHaveBeenCalledWith(false);
    expect(reloadPage).not.toHaveBeenCalled();
  });
});
