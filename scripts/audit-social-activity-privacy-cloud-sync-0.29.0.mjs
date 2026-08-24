import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/u, '');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit social activity privacy cloud sync 0.29.0 A10 échoué : ${message}`);
};

const requiredFiles = [
  'src/infrastructure/sync-prototype/socialActivityPrivacySyncEvents.ts',
  'src/app/socialActivityPrivacyCloudSyncReadiness.test.ts',
  'docs/architecture/social-activity-feed-0.29.0-a10.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const aggregate = read('src/infrastructure/sync-prototype/realAccountPreferencesSyncService.ts');
const privacyRepository = read('src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts');
const identityRepository = read('src/infrastructure/repositories/dexie/DexieSocialIdentityRepository.ts');
const privacyPage = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const coordinator = read('src/app/sync/AutomaticSyncCoordinator.tsx');
const backupSchemas = read('src/infrastructure/backup/backupSchemas.ts');
const appVersions = read('src/infrastructure/database/migrations/versions.ts');
const syncDatabase = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');

for (const token of [
  'SyncedSocialProfileVisibility',
  'SyncedSocialActivitySharingPreferences',
  'socialProfileVisibility',
  'socialActivitySharing',
  'validateSocialActivityGlobalSharingPolicy',
  'notifySocialActivityPrivacyChanged',
]) {
  assert(aggregate.includes(token), `agrégat de préférences incomplet : ${token}`);
}

assert(privacyRepository.includes('profileVisibilityUpdatedAt'), 'horodatage de visibilité absent.');
assert(privacyRepository.includes('socialActivitySharingPolicyUpdatedAt'), 'horodatage de politique absent.');
assert(identityRepository.includes('...(existing ?? {})'), 'l’identité sociale ne préserve pas la ligne de confidentialité.');
assert(privacyPage.includes("notifySyncLocalDataChanged(['account-preferences']"), 'les changements locaux ne déclenchent pas la synchronisation automatique.');
assert(privacyPage.includes('refreshPrivacyFromCloud'), 'la page ouverte ne recharge pas une politique reçue du cloud.');
assert(coordinator.includes('reconcileRuntimeSocialActivityPrivacy'), 'les snapshots existants ne sont pas réconciliés après téléchargement.');
assert(backupSchemas.includes('profileVisibilityUpdatedAt: isoDateTimeSchema.optional()'), 'les sauvegardes ne valident pas le nouvel horodatage de visibilité.');
assert(backupSchemas.includes('socialActivitySharingPolicyUpdatedAt: isoDateTimeSchema.optional()'), 'les sauvegardes ne valident pas le nouvel horodatage de politique.');
assert(appVersions.includes('CURRENT_DATABASE_VERSION = DATABASE_VERSION_12'), 'la version Dexie principale attendue v12 est absente.');
assert(syncDatabase.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 18'), 'la version du prototype cloud attendue est absente.');

console.log('Audit social activity privacy cloud sync 0.29.0 A10 OK');
