export const RECENT_SEARCHES_STORAGE_KEY =
  'sportpilot.globalSearch.recent';
export const MAX_RECENT_SEARCHES = 8;

export interface RecentSearchStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function browserStorage(): RecentSearchStorage | undefined {
  if (typeof window === 'undefined') return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function normalizeRecentQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}

export function loadRecentSearches(
  storage: RecentSearchStorage | undefined = browserStorage(),
): string[] {
  if (!storage) return [];

  try {
    const parsed = JSON.parse(
      storage.getItem(RECENT_SEARCHES_STORAGE_KEY) ?? '[]',
    );

    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (value): value is string =>
          typeof value === 'string' &&
          normalizeRecentQuery(value).length >= 2,
      )
      .map(normalizeRecentQuery)
      .slice(0, MAX_RECENT_SEARCHES);
  } catch {
    return [];
  }
}

export function rememberRecentSearch(
  query: string,
  storage: RecentSearchStorage | undefined = browserStorage(),
): string[] {
  const normalized = normalizeRecentQuery(query);

  if (normalized.length < 2 || !storage) {
    return loadRecentSearches(storage);
  }

  const previous = loadRecentSearches(storage);
  const next = [
    normalized,
    ...previous.filter(
      (value) =>
        value.toLocaleLowerCase('fr') !==
        normalized.toLocaleLowerCase('fr'),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  try {
    storage.setItem(
      RECENT_SEARCHES_STORAGE_KEY,
      JSON.stringify(next),
    );
  } catch {
    return previous;
  }

  return next;
}

export function clearRecentSearches(
  storage: RecentSearchStorage | undefined = browserStorage(),
): void {
  try {
    storage?.removeItem(RECENT_SEARCHES_STORAGE_KEY);
  } catch {
    // L’historique local reste facultatif.
  }
}
