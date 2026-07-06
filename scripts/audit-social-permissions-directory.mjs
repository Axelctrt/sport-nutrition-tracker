import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'functions/_shared/socialFriends.js',
  'functions/api/social-friends/friendships.js',
  'functions/api/social-friends/permissions.js',
  'functions/api/social-friends/permissions/save.js',
  'src/infrastructure/sync-prototype/socialFriendsGateway.ts',
  'src/infrastructure/sync-prototype/socialFriendsGateway.test.ts',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Audit social permissions directory KO : fichier manquant ${file}`);
  }
}

const shared = readFileSync('functions/_shared/socialFriends.js', 'utf8');
for (const expected of [
  'social_friendships',
  'social_friend_permissions',
  'SOCIAL_DIRECTORY_DB',
  'Permission refusée : ces deux comptes ne sont pas amis actifs.',
  'Le détail nécessite un consentement explicite accordé.',
]) {
  if (!shared.includes(expected)) {
    throw new Error(`Audit social permissions directory KO : contrat serveur absent ${expected}`);
  }
}

const page = readFileSync('src/features/friends/pages/FriendsPrivacyPage.tsx', 'utf8');
for (const expected of [
  'createSocialFriendsGateway',
  'initialSnapshot || socialFriendsGateway || cloudFriendshipPort || cloudFriendPermissionPort',
  'ensureFriendActivityPermissions',
  'mergeCloudFriendshipsIntoSnapshot',
  'updateFriendPermission',
  'resolveCloudFriendUserId',
  'getCloudFriendshipCounterpartUserId',
  'savePermission(identity.userId, cloudPermission)',
]) {
  if (!page.includes(expected)) {
    throw new Error(`Audit social permissions directory KO : intégration UI absente ${expected}`);
  }
}


const cloudFriendship = readFileSync('src/domain/friends/socialCloudFriendship.ts', 'utf8');
for (const expected of [
  'findExistingFriendIndex',
  'normalizeFriendHandle(candidate.handle) === normalizeFriendHandle(friend.handle)',
]) {
  if (!cloudFriendship.includes(expected)) {
    throw new Error(`Audit social permissions directory KO : merge friendship cloud non robuste ${expected}`);
  }
}

console.log('Audit social permissions directory OK');
