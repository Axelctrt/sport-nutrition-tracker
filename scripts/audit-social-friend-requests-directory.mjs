import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'functions/_shared/socialFriendRequests.js',
  'functions/api/social-friend-requests/send.js',
  'functions/api/social-friend-requests/incoming.js',
  'functions/api/social-friend-requests/outgoing.js',
  'functions/api/social-friend-requests/update-status.js',
  'src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts',
  'src/infrastructure/sync-prototype/socialFriendRequestsGateway.test.ts',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`F3 social friend requests : fichier manquant ${file}`);
  }
}

const shared = readFileSync('functions/_shared/socialFriendRequests.js', 'utf8');
for (const marker of [
  'CREATE TABLE IF NOT EXISTS social_friend_requests',
  'CREATE TABLE IF NOT EXISTS social_friendships',
  'handleSocialFriendRequestSendRequest',
  'handleSocialFriendRequestIncomingRequest',
  'handleSocialFriendRequestUpdateStatusRequest',
]) {
  if (!shared.includes(marker)) {
    throw new Error(`F3 social friend requests : marqueur serveur manquant ${marker}`);
  }
}

const runtime = readFileSync('src/infrastructure/sync-prototype/realSocialCloudFriendRequestService.ts', 'utf8');
if (!runtime.includes('createSocialFriendRequestsClient')) {
  throw new Error('F3 social friend requests : runtime non branché sur l’annuaire serveur des demandes.');
}

const page = readFileSync('src/features/friends/pages/FriendsPrivacyPage.tsx', 'utf8');
for (const marker of [
  'listIncomingRequests(loadedIdentity.userId)',
  'mergeCloudFriendRequestsIntoSnapshot',
  "respondToIncomingRequest(request, 'accepted')",
]) {
  if (!page.includes(marker)) {
    throw new Error(`F3 social friend requests : intégration UI manquante ${marker}`);
  }
}

console.log('Audit social friend requests directory OK');
