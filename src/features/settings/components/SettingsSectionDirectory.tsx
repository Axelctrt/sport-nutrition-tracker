import { Search, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  filterSettingsSections,
  openSettingsSection,
  type SettingsSectionTarget,
} from '@/features/settings/settingsSectionNavigation';
import { inputClassName } from '@/shared/forms/formStyles';
import { Card } from '@/shared/ui/Card';

export interface SettingsDirectoryItem
  extends SettingsSectionTarget {
  icon: LucideIcon;
}

interface SettingsSectionDirectoryProps {
  sections: readonly SettingsDirectoryItem[];
  title?: string;
}

export function SettingsSectionDirectory({
  sections,
  title = 'Trouver un réglage',
}: SettingsSectionDirectoryProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => filterSettingsSections(sections, query),
    [query, sections],
  );

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <SlidersHorizontal
          aria-hidden="true"
          className="size-5 text-brand-700 dark:text-brand-300"
        />
        <div>
          <h2 className="font-bold text-slate-950 dark:text-white">
            {title}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Recherche une rubrique ou ouvre-la directement.
          </p>
        </div>
      </div>

      <label className="relative mt-4 block">
        <span className="sr-only">
          Rechercher dans les paramètres
        </span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex. thème, calories, sauvegarde…"
          className={`${inputClassName} pl-10`}
        />
      </label>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map(
          ({ id, label, description, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openSettingsSection(id)}
              className="flex min-h-20 items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-400 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-slate-700 dark:hover:border-brand-700 dark:hover:bg-brand-950/30 motion-reduce:transition-none"
            >
              <Icon
                aria-hidden="true"
                className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300"
              />
              <span>
                <span className="block font-semibold text-slate-950 dark:text-white">
                  {label}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {description}
                </span>
              </span>
            </button>
          ),
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Aucune rubrique ne correspond à cette recherche.
        </p>
      ) : null}
    </Card>
  );
}
