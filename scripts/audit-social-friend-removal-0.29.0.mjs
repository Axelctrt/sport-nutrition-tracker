import fs from 'node:fs';

const checks = [
  [
    'server remove endpoint exists',
    fs.existsSync('functions/api/social-friends/remove.js'),
  ],
  [
    'server marks friendship removed',
    fs.readFileSync('functions/_shared/socialFriends.js', 'utf8').includes("SET status = 'removed'"),
  ],
  [
    'server deletes bilateral permissions',
    fs.readFileSync('functions/_shared/socialFriends.js', 'utf8').includes('DELETE FROM social_friend_permissions'),
  ],
  [
    'gateway exposes removeFriendship',
    fs.readFileSync('src/infrastructure/sync-prototype/socialFriendsGateway.ts', 'utf8').includes('removeFriendship'),
  ],
  [
    'domain removes friend from snapshot',
    fs.readFileSync('src/domain/friends/friendship.ts', 'utf8').includes('removeFriendFromSnapshot'),
  ],
  [
    'page provides remove action',
    fs.readFileSync('src/features/friends/pages/FriendsPrivacyPage.tsx', 'utf8').includes('Supprimer cet ami'),
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
