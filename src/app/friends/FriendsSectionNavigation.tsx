export type FriendsSectionId = 'feed' | 'friends' | 'requests' | 'profile';

interface FriendsSectionNavigationProps {
  activeSection: FriendsSectionId;
  incomingRequestCount: number;
  onSelect: (section: FriendsSectionId) => void;
}

const sections: readonly {
  id: FriendsSectionId;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'feed', label: 'Fil d’activité', shortLabel: 'Fil' },
  { id: 'friends', label: 'Mes amis', shortLabel: 'Amis' },
  { id: 'requests', label: 'Demandes d’amis', shortLabel: 'Demandes' },
  { id: 'profile', label: 'Mon profil social', shortLabel: 'Mon profil' },
] as const;

export function FriendsSectionNavigation({
  activeSection,
  incomingRequestCount,
  onSelect,
}: FriendsSectionNavigationProps) {
  return (
    <nav
      aria-label="Rubriques Amis"
      className="sticky top-2 z-30 overflow-x-auto rounded-xl border border-[var(--sp-border-subtle)] bg-[color-mix(in_srgb,var(--sp-surface-card)_94%,transparent)] p-1.5 shadow-[var(--sp-shadow-card)] backdrop-blur-xl"
    >
      <div className="grid grid-cols-4 gap-1">
        {sections.map((section) => {
          const selected = activeSection === section.id;
          const badgeCount = section.id === 'requests' ? incomingRequestCount : 0;
          return (
            <button
              aria-current={selected ? 'page' : undefined}
              aria-controls={`friends-panel-${section.id}`}
              aria-label={section.label}
              className={`flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition active:scale-[0.98] ${
                selected
                  ? 'bg-brand-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              key={section.id}
              onClick={() => onSelect(section.id)}
              type="button"
            >
              <span>{section.shortLabel}</span>
              {badgeCount > 0 ? (
                <span
                  aria-label={`${badgeCount} demande${badgeCount > 1 ? 's' : ''} à traiter`}
                  className={selected
                    ? 'min-w-5 rounded-full bg-white px-1.5 py-0.5 text-xs text-brand-800'
                    : 'min-w-5 rounded-full bg-brand-100 px-1.5 py-0.5 text-xs text-brand-800 dark:bg-brand-950 dark:text-brand-200'}
                >
                  {badgeCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
