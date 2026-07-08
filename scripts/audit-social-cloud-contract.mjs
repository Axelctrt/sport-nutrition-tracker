import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/domain/friends/socialCloudContract.ts',
  'src/infrastructure/sync-prototype/syncPrototypeConfig.ts',
  'src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts',
  'src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts',
  'functions/api/social-directory/lookup.js',
  'functions/api/social-friend-requests/send.js',
  'functions/api/social-friends/friendships.js',
  'functions/api/social-activity-feed/index.js',
  'migrations/0001_social_activity_snapshots_0_29_0.sql',
  'migrations/0002_social_friend_permission_fields_0_29_0.sql',
]) needFile(path);

const contract = read('src/domain/friends/socialCloudContract.ts');
const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
const publicConfig = read('src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts');
const runtime = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');

for (const value of [
  'SOCIAL_CLOUD_CONTRACT_VERSION',
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
  'rawActivityExport',
  'globalUserDirectory',
  'publicSuggestions',
]) need(contract, value, 'contrat cloud incomplet');

for (const value of [
  'VITE_ENABLE_REAL_SOCIAL_CLOUD',
  'mergeSyncPrototypeProductionEnvironment',
  'realSocialCloudEnabled',
  'readEnabledFlag',
]) need(config, value, 'configuration cloud incomplète');
need(publicConfig, "VITE_ENABLE_REAL_SOCIAL_CLOUD: 'false'", 'défaut public prudent absent');
need(runtime, 'SYNC_PROTOTYPE_DATABASE_VERSION = 14', 'runtime cloud v14 absent');
for (const collection of [
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
]) need(runtime, collection, 'collection runtime absente');

if (contract.includes('socialRawActivities') || runtime.includes('socialRawActivities')) {
  failures.push('la collection socialRawActivities est interdite');
}

if (failures.length) {
  console.error('Audit contrat cloud social échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit contrat cloud social réussi : activation hébergeur, runtime v14, routes Pages et collections filtrées sont cohérents.');
