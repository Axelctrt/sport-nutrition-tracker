import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/features/friends/components/SocialActivityFeedPanel.tsx',
  'src/features/friends/components/SocialActivityFeedCard.tsx',
  'src/features/friends/components/SocialActivityDetailDialog.tsx',
  'src/features/friends/components/SocialCardioActivityDetail.tsx',
  'src/features/friends/components/SocialStrengthActivityDetail.tsx',
  'src/domain/friends/socialActivityCloudFeed.ts',
  'src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts',
  'functions/_shared/socialActivitySnapshots.js',
  'src/app/socialActivityFeedFinalizationReadiness.test.ts',
]) needFile(path);

const panel = read('src/features/friends/components/SocialActivityFeedPanel.tsx');
const dialog = read('src/features/friends/components/SocialActivityDetailDialog.tsx');
const gateway = read('src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts');
const server = read('functions/_shared/socialActivitySnapshots.js');
const cloudFeed = read('src/domain/friends/socialActivityCloudFeed.ts');

for (const value of [
  'SocialActivityFeedCard',
  'SocialActivityDetailDialog',
  'isRefreshing',
  "window.addEventListener('online'",
  "loadPage('replace')",
  'normalizeSocialActivityFeedCards',
]) need(panel, value, 'fil social incomplet');
for (const value of ['role="dialog"', 'Les données non partagées ne sont pas envoyées à ton appareil.']) {
  need(dialog, value, 'fiche détaillée incomplète');
}
for (const value of [
  "cache: 'no-store'",
  'authorization: `Bearer ${credentials.accessToken}`',
  'listPage',
  'readDetail',
  'social_activity_detail_identity_mismatch',
]) need(gateway, value, 'gateway du fil incomplet');
for (const value of ['handleSocialActivityFeedRequest', 'handleSocialActivitySnapshotDetailRequest', 'readSnapshotDetail']) {
  need(server, value, 'API du fil incomplète');
}
need(cloudFeed, 'normalizeSocialActivityFeedCards', 'normalisation/déduplication absente');

if (failures.length) {
  console.error('Audit fil d’activité amis échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit fil d’activité amis réussi : cartes, déduplication, actualisation, reprise en ligne et détail sécurisé sont présents.');
