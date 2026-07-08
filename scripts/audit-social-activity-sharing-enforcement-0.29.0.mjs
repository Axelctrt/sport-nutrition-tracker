import fs from 'node:fs';

const server = fs.readFileSync('functions/_shared/socialActivitySnapshots.js', 'utf8');
const validator = fs.readFileSync('src/domain/friends/socialActivitySnapshotValidation.ts', 'utf8');
const page = fs.readFileSync('src/features/friends/pages/FriendsPrivacyPage.tsx', 'utf8');
const serverTests = fs.readFileSync('functions/_shared/socialActivitySnapshots.test.mjs', 'utf8');

const checks = [
  ['permission read-time enforcement', server.includes('snapshotForCurrentPermission')],
  ['summary redaction', server.includes('redactSnapshotToSummary')],
  ['permission joined to feed rows', server.includes('INNER JOIN social_friend_permissions p')],
  ['stored snapshot validation', server.includes('parseStoredSnapshot') && server.includes('normalizeSnapshot(JSON.parse')],
  ['summary allowedFields validation', validator.includes('validateSummaryFieldScope')],
  ['reconciliation after D1 confirmation', page.includes('reconcilePrivacy(persistSnapshot(confirmedSnapshot))')],
  ['no reconciliation before cloud confirmation', !page.includes('reconcilePrivacy(persistSnapshot(next))')],
  ['cardio downgrade test', serverTests.includes('réduit immédiatement un snapshot détaillé au résumé')],
  ['strength downgrade test', serverTests.includes('retire exercices, séries, répétitions et charges')],
];

let failed = false;
for (const [label, passed] of checks) {
  console.log(`${passed ? 'OK' : 'FAIL'} - ${label}`);
  if (!passed) failed = true;
}

if (failed) process.exit(1);
