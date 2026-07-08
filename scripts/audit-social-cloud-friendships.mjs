import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/domain/friends/socialCloudFriendship.ts',
  'src/infrastructure/sync-prototype/realSocialCloudFriendshipService.ts',
  'src/infrastructure/sync-prototype/socialFriendsGateway.ts',
  'functions/_shared/socialFriends.js',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'migrations/0002_social_friend_permission_fields_0_29_0.sql',
]) needFile(path);

const domain = read('src/domain/friends/socialCloudFriendship.ts');
const runtime = read('src/infrastructure/sync-prototype/realSocialCloudFriendshipService.ts');
const gateway = read('src/infrastructure/sync-prototype/socialFriendsGateway.ts');
const server = read('functions/_shared/socialFriends.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

for (const value of [
  'relationshipKey: \'userId\'',
  'defaultPermissionLevel: \'summary\'',
  'detailedRequiresConsent: true',
  'exposesRawActivity: false',
]) need(domain, value, 'contrat d’amitié cloud incomplet');
for (const value of ['createRuntimeSocialCloudFriendshipPort', 'createRuntimeSocialCloudFriendPermissionPort']) {
  need(runtime, value, 'runtime d’amitié cloud incomplet');
}
for (const value of [
  'listFriendshipsWithProfiles',
  'listPermissionsWithStatus',
  'savePermission',
  'removeFriendship',
  'socialCloudApiHeaders(credentials',
]) need(gateway, value, 'gateway d’amitiés incomplet');
for (const value of [
  'authenticateRequest',
  'SOCIAL_FRIENDS_ACTOR_MISMATCH',
  'SOCIAL_FRIENDS_PERMISSION_ID_MISMATCH',
  'SOCIAL_FRIENDS_FRIENDSHIP_ID_MISMATCH',
  "SET status = 'removed'",
  'DELETE FROM social_friend_permissions',
]) need(server, value, 'serveur d’amitiés incomplet');
for (const value of [
  'listFriendshipsWithProfiles(effectiveIdentity.userId)',
  'listPermissionsWithStatus(effectiveIdentity.userId)',
  'removeFriendshipFromServer(identity.userId, friendUserId)',
  'SocialActivityFriendSharingSettings',
]) need(page, value, 'intégration UI d’amitié incomplète');

if (failures.length) {
  console.error('Audit amitiés cloud échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit amitiés cloud réussi : relation bilatérale, permissions par direction, suppression et profils publics sont cohérents.');
