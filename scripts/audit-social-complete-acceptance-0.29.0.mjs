import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const phaseAudits = [
  'scripts/audit-social-identity-canonical-reconciliation-0.29.0.mjs',
  'scripts/audit-social-friend-requests-terminal-cleanup-0.29.0.mjs',
  'scripts/audit-social-activity-sharing-enforcement-0.29.0.mjs',
  'scripts/audit-social-friend-removal-0.29.0.mjs',
  'scripts/audit-social-sharing-field-selection-0.29.0.mjs',
  'scripts/audit-social-sharing-single-source-0.29.0.mjs',
  'scripts/audit-social-activity-detail-0.29.0.mjs',
  'scripts/audit-social-feed-finalization-0.29.0.mjs',
  'scripts/audit-social-sync-resilience-0.29.0.mjs',
  'scripts/audit-social-security-hardening-0.29.0.mjs',
];

const checks = [];

for (const audit of phaseAudits) {
  const result = spawnSync(process.execPath, [audit], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
  const ok = result.status === 0;
  checks.push([`phase audit ${audit.split('/').at(-1)}`, ok]);
  if (!ok) {
    process.stdout.write(result.stdout ?? '');
    process.stderr.write(result.stderr ?? '');
  }
}

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const friendsPage = fs.readFileSync('src/features/friends/pages/FriendsPrivacyPage.tsx', 'utf8');
const sharingSettings = fs.readFileSync('src/features/friends/components/SocialActivitySharingSettings.tsx', 'utf8');
const activityForm = fs.readFileSync('src/features/activities/components/ActivityForm.tsx', 'utf8');
const workoutSession = fs.readFileSync('src/features/strength-sessions/pages/WorkoutSessionPage.tsx', 'utf8');
const acceptanceDoc = fs.readFileSync('docs/architecture/social-complete-acceptance-0.29.0-a25.md', 'utf8');

checks.push([
  'package script',
  packageJson.scripts?.['audit:social-complete-acceptance']
    === 'node scripts/audit-social-complete-acceptance-0.29.0.mjs',
]);
checks.push([
  'single source UI',
  sharingSettings.includes("label: 'Aucun'")
    && sharingSettings.includes("label: 'Résumé'")
    && sharingSettings.includes("label: 'Personnalisé'")
    && friendsPage.includes('SocialActivityFriendSharingSettings'),
]);
checks.push([
  'no activity editor sharing controls',
  !activityForm.includes('SocialActivitySharingSettings')
    && !workoutSession.includes('SocialActivitySharingSettings'),
]);
checks.push([
  'manual acceptance matrix',
  acceptanceDoc.includes('Compte A')
    && acceptanceDoc.includes('Compte B')
    && acceptanceDoc.includes('iPhone 15')
    && acceptanceDoc.includes('Contrôle D1')
    && acceptanceDoc.includes('Critères de clôture'),
]);
checks.push([
  'A25 readiness test',
  fs.existsSync('src/app/socialCompleteAcceptanceReadiness.test.ts'),
]);

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'} - ${label}`);
  if (!ok) failed = true;
}

const passed = checks.filter(([, ok]) => ok).length;
console.log(`A25 social complete acceptance audit: ${passed}/${checks.length} OK`);
if (failed) process.exit(1);
