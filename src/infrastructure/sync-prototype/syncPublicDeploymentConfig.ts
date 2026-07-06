/**
 * Configuration publique intégrée au client de production.
 *
 * Ces valeurs sont nécessairement visibles dans le bundle navigateur.
 * Aucune clé privée, aucun jeton et aucun secret Dexie Cloud ne doit être ajouté ici.
 *
 * Elles servent de garde-fou de production. Les variables VITE_* définies par
 * l’hébergeur gardent la priorité pour permettre une activation contrôlée par
 * environnement Cloudflare Preview/Production.
 */
export const syncPublicDeploymentConfig = Object.freeze({
  VITE_ENABLE_SYNC_PROTOTYPE: 'true',
  VITE_DEXIE_CLOUD_DATABASE_URL: 'https://zhnyk8met.dexie.cloud',
  VITE_ENABLE_REAL_WEIGHT_SYNC: 'true',
  VITE_ENABLE_REAL_ACTIVITY_SYNC: 'true',
  VITE_ENABLE_REAL_GOAL_SYNC: 'true',
  VITE_ENABLE_REAL_STRENGTH_SYNC: 'true',
  VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC: 'true',
  VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC: 'true',
  VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC: 'true',
  VITE_ENABLE_REAL_ACCOUNT_PREFERENCES_SYNC: 'true',
  VITE_ENABLE_REAL_REWARDS_ROUTINES_SYNC: 'true',
  // Désactivé par défaut : l’ouverture réelle se pilote par variable d’environnement.
  VITE_ENABLE_REAL_SOCIAL_CLOUD: 'false',
  VITE_ENABLE_SYNC_DIAGNOSTICS: 'false',
} as const);
