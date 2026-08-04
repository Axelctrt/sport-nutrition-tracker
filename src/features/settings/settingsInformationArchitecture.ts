import { routePaths } from '@/app/routePaths';

export type SettingsCategoryId =
  | 'profile-objectives'
  | 'account-sync'
  | 'privacy-friends'
  | 'appearance-accessibility'
  | 'notifications-routines'
  | 'nutrition-calculations'
  | 'ai-permissions'
  | 'data-backup'
  | 'about';

export interface SettingsCategoryDefinition {
  id: SettingsCategoryId;
  path: string;
  title: string;
  description: string;
  keywords: readonly string[];
}

export const settingsCategories: readonly SettingsCategoryDefinition[] = [
  {
    id: 'profile-objectives',
    path: routePaths.settingsProfileObjectives,
    title: 'Profil et objectif nutritionnel',
    description: 'Informations personnelles, poids, calories, macros et objectif nutritionnel.',
    keywords: ['profil', 'poids', 'taille', 'objectif', 'nutrition', 'macros', 'activité'],
  },
  {
    id: 'account-sync',
    path: routePaths.settingsAccountSync,
    title: 'Compte et synchronisation',
    description: 'Compte actif, appareils, sauvegarde cloud et état de synchronisation.',
    keywords: ['compte', 'appareil', 'cloud', 'synchronisation', 'hors ligne'],
  },
  {
    id: 'privacy-friends',
    path: routePaths.settingsPrivacyFriends,
    title: 'Confidentialité et amis',
    description: 'Identité sociale, amis et permissions de partage.',
    keywords: ['amis', 'confidentialité', 'partage', 'pseudonyme', 'social'],
  },
  {
    id: 'appearance-accessibility',
    path: routePaths.settingsAppearanceAccessibility,
    title: 'Apparence et accessibilité',
    description: 'Thème, tableau de bord, densité et confort de lecture.',
    keywords: ['thème', 'sombre', 'clair', 'accessibilité', 'tableau de bord'],
  },
  {
    id: 'notifications-routines',
    path: routePaths.settingsNotificationsRoutines,
    title: 'Notifications, rappels et routines',
    description: 'Rappels, routines, minuteur de repos et motivation.',
    keywords: ['notification', 'rappel', 'routine', 'repos', 'vibration', 'son'],
  },
  {
    id: 'nutrition-calculations',
    path: routePaths.settingsNutritionCalculations,
    title: 'Nutrition et calculs',
    description: 'Dépense, coefficients, MET et calibration hebdomadaire.',
    keywords: ['nutrition', 'calories', 'met', 'pas', 'calibration', 'calculs'],
  },
  {
    id: 'ai-permissions',
    path: routePaths.settingsAiPermissions,
    title: 'Autorisations et intelligence artificielle',
    description: 'Analyse photo, consentement et traitement des images.',
    keywords: ['ia', 'photo', 'autorisation', 'consentement', 'image'],
  },
  {
    id: 'data-backup',
    path: routePaths.settingsDataBackup,
    title: 'Données, sauvegardes et export',
    description: 'Stockage, sauvegarde, restauration, export et suppression.',
    keywords: ['données', 'sauvegarde', 'restauration', 'export', 'import', 'stockage'],
  },
  {
    id: 'about',
    path: routePaths.settingsAbout,
    title: 'À propos de SportPilot',
    description: 'Version, confidentialité et documentation des calculs.',
    keywords: ['version', 'à propos', 'confidentialité', 'calculs', 'informations'],
  },
] as const;

export const settingsHomeCategories: readonly SettingsCategoryDefinition[] = [
  {
    id: 'profile-objectives',
    path: routePaths.settingsProfileObjectives,
    title: 'Profil et objectif nutritionnel',
    description: 'Informations personnelles, poids, calories, macros et objectif nutritionnel.',
    keywords: ['profil', 'poids', 'taille', 'objectif', 'nutrition', 'macros', 'activité'],
  },
  {
    id: 'account-sync',
    path: routePaths.settingsAccountSync,
    title: 'Compte et synchronisation',
    description: 'Compte actif, appareils et sauvegarde cloud.',
    keywords: ['compte', 'appareil', 'cloud', 'synchronisation', 'hors ligne'],
  },
  {
    id: 'appearance-accessibility',
    path: routePaths.settingsAppearanceAccessibility,
    title: 'Apparence, notifications et routines',
    description: 'Thème, confort de lecture, rappels et habitudes.',
    keywords: ['thème', 'accessibilité', 'notification', 'rappel', 'routine'],
  },
  {
    id: 'data-backup',
    path: routePaths.settingsDataBackup,
    title: 'Confidentialité et données',
    description: 'Amis, autorisations, sauvegardes, export et suppression.',
    keywords: ['amis', 'confidentialité', 'partage', 'ia', 'sauvegarde', 'export'],
  },
  {
    id: 'about',
    path: routePaths.settingsAbout,
    title: 'À propos et réglages avancés',
    description: 'Version, informations et outils destinés aux usages avancés.',
    keywords: ['version', 'à propos', 'diagnostic', 'avancé'],
  },
] as const;

export function settingsCategoryForPath(pathname: string): SettingsCategoryDefinition | undefined {
  return settingsCategories.find((category) => category.path === pathname);
}
