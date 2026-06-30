import {
  filterSettingsSections,
  normalizeSettingsSearch,
  openSettingsSection,
} from '@/features/settings/settingsSectionNavigation';

describe('settingsSectionNavigation', () => {
  it('normalise les accents et les espaces', () => {
    expect(
      normalizeSettingsSearch('  Dépense Énergétique  '),
    ).toBe('depense energetique');
  });

  it('recherche dans le libellé, la description et les mots-clés', () => {
    const sections = [
      {
        id: 'theme',
        label: 'Thèmes',
        description: 'Palettes visuelles',
        keywords: ['apparence'],
      },
      {
        id: 'backup',
        label: 'Sauvegarde',
        description: 'Exporter un fichier JSON',
        keywords: ['restauration'],
      },
    ];

    expect(
      filterSettingsSections(sections, 'apparence'),
    ).toEqual([sections[0]]);
    expect(
      filterSettingsSections(sections, 'json'),
    ).toEqual([sections[1]]);
  });

  it('ouvre immédiatement l’accordéon ciblé et le centre', () => {
    const target = document.createElement('details');
    target.id = 'settings-themes';
    target.scrollIntoView = vi.fn();
    document.body.append(target);

    window.history.replaceState({}, '', '/#/settings');

    openSettingsSection('settings-themes');

    expect(target.open).toBe(true);
    expect(window.location.hash).toBe('#/settings');
    expect(target.scrollIntoView).toHaveBeenCalledWith({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });

    target.remove();
  });
});
