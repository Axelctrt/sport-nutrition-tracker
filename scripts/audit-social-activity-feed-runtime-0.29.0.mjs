import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/u, '');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit social activity feed 0.29.0 A7 échoué : ${message}`);
};

const requiredFiles = [
  'src/domain/friends/socialActivityCloudFeed.ts',
  'src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts',
  'src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.test.ts',
  'src/features/friends/components/SocialActivityFeedPanel.tsx',
  'src/features/friends/components/SocialActivityFeedPanel.test.tsx',
  'src/features/friends/components/SocialActivityDetailDialog.tsx',
  'src/features/friends/components/SocialActivityFeedCard.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'functions/_shared/socialActivitySnapshots.js',
  'functions/_shared/socialActivitySnapshots.test.mjs',
  'docs/architecture/social-activity-feed-0.29.0-a7.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const server = read('functions/_shared/socialActivitySnapshots.js');
for (const token of [
  'ownerProfile',
  'social_directory_handles',
  'detailAvailable',
  'nextCursor',
  'readSnapshotDetail',
]) {
  assert(server.includes(token), `lecture serveur incomplète : ${token}`);
}
assert(server.includes('const { detail: _detail, ...cardSnapshot } = snapshot;'), 'le bloc detail doit être retiré des cartes.');

const gateway = read('src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts');
for (const token of [
  '/api/social-activity-feed',
  '/api/social-activity-snapshots/detail',
  'authorization: `Bearer ${credentials.accessToken}`',
  'validateSocialActivitySnapshotV2',
  'nextCursor',
]) {
  assert(gateway.includes(token), `gateway de lecture incomplet : ${token}`);
}

const panel = read('src/features/friends/components/SocialActivityFeedPanel.tsx');
const dialog = read('src/features/friends/components/SocialActivityDetailDialog.tsx');
const feedCard = read('src/features/friends/components/SocialActivityFeedCard.tsx');
for (const token of [
  'Afficher plus d’activités',
  'Mode hors ligne',
  'subscribeCredentials',
]) {
  assert(panel.includes(token), `interface mobile-first incomplète : ${token}`);
}
assert(feedCard.includes('Voir le détail autorisé'), 'la carte ne permet pas d’ouvrir le détail autorisé.');
for (const token of ['role="dialog"', 'max-h-[92dvh]', 'aria-modal="true"']) {
  assert(dialog.includes(token), `dialogue mobile-first incomplet : ${token}`);
}
assert(!panel.includes('sourceActivityId}'), 'un identifiant source ne doit pas être affiché dans l’interface.');
assert(!panel.includes('recipientUserId}'), 'un identifiant destinataire ne doit pas être affiché dans l’interface.');

const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
assert(page.includes('SocialActivityFeedPanel'), 'la page Amis ne branche pas le fil cloud A7.');
assert(page.includes('createSocialActivityFeedCloudGateway'), 'le gateway cloud A7 n’est pas instancié en production.');
assert(page.includes('subscribeRuntimeSocialActivityFeed'), 'les changements de session ne relancent pas le fil.');

console.log('Audit social activity feed 0.29.0 A7 OK');
