import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/domain/friends/socialActivitySnapshotContract.ts',
  'src/domain/friends/socialCloudActivitySnapshot.ts',
  'src/application/friends/socialActivityProjectionService.ts',
  'src/application/friends/socialActivityPublicationService.ts',
  'src/domain/friends/socialActivitySnapshotOutbox.ts',
  'functions/_shared/socialActivitySnapshots.js',
  'migrations/0001_social_activity_snapshots_0_29_0.sql',
  'migrations/0002_social_friend_permission_fields_0_29_0.sql',
]) needFile(path);

const contract = read('src/domain/friends/socialActivitySnapshotContract.ts');
const cloud = read('src/domain/friends/socialCloudActivitySnapshot.ts');
const projection = read('src/application/friends/socialActivityProjectionService.ts');
const publication = read('src/application/friends/socialActivityPublicationService.ts');
const outbox = read('src/domain/friends/socialActivitySnapshotOutbox.ts');
const server = read('functions/_shared/socialActivitySnapshots.js');

need(contract, "SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION = '0.29.0-a3'", 'contrat snapshot absent');
need(outbox, "SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION = '0.29.0-a4'", 'version outbox absente');
for (const value of ['rawActivityShared: false', 'ownerUserId', 'publishedForUserId']) {
  need(cloud, value, 'snapshot cloud incomplet');
}
for (const value of [
  'projectStoredActivityToSocialSnapshotV2',
  'projectCompletedStrengthSessionToSocialSnapshotV2',
]) {
  need(projection, value, 'projection sociale incomplète');
}
for (const value of [
  'socialActivityGlobalPolicyFromFriendsPrivacy',
  'reconcilePublicationPlans',
  'reconcileStoredActivitySocialSnapshots',
  'reconcileCompletedStrengthSessionSocialSnapshots',
  'removePublishedSocialActivitySnapshots',
  'reconcileSocialActivitySnapshot',
]) {
  need(publication, value, 'publication sociale incomplète');
}
for (const value of [
  'authenticateRequest',
  'redactSnapshotToSummary',
  'redactSnapshotToFieldSelection',
  'listFeed',
  'readSnapshotDetail',
  'field_selection_json',
]) need(server, value, 'serveur snapshot incomplet');

for (const forbidden of ['privateNotes', 'socialRawActivities']) {
  if (cloud.includes(forbidden)) failures.push(`champ ou table brute interdite : ${forbidden}`);
}

if (failures.length) {
  console.error('Audit snapshots sociaux échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit snapshots sociaux réussi : contrat filtré, outbox, redaction serveur, détail et migrations D1 sont présents.');
