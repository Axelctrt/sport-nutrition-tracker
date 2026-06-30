export interface SettingsSectionTarget {
  id: string;
  label: string;
  description: string;
  keywords?: readonly string[];
}

export function normalizeSettingsSearch(
  value: string,
): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase('fr-FR');
}

export function filterSettingsSections<
  T extends SettingsSectionTarget,
>(
  sections: readonly T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeSettingsSearch(query);

  if (!normalizedQuery) return [...sections];

  return sections.filter((section) => {
    const haystack = normalizeSettingsSearch(
      [
        section.label,
        section.description,
        ...(section.keywords ?? []),
      ].join(' '),
    );

    return haystack.includes(normalizedQuery);
  });
}

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches ?? false
  );
}

function scrollToSettingsSection(
  sectionId: string,
): void {
  const element = document.getElementById(sectionId);

  if (!element?.scrollIntoView) return;

  element.scrollIntoView({
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    block: 'center',
    inline: 'nearest',
  });
}

export function openSettingsSection(sectionId: string): void {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(sectionId);

  if (
    element instanceof HTMLDetailsElement &&
    !element.open
  ) {
    element.open = true;
  }

  // Le routeur utilise déjà window.location.hash. Une ancre de section
  // remplacerait donc #/settings et provoquerait une page introuvable
  // au rechargement. La navigation interne reste volontairement locale.
  scrollToSettingsSection(sectionId);

  // Second positionnement après l’ouverture et le recalcul
  // de la hauteur de l’accordéon.
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      scrollToSettingsSection(sectionId);
    });
  });
}
