import fs from 'node:fs';

const friendsServer = fs.readFileSync('functions/_shared/socialFriends.js', 'utf8');
const friendsGateway = fs.readFileSync('src/infrastructure/sync-prototype/socialFriendsGateway.ts', 'utf8');
const friendshipDomain = fs.readFileSync('src/domain/friends/friendship.ts', 'utf8');
const privacyPage = fs.readFileSync('src/features/friends/pages/FriendsPrivacyPage.tsx', 'utf8');

const checks = [
  [
    'server remove endpoint exists',
    fs.existsSync('functions/api/social-friends/remove.js'),
  ],
  [
    'server marks friendship removed',
    friendsServer.includes("SET status = 'removed'"),
  ],
  [
    'server deletes bilateral permissions',
    friendsServer.includes('DELETE FROM social_friend_permissions'),
  ],
  [
    'gateway exposes removeFriendship',
    friendsGateway.includes('removeFriendship'),
  ],
  [
    'domain removes friend from snapshot',
    friendshipDomain.includes('removeFriendFromSnapshot'),
  ],
  [
    'page provides a confirmed remove action',
    privacyPage.includes('onClick={() => setPendingFriendRemoval(friend)}')
      && privacyPage.includes('<ConfirmationDialog')
      && privacyPage.includes('Supprimer ${pendingFriendRemoval.displayName} ?')
      && privacyPage.includes('confirmLabel="Supprimer l’ami"')
      && privacyPage.includes('void removeFriend(pendingFriendRemoval)'),
  ],
  [
    'A19 domain tests exist',
    fs.existsSync('src/domain/friends/friendship.a19.test.ts'),
  ],
  [
    'A19 server tests exist',
    fs.existsSync('functions/_shared/socialFriends.a19.test.mjs'),
  ],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'} - ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
