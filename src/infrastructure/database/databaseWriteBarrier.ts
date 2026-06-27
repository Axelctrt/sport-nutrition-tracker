import type Dexie from 'dexie';

const DEFAULT_DATABASE_IDLE_TIMEOUT_MS = 15_000;
const pendingDatabaseWrites = new Set<Promise<unknown>>();

export class DatabaseIdleTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Les écritures locales ne se sont pas terminées dans le délai de ${timeoutMs} ms.`);
    this.name = 'DatabaseIdleTimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new DatabaseIdleTimeoutError(timeoutMs)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  });
}

export function trackDatabaseWrite<T>(action: () => Promise<T>): Promise<T> {
  const trackedPromise = Promise.resolve().then(action);
  pendingDatabaseWrites.add(trackedPromise);

  const removePendingWrite = () => {
    pendingDatabaseWrites.delete(trackedPromise);
  };

  trackedPromise.then(removePendingWrite, removePendingWrite);
  return trackedPromise;
}

export function getPendingDatabaseWriteCount(): number {
  return pendingDatabaseWrites.size;
}

export async function waitForPendingDatabaseWrites(
  timeoutMs = DEFAULT_DATABASE_IDLE_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (pendingDatabaseWrites.size > 0) {
    const remainingTime = deadline - Date.now();
    if (remainingTime <= 0) throw new DatabaseIdleTimeoutError(timeoutMs);

    const currentWrites = [...pendingDatabaseWrites];
    await withTimeout(
      Promise.allSettled(currentWrites).then(() => undefined),
      remainingTime,
    );
  }
}

export async function waitForDatabaseIdle(
  database: Dexie,
  timeoutMs = DEFAULT_DATABASE_IDLE_TIMEOUT_MS,
): Promise<void> {
  const startedAt = Date.now();
  await waitForPendingDatabaseWrites(timeoutMs);

  const remainingTime = timeoutMs - (Date.now() - startedAt);
  if (remainingTime <= 0) throw new DatabaseIdleTimeoutError(timeoutMs);

  if (!database.isOpen()) await withTimeout(database.open(), remainingTime);

  const transactionTimeout = timeoutMs - (Date.now() - startedAt);
  if (transactionTimeout <= 0) throw new DatabaseIdleTimeoutError(timeoutMs);

  await withTimeout(
    database.transaction('rw!', database.tables, async () => undefined),
    transactionTimeout,
  );
}
