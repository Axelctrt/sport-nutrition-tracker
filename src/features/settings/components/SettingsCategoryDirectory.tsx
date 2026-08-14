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

import type { SettingsCategoryDefinition, SettingsCategoryId } from '@/features/settings/settingsInformationArchitecture';
import { SettingsNavigationCard } from '@/features/settings/components/SettingsNavigationCard';
import { normalizeSettingsSearch } from '@/features/settings/settingsSectionNavigation';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';

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
  const isDirectoryUnavailable = categories.length === 0;
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
          <h2
            id="settings-directory-title"
            className="text-xl font-bold text-[var(--sp-text-primary)]"
          >
            Toutes les catégories
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
            Les réglages sont regroupés selon leur usage, avec leur état actuel.
          </p>
        </div>
      </div>

      <label className="relative mt-4 block">
        <span className="sr-only">Rechercher dans les paramètres</span>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sp-text-muted)]"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Ex. synchronisation, thème, sauvegarde…"
          className={`${inputClassName} pl-10`}
        />
      </label>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((category) => (
          <SettingsNavigationCard
            key={category.id}
            to={category.path}
            title={category.title}
            description={category.description}
            icon={categoryIcons[category.id]}
            value={category.summary}
            actionRequired={category.actionRequired ?? false}
            showArrow={false}
          />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Search}
          variant={isDirectoryUnavailable ? 'unavailable' : 'filtered'}
          title={
            isDirectoryUnavailable
              ? 'Aucune catégorie disponible'
              : 'Aucun réglage trouvé'
          }
          description={
            isDirectoryUnavailable
              ? 'Les catégories de réglages ne sont pas disponibles actuellement.'
              : 'Efface la recherche pour afficher de nouveau toutes les catégories.'
          }
          primaryAction={
            isDirectoryUnavailable ? undefined : (
              <Button onClick={() => setQuery('')}>Effacer la recherche</Button>
            )
          }
        />
      ) : null}
    </section>
  );
}
