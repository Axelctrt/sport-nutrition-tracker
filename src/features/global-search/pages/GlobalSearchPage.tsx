import {
  Activity,
  Apple,
  Clock3,
  Dumbbell,
  History,
  LoaderCircle,
  Search,
  Scale,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  buildGlobalSearchIndex,
  searchGlobalIndex,
  type GlobalSearchCategory,
  type GlobalSearchCategoryFilter,
  type GlobalSearchResult,
} from '@/application/search/globalSearchService';
import {
  clearRecentSearches,
  loadRecentSearches,
  rememberRecentSearch,
  type RecentSearchStorage,
} from '@/application/search/recentSearches';
import { GLOBAL_SEARCH_FOCUS_EVENT } from '@/app/search/GlobalSearchShortcut';
import { appDatabase } from '@/infrastructure/database/database';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface GlobalSearchPageProps {
  loadIndex?: () => Promise<GlobalSearchResult[]>;
  recentStorage?: RecentSearchStorage;
}

interface CategoryDefinition {
  id: GlobalSearchCategory;
  label: string;
  icon: LucideIcon;
}

const categories: CategoryDefinition[] = [
  {
    id: 'activity',
    label: 'Activités',
    icon: Activity,
  },
  {
    id: 'foodProduct',
    label: 'Aliments',
    icon: Apple,
  },
  {
    id: 'recipe',
    label: 'Recettes',
    icon: UtensilsCrossed,
  },
  {
    id: 'favoriteMeal',
    label: 'Repas favoris',
    icon: UtensilsCrossed,
  },
  {
    id: 'workoutSession',
    label: 'Séances',
    icon: Dumbbell,
  },
  {
    id: 'workoutTemplate',
    label: 'Modèles',
    icon: Dumbbell,
  },
  {
    id: 'exercise',
    label: 'Exercices',
    icon: Activity,
  },
  {
    id: 'weight',
    label: 'Pesées',
    icon: Scale,
  },
];

const categoryById = new Map(
  categories.map((category) => [
    category.id,
    category,
  ]),
);

