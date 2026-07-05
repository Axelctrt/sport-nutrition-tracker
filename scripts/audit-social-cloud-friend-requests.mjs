import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit demandes d’amis cloud 0.28.0 F4 échoué : ${message}`);
};

const requiredFiles = [
  'src/domain/friends/socialCloudFriendRequest.ts',
  'src/domain/friends/socialCloudFriendRequest.test.ts',
  'src/infrastructure/sync-prototype/realSocialCloudFriendRequestService.ts',
  'src/infrastructure/sync-prototype/realSocialCloudFriendRequestService.test.ts',
  'src/app/socialCloudFriendRequestsReadiness.test.ts',
  'docs/architecture/social-cloud-friend-requests-0.28.0-f4.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const domain = read('src/domain/friends/socialCloudFriendRequest.ts');
for (const token of [
  'SOCIAL_CLOUD_FRIEND_REQUEST_CONTRACT_VERSION',
  '0.28.0-f4',
  'buildCloudFriendRequest',
  'normalizeCloudFriendRequestForUser',
  'cloudFriendRequestToLocalRequest',
  'mergeCloudFriendRequestsIntoSnapshot',
  'handleBasedRelationship',
  'automaticFriendship',
  'globalUserDirectory',
  'publicSuggestions',
  'rawActivityExport',
  "relationshipKey: 'userId'",
  'createsFriendship: false',
  'exposesRawActivity: false',
]) {
  assert(domain.includes(token), `domaine demandes cloud incomplet : ${token} absent.`);
}
assert(!domain.includes('socialRawActivities'), 'F4 ne doit pas manipuler d’activités brutes.');

const service = read('src/infrastructure/sync-prototype/realSocialCloudFriendRequestService.ts');
for (const token of [
  'createRealSocialCloudFriendRequestPort',
  'createRuntimeSocialCloudFriendRequestPort',
  'unavailableSocialCloudFriendRequestPort',
  'sendRequest',
  'listIncomingRequests',
  'listOutgoingRequests',
  'updateRequestStatus',
  'realSocialCloudEnabled',
  'createCloudFriendRequestId',
]) {
  assert(service.includes(token), `service demandes cloud incomplet : ${token} absent.`);
}
assert(!service.includes('fetch('), 'F4 ne doit pas ajouter d’appel HTTP direct.');
assert(!service.includes('XMLHttpRequest'), 'F4 ne doit pas ajouter d’appel réseau direct.');
assert(!service.includes('createFriendship'), 'F4 ne doit pas créer automatiquement une amitié.');
assert(!service.includes('rawActivity'), 'F4 ne doit pas manipuler d’activité brute.');

const requestService = read('src/application/friends/socialFriendRequestService.ts');
for (const token of [
  'cloudFriendRequestPort',
  'buildCloudFriendRequest',
  'lookupExactSocialCloudUser',
]) {
  assert(requestService.includes(token), `service applicatif demandes incomplet : ${token} absent.`);
}
assert(requestService.indexOf('lookupExactSocialCloudUser') < requestService.indexOf('buildCloudFriendRequest'), 'la recherche exacte F3 doit précéder toute demande cloud F4.');
assert(!requestService.includes('lookupGateway.lookupByHandle'), 'les demandes ne doivent pas contourner la normalisation exacte F3.');

const runtime = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const token of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 13',
  "'socialFriendRequests'",
  "socialFriendRequests: 'id, requesterUserId, recipientUserId, status, requestedAt, updatedAt",
  '[recipientUserId+status]',
  '[requesterUserId+status]',
]) {
  assert(runtime.includes(token), `runtime Dexie Cloud F4 incomplet : ${token} absent.`);
}
assert(!runtime.includes('socialRawActivities'), 'le runtime ne doit pas créer de table socialRawActivities.');
assert(!runtime.includes('globalUserDirectory'), 'le runtime ne doit pas créer d’annuaire global.');

const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
assert(page.includes('Cloud social 0.28.0 F5'), 'la page Amis doit afficher la readiness F4.');
assert(page.includes('Amitiés cloud F5 prêtes'), 'la page doit mentionner les demandes cloud F4.');
assert(page.includes('userId distant'), 'la page doit rappeler que la relation vise un userId distant.');
assert(page.includes('détail uniquement après consentement explicite'), 'la page doit rappeler que le détail exige un consentement explicite en F5.');
assert(page.includes('aucun snapshot distant'), 'la page doit rappeler l’absence de snapshot distant en F4.');

const lookupAudit = read('scripts/audit-social-cloud-lookup.mjs');
assert(lookupAudit.includes('Cloud social 0.28.0 F5'), 'l’audit F3 doit accepter la readiness courante F5.');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['audit:social-cloud-friend-requests'] === 'node scripts/audit-social-cloud-friend-requests.mjs', 'script npm audit:social-cloud-friend-requests manquant.');
assert(packageJson.scripts.check.includes('npm run audit:social-cloud-friend-requests'), 'npm run check doit inclure audit:social-cloud-friend-requests.');
assert(packageJson.scripts.ci.includes('npm run audit:social-cloud-friend-requests'), 'npm run ci doit inclure audit:social-cloud-friend-requests.');

const doc = read('docs/architecture/social-cloud-friend-requests-0.28.0-f4.md');
for (const token of [
  '0.28.0 F4',
  'demandes d’amis cloud',
  'userId',
  'pending',
  'accepted',
  'declined',
  'cancelled',
  'pas d’annuaire public',
  'aucune suggestion',
  'aucune amitié automatique',
  'aucun snapshot distant',
  'aucun export brut',
]) {
  assert(doc.includes(token), `documentation F4 incomplète : ${token} absent.`);
}

console.log('Audit demandes d’amis cloud 0.28.0 F4 OK');
