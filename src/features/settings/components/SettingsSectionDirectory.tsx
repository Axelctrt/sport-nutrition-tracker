import { Search, SlidersHorizontal, type LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import {
  filterSettingsSections,
  openSettingsSection,
  type SettingsSectionTarget,
} from '@/features/settings/settingsSectionNavigation';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';

export interface SettingsDirectoryItem
  extends SettingsSectionTarget {
  icon: LucideIcon;
}

interface SettingsSectionDirectoryProps {
  sections: readonly SettingsDirectoryItem[];
  title?: string;
  onOpenSection?: (sectionId: string) => void;
}

export function SettingsSectionDirectory({
  sections,
  title = 'Trouver un réglage',
  onOpenSection,
}: SettingsSectionDirectoryProps) {
  const [query, setQuery] = useState('');
  const isDirectoryUnavailable = sections.length === 0;
  const filtered = useMemo(
    () => filterSettingsSections(sections, query),
    [query, sections],
  );

  return (
    <Card padding="md">
      <div className="flex items-center gap-3">
        <SlidersHorizontal
          aria-hidden="true"
          className="size-5 text-[var(--sp-accent-primary)]"
        />
        <div>
          <h2 className="font-bold text-[var(--sp-text-primary)]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
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
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--sp-text-muted)]"
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
          ({ id, label, description, focusId, icon: Icon }) => (
            <Card key={id} variant="interactive" className="overflow-hidden">
              <button
                type="button"
                onClick={() => {
                  onOpenSection?.(id);
                  openSettingsSection(id, focusId);
                }}
                className="flex min-h-20 w-full items-start gap-3 p-3 text-left"
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-[var(--sp-accent-primary)]"
                />
                <span>
                  <span className="block font-semibold text-[var(--sp-text-primary)]">
                    {label}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[var(--sp-text-secondary)]">
                    {description}
                  </span>
                </span>
              </button>
            </Card>
          ),
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={Search}
          variant={isDirectoryUnavailable ? 'unavailable' : 'filtered'}
          title={
            isDirectoryUnavailable
              ? 'Aucune rubrique disponible'
              : 'Aucune rubrique trouvée'
          }
          description={
            isDirectoryUnavailable
              ? 'Les rubriques de réglages ne sont pas disponibles actuellement.'
              : 'Efface la recherche pour afficher de nouveau toutes les rubriques.'
          }
          primaryAction={
            isDirectoryUnavailable ? undefined : (
              <Button onClick={() => setQuery('')}>Effacer la recherche</Button>
            )
          }
        />
      ) : null}
    </Card>
  );
}
