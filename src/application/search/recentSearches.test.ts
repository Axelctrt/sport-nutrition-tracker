import {
  clearRecentSearches,
  loadRecentSearches,
  RECENT_SEARCHES_STORAGE_KEY,
  rememberRecentSearch,
  type RecentSearchStorage,
} from '@/application/search/recentSearches';

function memoryStorage(): RecentSearchStorage & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('recentSearches', () => {
  it('mémorise, déduplique et place la recherche récente en premier', () => {
    const storage = memoryStorage();

    rememberRecentSearch('Banane', storage);
    rememberRecentSearch('Séance push', storage);
    rememberRecentSearch(' banane ', storage);

    expect(loadRecentSearches(storage)).toEqual([
      'banane',
      'Séance push',
    ]);
  });

  it('ignore les recherches trop courtes', () => {
    const storage = memoryStorage();

    rememberRecentSearch('a', storage);

    expect(
      storage.values.has(RECENT_SEARCHES_STORAGE_KEY),
    ).toBe(false);
  });

  it('efface l’historique local', () => {
    const storage = memoryStorage();

    rememberRecentSearch('recette', storage);
    clearRecentSearches(storage);

    expect(loadRecentSearches(storage)).toEqual([]);
  });
});
