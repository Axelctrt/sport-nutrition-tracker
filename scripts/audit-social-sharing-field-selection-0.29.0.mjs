import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(path, 'utf8');
}

const migration = read('migrations/0002_social_friend_permission_fields_0_29_0.sql');
const fieldSelection = read('functions/_shared/socialActivityFieldSelection.js');
const socialFriends = read('functions/_shared/socialFriends.js');
const snapshots = read('functions/_shared/socialActivitySnapshots.js');
const publication = read('src/application/friends/socialActivityPublicationService.ts');
const sharingSettings = read('src/features/friends/components/SocialActivitySharingSettings.tsx');
const privacyPage = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const friendship = read('src/domain/friends/friendship.ts');

const checks = [
  [
    'D1 migration adds field_selection_json',
    migration.includes('ADD COLUMN field_selection_json TEXT'),
  ],
  [
    'D1 migration backfills historical permissions',
    migration.includes('UPDATE social_friend_permissions')
      && migration.includes('WHERE field_selection_json IS NULL'),
  ],
  [
    'shared field selection validates known fields and dependencies',
    fieldSelection.includes('sanitizeSocialActivityPermissionFieldSelection')
      && fieldSelection.includes('normalizeDependencies'),
  ],
  [
    'server persists the selection on friend permissions',
    socialFriends.includes('field_selection_json')
      && socialFriends.includes('serializeSocialActivityPermissionFieldSelection'),
  ],
  [
    'legacy updates preserve the stored selection',
    socialFriends.includes('existing.field_selection_json'),
  ],
  [
    'publication rejects fields beyond the friend permission',
    snapshots.includes('SOCIAL_ACTIVITY_FIELDS_EXCEEDED')
      && snapshots.includes('socialActivityFieldSelectionIsSubset'),
  ],
  [
    'feed and detail are redacted against current permissions',
    snapshots.includes('redactSnapshotToFieldSelection')
      && snapshots.includes('permissionFields'),
  ],
  [
    'client publication intersects owner and friend policies',
    publication.includes('friendGuard.permission.fieldSelection')
      && publication.includes('applyFriendScopeToSocialActivitySharingPolicy'),
  ],
  [
    'domain stores a per-friend field selection',
    friendship.includes('updateFriendActivityFieldSelection')
      && friendship.includes('fieldSelection'),
  ],
  [
    'friend editor saves an explicit field selection',
    sharingSettings.includes('SocialActivityFriendFieldSelectionSettings')
      && sharingSettings.includes('Enregistrer les champs')
      && privacyPage.includes('updateFriendFieldSelection'),
  ],
  [
    'private notes are explicitly excluded from the editor',
    sharingSettings.includes('Les notes personnelles et les champs techniques restent toujours privés.'),
  ],
  [
    'A20 server and domain tests exist',
    fs.existsSync('functions/_shared/socialActivityFieldSelection.a20.test.mjs')
      && fs.existsSync('functions/_shared/socialFriends.a20.test.mjs')
      && fs.existsSync('src/domain/friends/friendship.a20.test.ts'),
  ],
];

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'} - ${label}`);
  if (!ok) failed = true;
}

if (failed) process.exit(1);
