import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/domain/friends/socialCloudActivitySnapshot.ts',
  'src/infrastructure/sync-prototype/realSocialCloudActivitySnapshotService.ts',
  'src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts',
  'functions/_shared/socialActivitySnapshots.js',
  'functions/api/social-activity-snapshots/sync.js',
  'functions/api/social-activity-snapshots/detail.js',
  'functions/api/social-activity-feed/index.js',
]) needFile(path);

const domain = read('src/domain/friends/socialCloudActivitySnapshot.ts');
const runtime = read('src/infrastructure/sync-prototype/realSocialCloudActivitySnapshotService.ts');
const gateway = read('src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts');
const server = read('functions/_shared/socialActivitySnapshots.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

for (const value of [
  'rawActivityShared: false',
  'ownerUserId',
  'publishedForUserId',
  'filterCloudSocialActivitySnapshotsForFeed',
]) need(domain, value, 'contrat snapshot cloud incomplet');
for (const value of ['createRuntimeSocialCloudActivitySnapshotPort', 'socialActivitySnapshots']) {
  need(runtime, value, 'runtime snapshot cloud incomplet');
}
for (const value of [
  "cache: 'no-store'",
  'authorization: `Bearer ${credentials.accessToken}`',
  'listPage',
  'readDetail',
]) need(gateway, value, 'gateway du feed cloud incomplet');
for (const value of [
  'authenticateRequest',
  'redactSnapshotToSummary',
  'redactSnapshotToFieldSelection',
  'handleSocialActivityFeedRequest',
  'handleSocialActivitySnapshotDetailRequest',
]) need(server, value, 'serveur snapshot cloud incomplet');
for (const value of [
  'SocialActivityFeedPanel',
  'shouldUseCloudActivityFeed',
  "section === 'feed'",
]) {
  need(page, value, 'garde-fou visible du feed absent');
}
if (domain.includes('socialRawActivities') || runtime.includes('socialRawActivities')) {
  failures.push('aucune table socialRawActivities ne doit exister');
}

if (failures.length) {
  console.error('Audit snapshots sociaux cloud échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit snapshots sociaux cloud réussi : publication filtrée, feed no-store, détail autorisé et absence d’activité brute sont vérifiés.');
