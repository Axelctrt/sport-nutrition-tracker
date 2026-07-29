import { createPortal } from 'react-dom';
import { useEffect, useMemo, useState } from 'react';

import { routePaths } from '@/app/routePaths';
import { router } from '@/app/router';

type FriendsSectionId = 'feed' | 'friends' | 'requests' | 'profile' | 'diagnostic';

interface FriendsSectionDefinition {
  id: FriendsSectionId;
  label: string;
  shortLabel: string;
  headingPatterns: readonly RegExp[];
}

const definitions: readonly FriendsSectionDefinition[] = [
  {
    id: 'feed',
    label: 'Fil d’activité',
    shortLabel: 'Fil',
    headingPatterns: [/fil d’activité/i, /activité de tes amis/i],
  },
  {
    id: 'friends',
    label: 'Mes amis',
    shortLabel: 'Amis',
    headingPatterns: [/mes amis/i, /amis enregistrés/i],
  },
  {
    id: 'requests',
    label: 'Demandes d’amis',
    shortLabel: 'Demandes',
    headingPatterns: [/envoyer une invitation/i, /demandes reçues/i, /demandes d’amis/i],
  },
  {
    id: 'profile',
    label: 'Mon profil social',
    shortLabel: 'Mon profil',
    headingPatterns: [/mon identifiant sportpilot/i, /confidentialité/i],
  },
  {
    id: 'diagnostic',
    label: 'Diagnostic social',
    shortLabel: 'Diagnostic',
    headingPatterns: [/préparation cloud/i, /diagnostic/i, /disponibilité cloud/i],
  },
] as const;

function findSection(root: HTMLElement, definition: FriendsSectionDefinition): HTMLElement | undefined {
  const headings = Array.from(root.querySelectorAll<HTMLElement>('h2, h3'));
  const heading = headings.find((candidate) =>
    definition.headingPatterns.some((pattern) => pattern.test(candidate.textContent ?? '')),
  );
  if (!heading) return undefined;
  return heading.closest<HTMLElement>('.sp-card, section, [data-friends-panel]')
    ?? heading.parentElement
    ?? undefined;
}

function resolveSections(root: HTMLElement): Partial<Record<FriendsSectionId, HTMLElement>> {
  return Object.fromEntries(
    definitions.flatMap((definition) => {
      const section = findSection(root, definition);
      if (!section) return [];
      section.id = `friends-section-${definition.id}`;
      section.dataset.friendsPanel = definition.id;
      return [[definition.id, section]];
    }),
  ) as Partial<Record<FriendsSectionId, HTMLElement>>;
}

export function FriendsSectionNavigation() {
  const [pathname, setPathname] = useState(() => router.state.location.pathname);
  const [portalTarget, setPortalTarget] = useState<HTMLElement>();
  const [sections, setSections] = useState<Partial<Record<FriendsSectionId, HTMLElement>>>({});
  const [activeSection, setActiveSection] = useState<FriendsSectionId>('feed');

  useEffect(() => router.subscribe((state) => setPathname(state.location.pathname)), []);

  useEffect(() => {
    if (pathname !== routePaths.friends) {
      setPortalTarget(undefined);
      setSections({});
      return undefined;
    }

    let disposed = false;
    let observer: MutationObserver | undefined;
    let retryTimer = 0;

    const prepare = () => {
      if (disposed) return;
      const root = document.querySelector<HTMLElement>('[aria-labelledby="friends-title"]');
      if (!root) {
        retryTimer = window.setTimeout(prepare, 100);
        return;
      }

      let mount = root.querySelector<HTMLElement>('[data-friends-section-navigation]');
      if (!mount) {
        mount = document.createElement('div');
        mount.dataset.friendsSectionNavigation = '';
        root.firstElementChild?.insertAdjacentElement('afterend', mount);
      }

      setPortalTarget(mount);
      setSections(resolveSections(root));
      observer = new MutationObserver(() => setSections(resolveSections(root)));
      observer.observe(root, { childList: true, subtree: true });
    };

    prepare();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      observer?.disconnect();
      document.querySelector<HTMLElement>('[data-friends-section-navigation]')?.remove();
    };
  }, [pathname]);

  const availableDefinitions = useMemo(
    () => definitions.filter((definition) => sections[definition.id]),
    [sections],
  );

  if (!portalTarget || availableDefinitions.length === 0) return null;

  return createPortal(
    <nav
      aria-label="Rubriques Amis"
      className="sticky top-2 z-30 my-3 overflow-x-auto rounded-2xl border border-[var(--sp-border-subtle)] bg-[color-mix(in_srgb,var(--sp-surface-card)_94%,transparent)] p-1.5 shadow-[var(--sp-shadow-card)] backdrop-blur-xl"
    >
      <div className="grid min-w-[31rem] grid-cols-5 gap-1">
        {availableDefinitions.map((definition) => {
          const selected = activeSection === definition.id;
          return (
            <button
              aria-current={selected ? 'page' : undefined}
              aria-label={definition.label}
              className={`min-h-11 rounded-xl px-3 text-sm font-semibold transition active:scale-[0.98] ${
                selected
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
              key={definition.id}
              onClick={() => {
                setActiveSection(definition.id);
                sections[definition.id]?.scrollIntoView({
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
                  block: 'start',
                });
              }}
              type="button"
            >
              {definition.shortLabel}
            </button>
          );
        })}
      </div>
    </nav>,
    portalTarget,
  );
}
