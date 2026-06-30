/**
 * Configuration publique intégrée au client de production.
 *
 * Ces valeurs sont nécessairement visibles dans le bundle navigateur.
 * Aucune clé privée, aucun jeton et aucun secret Dexie Cloud ne doit être ajouté ici.
 */
export const syncPublicDeploymentConfig = Object.freeze({
  VITE_ENABLE_SYNC_PROTOTYPE: 'true',
  VITE_DEXIE_CLOUD_DATABASE_URL: 'https://zhnyk8met.dexie.cloud',
  VITE_ENABLE_REAL_WEIGHT_SYNC: 'true',
  VITE_ENABLE_SYNC_DIAGNOSTICS: 'false',
} as const);