export function GlobalSearchPage({
  loadIndex = () => buildGlobalSearchIndex(appDatabase),
  recentStorage,
}: GlobalSearchPageProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] =
    useState<GlobalSearchCategoryFilter>('all');
  const [index, setIndex] = useState<GlobalSearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState(() =>
    loadRecentSearches(recentStorage),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const loaded = await loadIndex();
        if (active) setIndex(loaded);
      } catch (error) {
        if (active) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'La recherche locale n’a pas pu être préparée.',
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loadIndex]);

  useEffect(() => {
    const focusInput = () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener(
      GLOBAL_SEARCH_FOCUS_EVENT,
      focusInput,
    );

    return () => {
      window.removeEventListener(
        GLOBAL_SEARCH_FOCUS_EVENT,
        focusInput,
      );
    };
  }, []);

  const allResults = useMemo(
    () => searchGlobalIndex(index, query),
    [index, query],
  );

  const results = useMemo(
    () => searchGlobalIndex(index, query, category),
    [category, index, query],
  );

  const categoryCounts = useMemo(() => {
    const counts = new Map<GlobalSearchCategory, number>();

    for (const result of allResults) {
      counts.set(
        result.category,
        (counts.get(result.category) ?? 0) + 1,
      );
    }

    return counts;
  }, [allResults]);

  const normalizedQuery = query.trim();
  const canSearch = normalizedQuery.length >= 2;

  const rememberQuery = () => {
    if (!canSearch) return;

    setRecentSearches(
      rememberRecentSearch(
        normalizedQuery,
        recentStorage,
      ),
    );
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const params = new URLSearchParams();

    if (canSearch) {
      params.set('q', normalizedQuery);
      rememberQuery();
    }

    setSearchParams(params, { replace: true });
  };

  const resetSearch = () => {
    setQuery('');
    setCategory('all');
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  };

  return (
    <section
      aria-labelledby="global-search-title"
      className="min-w-0"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Navigation rapide
        </p>
        <h1
          id="global-search-title"
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
        >
          Recherche globale
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          Retrouve tes séances, activités, aliments, recettes,
          repas favoris, exercices et pesées sans parcourir
          chaque écran.
        </p>

        <form
          className="mt-5 flex flex-col gap-2 sm:flex-row"
          onSubmit={handleSubmit}
        >
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">
              Rechercher dans SportPilot
            </span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={inputRef}
              type="search"
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Séance push, banane, course, 60,2 kg…"
              className="min-h-12 w-full rounded-2xl border border-slate-300 bg-white py-3 pl-12 pr-12 text-base text-slate-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-200 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:focus:ring-brand-900"
            />
            {query ? (
              <button
                type="button"
                aria-label="Effacer la recherche"
                onClick={resetSearch}
                className="absolute right-2 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            ) : null}
          </label>

          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 font-semibold text-white hover:bg-brand-700"
          >
            <Search aria-hidden="true" className="size-5" />
            Rechercher
          </button>
        </form>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Raccourci : Ctrl/⌘ + K ou / hors d’un champ de saisie.
        </p>
      </div>

      {errorMessage ? (
        <InlineNotice
          className="mt-4"
          tone="error"
          title="Recherche indisponible"
          role="alert"
        >
          {errorMessage}
        </InlineNotice>
      ) : null}

      {isLoading ? (
        <Card
          className="mt-4 flex items-center gap-3 p-5"
          role="status"
          aria-label="Préparation de la recherche"
        >
          <LoaderCircle
            aria-hidden="true"
            className="size-5 animate-spin"
          />
          Préparation de l’index local…
        </Card>
      ) : null}

      {!isLoading && !canSearch ? (
        <Card className="mt-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <History
              aria-hidden="true"
              className="size-5 text-brand-700 dark:text-brand-300"
            />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Recherches récentes
            </h2>
          </div>

          {recentSearches.length > 0 ? (
            <>
              <div className="mt-4 flex flex-wrap gap-2">
                {recentSearches.map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    onClick={() => {
                      setQuery(recent);
                      setCategory('all');
                    }}
                    className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                  >
                    {recent}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => {
                  clearRecentSearches(recentStorage);
                  setRecentSearches([]);
                }}
                className="mt-4 text-sm font-semibold text-red-700 dark:text-red-300"
              >
                Effacer les recherches récentes
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Tes dernières recherches apparaîtront ici,
              uniquement sur cet appareil.
            </p>
          )}
        </Card>
      ) : null}

      {!isLoading && canSearch ? (
        <>
          <div
            className="mt-4 flex gap-2 overflow-x-auto pb-2"
            aria-label="Filtrer les résultats"
          >
            <button
              type="button"
              aria-pressed={category === 'all'}
              onClick={() => setCategory('all')}
              className={[
                'min-h-11 shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold',
                category === 'all'
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-slate-300 text-slate-800 dark:border-slate-700 dark:text-slate-100',
              ].join(' ')}
            >
              Tout ({allResults.length})
            </button>

            {categories
              .filter(
                ({ id }) =>
                  (categoryCounts.get(id) ?? 0) > 0 ||
                  category === id,
              )
              .map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={category === id}
                  onClick={() => setCategory(id)}
                  className={[
                    'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold',
                    category === id
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-slate-300 text-slate-800 dark:border-slate-700 dark:text-slate-100',
                  ].join(' ')}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {label} ({categoryCounts.get(id) ?? 0})
                </button>
              ))}
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p
              className="text-sm text-slate-600 dark:text-slate-300"
              aria-live="polite"
            >
              {results.length} résultat(s) pour « {normalizedQuery} »
            </p>
          </div>

          {results.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {results.map((result) => {
                const definition = categoryById.get(
                  result.category,
                );
                const Icon = definition?.icon ?? Search;

                return (
                  <li key={`${result.category}:${result.id}`}>
                    <Link
                      to={result.path}
                      onClick={rememberQuery}
                      className="flex min-h-20 items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        <Icon
                          aria-hidden="true"
                          className="size-5"
                        />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                          {definition?.label ?? result.category}
                        </span>
                        <span className="mt-1 block font-semibold text-slate-950 dark:text-white">
                          {result.title}
                        </span>
                        {result.subtitle ? (
                          <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                            {result.subtitle}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Card className="mt-3 p-8 text-center">
              <Clock3
                aria-hidden="true"
                className="mx-auto size-8 text-slate-400"
              />
              <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">
                Aucun résultat
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Essaie un autre mot, une date, un poids, un type
                de séance ou retire le filtre actuel.
              </p>
            </Card>
          )}
        </>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
        L’index est construit depuis IndexedDB sur cet appareil.
        Aucune requête ni donnée de recherche n’est envoyée à un
        serveur.
      </p>
    </section>
  );
}
