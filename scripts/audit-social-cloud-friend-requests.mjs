import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/domain/friends/socialCloudFriendRequest.ts',
  'src/infrastructure/sync-prototype/realSocialCloudFriendRequestService.ts',
  'src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts',
  'functions/_shared/socialFriendRequests.js',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
]) needFile(path);

const domain = read('src/domain/friends/socialCloudFriendRequest.ts');
const runtime = read('src/infrastructure/sync-prototype/realSocialCloudFriendRequestService.ts');
const gateway = read('src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts');
const server = read('functions/_shared/socialFriendRequests.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

for (const value of ["'pending'", "'accepted'", "'declined'", "'cancelled'", 'requesterUserId', 'recipientUserId']) {
  need(domain, value, 'contrat cloud des demandes incomplet');
}
for (const value of ['createRuntimeSocialCloudFriendRequestPort', 'realSocialCloudEnabled']) {
  need(runtime, value, 'runtime cloud des demandes incomplet');
}
for (const value of ['sendRequest', 'listIncomingRequestsWithProfiles', 'updateRequestStatus']) {
  need(gateway, value, 'client cloud des demandes incomplet');
}
for (const value of [
  'authenticateRequest',
  'SOCIAL_FRIEND_REQUESTS_ACTOR_MISMATCH',
  'SOCIAL_FRIEND_REQUESTS_ACTION_FORBIDDEN',
  'DELETE FROM social_friend_requests',
]) need(server, value, 'serveur cloud des demandes incomplet');
need(page, 'activeCloudFriendRequestPort', 'port cloud non branché dans la page Amis');

if (failures.length) {
  console.error('Audit demandes d’amis cloud échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit demandes d’amis cloud réussi : contrats, runtime, API authentifiée et cycle terminal sont cohérents.');
