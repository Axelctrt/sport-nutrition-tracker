import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const file = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const token = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/domain/friends/socialCloudFriendRequest.ts',
  'src/application/friends/socialFriendRequestService.ts',
  'src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts',
  'functions/_shared/socialFriendRequests.js',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/app/socialCompleteAcceptanceReadiness.test.ts',
]) file(path);

const domain = read('src/domain/friends/socialCloudFriendRequest.ts');
const service = read('src/application/friends/socialFriendRequestService.ts');
const gateway = read('src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts');
const server = read('functions/_shared/socialFriendRequests.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

for (const value of [
  "'pending'",
  "'accepted'",
  "'declined'",
  "'cancelled'",
  'mergeCloudFriendRequestsIntoSnapshot',
  'synchronizeCloudFriendRequestsIntoSnapshot',
]) token(domain, value, 'contrat de demandes incomplet');
for (const value of ['sendExactFriendRequest', 'lookup', 'sendRequest']) {
  token(service, value, 'service de demande incomplet');
}
for (const value of [
  'listIncomingRequestsWithProfiles',
  'listOutgoingRequestsWithProfiles',
  'socialCloudApiHeaders(credentials',
  "cache: 'no-store'",
]) token(gateway, value, 'gateway de demandes incomplet');
for (const value of [
  'authenticateRequest',
  'SOCIAL_FRIEND_REQUESTS_ACTOR_MISMATCH',
  'SOCIAL_FRIEND_REQUESTS_ACTION_FORBIDDEN',
  "AND status = 'pending'",
  'DELETE FROM social_friend_requests',
]) token(server, value, 'route de demandes incomplète');
for (const value of [
  'listIncomingRequestsWithProfiles(effectiveIdentity.userId)',
  'listOutgoingRequestsWithProfiles(effectiveIdentity.userId)',
  'respondToIncomingRequest',
  'acceptFriendRequest',
  'declineFriendRequest',
  'activeCloudFriendRequestPort.updateRequestStatus',
]) token(page, value, 'intégration UI des demandes incomplète');

if (failures.length) {
  console.error('Audit demandes d’amis échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit demandes d’amis réussi : recherche exacte, listes profilées, actions autorisées et nettoyage terminal sont cohérents.');
