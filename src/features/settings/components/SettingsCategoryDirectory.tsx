import {
  Bell,
  Bot,
  Calculator,
  DatabaseBackup,
  Info,
  MonitorSmartphone,
  Palette,
  Search,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import type { SettingsCategoryDefinition, SettingsCategoryId } from '@/features/settings/settingsInformationArchitecture';
import { normalizeSettingsSearch } from '@/features/settings/settingsSectionNavigation';
import { inputClassName } from '@/shared/forms/formStyles';
import { Card } from '@/shared/ui/Card';

const categoryIcons: Record<SettingsCategoryId, LucideIcon> = {
  'profile-objectives': UserRound,
  'account-sync': MonitorSmartphone,
  'privacy-friends': ShieldCheck,
  'appearance-accessibility': Palette,
  'notifications-routines': Bell,
  'nutrition-calculations': Calculator,
  'ai-permissions': Bot,
  'data-backup': DatabaseBackup,
  about: Info,
};

export interface SettingsCategoryDirectoryItem extends SettingsCategoryDefinition {
  summary: string;
  actionRequired?: boolean;
}

interface SettingsCategoryDirectoryProps {
  categories: readonly SettingsCategoryDirectoryItem[];
}

export function SettingsCategoryDirectory({ categories }: SettingsCategoryDirectoryProps) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const normalizedQuery = normalizeSettingsSearch(query);
    if (!normalizedQuery) return [...categories];

    return categories.filter((category) =>
      normalizeSettingsSearch([
        category.title,
        category.description,
        category.summary,
        ...category.keywords,
      ].join(' ')).includes(normalizedQuery),
    );
  }, [categories, query]);

  return (
    <section aria-labelledby="settings-directory-title">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="settings-directory-title" className="text-xl font-bold text-slate-950 dark:text-white">
            Toutes les catégories
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Les réglages sont regroupés selon leur usage, avec leur état actuel.
          </p>
        </div>
      </div>

      <label className="relative mt-4 block">
        <span className="sr-only">Rechercher dans les paramètres</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex. synchronisation, thème, sauvegarde…"
          className={`${inputClassName} pl-10`}
        />
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((category) => {
          const Icon = categoryIcons[category.id];
          return (
            <Link key={category.id} to={category.path} className="group block min-w-0">
              <Card className="h-full p-4 transition group-hover:border-brand-400 group-hover:bg-brand-50/50 group-focus-visible:ring-2 group-focus-visible:ring-brand-500 dark:group-hover:border-brand-700 dark:group-hover:bg-brand-950/20 motion-reduce:transition-none">
                <div className="flex items-start gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="font-bold text-slate-950 dark:text-white">{category.title}</span>
                      {category.actionRequired ? (
                        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                          Action requise
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {category.description}
                    </span>
                    <span className="mt-3 block text-sm font-semibold text-brand-700 dark:text-brand-300">
                      {category.summary}
                    </span>
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <Card className="mt-4 border-dashed p-5 text-center text-sm text-slate-600 dark:text-slate-300">
          Aucun réglage ne correspond à cette recherche.
        </Card>
      ) : null}
    </section>
  );
}
