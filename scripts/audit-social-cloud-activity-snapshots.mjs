import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit snapshots sociaux cloud 0.28.0 F6 échoué : ${message}`);
};

const requiredFiles = [
  'src/domain/friends/socialCloudActivitySnapshot.ts',
  'src/domain/friends/socialCloudActivitySnapshot.test.ts',
  'src/application/friends/socialCloudActivitySnapshotService.ts',
  'src/application/friends/socialCloudActivitySnapshotService.test.ts',
  'src/infrastructure/sync-prototype/realSocialCloudActivitySnapshotService.ts',
  'src/infrastructure/sync-prototype/realSocialCloudActivitySnapshotService.test.ts',
  'src/app/socialCloudActivitySnapshotsReadiness.test.ts',
  'docs/architecture/social-cloud-activity-snapshots-0.28.0-f6.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const domain = read('src/domain/friends/socialCloudActivitySnapshot.ts');
for (const token of [
  'SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_CONTRACT_VERSION',
  '0.28.0-f6',
  'buildCloudSocialActivitySnapshotRecord',
  'filterCloudSocialActivitySnapshotsForFeed',
  'cloudSocialActivitySnapshotRecordToFeedSnapshot',
  'rawActivityShared: false',
  'relationshipKey: \'userId\'',
  'rawActivityCloudWrite',
  'globalUserDirectory',
  'messaging',
]) {
  assert(domain.includes(token), `domaine snapshots sociaux cloud incomplet : ${token} absent.`);
}
assert(!domain.includes('socialRawActivities'), 'F6 ne doit pas créer de flux d’activités brutes.');

const service = read('src/infrastructure/sync-prototype/realSocialCloudActivitySnapshotService.ts');
for (const token of [
  'createRealSocialCloudActivitySnapshotPort',
  'createRuntimeSocialCloudActivitySnapshotPort',
  'unavailableSocialCloudActivitySnapshotPort',
  'realSocialCloudEnabled',
  'socialActivitySnapshots',
  'publishedForUserId',
  'rawActivityShared === false',
]) {
  assert(service.includes(token), `service snapshots sociaux cloud incomplet : ${token} absent.`);
}
assert(!service.includes('fetch('), 'F6 ne doit pas ajouter d’appel HTTP direct.');
assert(!service.includes('XMLHttpRequest'), 'F6 ne doit pas ajouter d’appel réseau direct.');
assert(!service.includes('socialRawActivities'), 'F6 ne doit pas manipuler de table brute.');

const runtime = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const token of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 14',
  "'socialActivitySnapshots'",
  "socialActivitySnapshots: 'id, ownerUserId, publishedForUserId, sourceActivityId, activityType, date, scope, updatedAt",
  '[publishedForUserId+date]',
  '[ownerUserId+publishedForUserId]',
]) {
  assert(runtime.includes(token), `runtime Dexie Cloud F6 incomplet : ${token} absent.`);
}
assert(!runtime.includes('socialRawActivities'), 'le runtime ne doit pas créer de table socialRawActivities.');

const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
for (const token of [
  'Cloud social 0.28.0 F6',
  'Snapshots sociaux distants F6 prêts',
  'publication cloud de snapshots filtrés',
  'lecture des snapshots autorisés',
  'aucune activité brute',
  'aucun export brut',
]) {
  assert(page.includes(token), `page Amis F6 incomplète : ${token} absent.`);
}

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['audit:social-cloud-activity-snapshots'] === 'node scripts/audit-social-cloud-activity-snapshots.mjs', 'script npm audit:social-cloud-activity-snapshots manquant.');
assert(packageJson.scripts.check.includes('npm run audit:social-cloud-activity-snapshots'), 'npm run check doit inclure audit:social-cloud-activity-snapshots.');
assert(packageJson.scripts.ci.includes('npm run audit:social-cloud-activity-snapshots'), 'npm run ci doit inclure audit:social-cloud-activity-snapshots.');

const doc = read('docs/architecture/social-cloud-activity-snapshots-0.28.0-f6.md');
for (const token of [
  '0.28.0 F6',
  'snapshots sociaux distants',
  'publication cloud de snapshots filtrés',
  'lecture des snapshots autorisés',
  'userId',
  'résumé',
  'détail',
  'consentement explicite',
  'pas d’activité brute',
  'pas de feed brut',
]) {
  assert(doc.includes(token), `documentation F6 incomplète : ${token} absent.`);
}

console.log('Audit snapshots sociaux cloud 0.28.0 F6 OK');
