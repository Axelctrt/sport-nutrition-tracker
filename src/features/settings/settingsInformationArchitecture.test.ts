import { routePaths } from '@/app/routePaths';
import {
  settingsCategories,
  settingsCategoryForPath,
} from '@/features/settings/settingsInformationArchitecture';

describe('settingsInformationArchitecture', () => {
  it('déclare neuf catégories utilisateur avec une route unique', () => {
    expect(settingsCategories).toHaveLength(9);
    expect(new Set(settingsCategories.map((category) => category.path)).size).toBe(9);
  });

  it('résout une catégorie depuis sa route dédiée', () => {
    expect(settingsCategoryForPath(routePaths.settingsDataBackup)).toMatchObject({
      id: 'data-backup',
      title: 'Données, sauvegardes et export',
    });
    expect(settingsCategoryForPath('/settings/inconnue')).toBeUndefined();
  });
});
