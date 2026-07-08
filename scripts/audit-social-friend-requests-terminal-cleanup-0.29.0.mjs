import fs from 'node:fs';
const server = fs.readFileSync('functions/_shared/socialFriendRequests.js', 'utf8');
const page = fs.readFileSync('src/features/friends/pages/FriendsPrivacyPage.tsx', 'utf8');
const checks = [
  ["pending only", server.includes("AND status = 'pending'")],
  ["terminal deletion", server.includes('DELETE FROM social_friend_requests')],
  ["profiles", server.includes('readProfilesForRequests')],
  ["authoritative client sync", page.includes('synchronizeCloudFriendRequestsIntoSnapshot')],
  ["offline cache preservation", page.includes('Preserve the local request cache')],
];
for (const [label, ok] of checks) console.log(`${ok ? 'OK' : 'FAIL'} - ${label}`);
if (checks.some(([, ok]) => !ok)) process.exit(1);
