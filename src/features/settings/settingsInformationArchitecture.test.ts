import {
  settingsCategories,
  settingsHomeCategories,
} from '@/features/settings/settingsInformationArchitecture';

describe('settingsInformationArchitecture', () => {
  it('expose cinq catégories principales sans perdre les routes historiques', () => {
    expect(settingsHomeCategories.map((category) => category.title)).toEqual([
      'Profil et objectifs',
      'Compte et synchronisation',
      'Apparence, notifications et routines',
      'Confidentialité et données',
      'À propos et réglages avancés',
    ]);

    expect(new Set(settingsHomeCategories.map((category) => category.path)).size).toBe(5);
    expect(settingsCategories).toHaveLength(9);
    expect(settingsCategories.map((category) => category.id)).toEqual(expect.arrayContaining([
      'privacy-friends',
      'notifications-routines',
      'nutrition-calculations',
      'ai-permissions',
    ]));
  });
});
