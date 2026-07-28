import fs from 'node:fs';
import path from 'node:path';

const APP_VERSION = '0.33.2';
const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const checks = [];
const check = (label, condition) => checks.push([label, Boolean(condition)]);

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));

check('package version', packageJson.version === APP_VERSION);
check(
  'package-lock version',
  packageLock.version === APP_VERSION && packageLock.packages?.['']?.version === APP_VERSION,
);

for (const document of [
  'README.md',
  'README-PATCH.md',
  'INSTALLATION.txt',
  'RELEASE-CHECKLIST.md',
  'ROLLBACK.md',
  'KNOWN-LIMITATIONS.md',
  'RELEASE-NOTES-0.29.0.md',
  'docs/architecture/social-release-finalization-0.29.0-a26.md',
]) {
  check(`document ${document}`, exists(document));
}

check(
  'A26 package script',
  packageJson.scripts?.['audit:social-release-finalization']
    === 'node scripts/audit-social-release-finalization-0.29.0.mjs',
);
check(
  'A26 in check',
  String(packageJson.scripts?.check).includes('npm run audit:social-release-finalization'),
);
check(
  'A26 in ci',
  String(packageJson.scripts?.ci).includes('npm run audit:social-release-finalization'),
);

const releaseReadiness = read('src/app/releaseReadiness.test.ts');
const settingsTest = read('src/features/settings/components/SettingsOverview.test.tsx');
const openFoodFactsProxy = read('functions/_shared/openFoodFactsProxy.js');
check('release readiness version', releaseReadiness.includes("expect(__APP_VERSION__).toBe('0.33.2')"));
check('settings version', settingsTest.includes("getByText('0.33.2')"));
check('Open Food Facts user agent', openFoodFactsProxy.includes('SportPilot/0.33.2'));
check('A26 readiness test', exists('src/app/socialReleaseFinalizationReadiness.test.ts'));

const notes = read('RELEASE-NOTES-0.29.0.md');
for (const expected of [
  'identité canonique',
  'Aucun',
  'Résumé',
  'Personnalisé',
  'fiche détaillée',
  'Résilience',
  'Sécurité et confidentialité',
  'Dexie v10',
  'Sauvegarde JSON : v9',
  'v0.29.0',
]) {
  check(`release notes ${expected}`, notes.includes(expected));
}

check('D1 migration 0001', exists('migrations/0001_social_activity_snapshots_0_29_0.sql'));
check('D1 migration 0002', exists('migrations/0002_social_friend_permission_fields_0_29_0.sql'));
check('A25 acceptance doc', exists('docs/architecture/social-complete-acceptance-0.29.0-a25.md'));
check('A24 security doc', exists('docs/architecture/social-security-hardening-0.29.0-a24.md'));

const versionSensitiveSources = [
  'src/app/accountPreferencesSyncReadiness.test.ts',
  'src/app/actionFeedbackReadiness.test.ts',
  'src/app/automaticSyncReadiness.test.ts',
  'src/app/automaticSyncReleaseReadiness.test.ts',
  'src/app/dataContinuityReleaseReadiness.test.ts',
  'src/app/fullAccountContinuityReleaseReadiness.test.ts',
  'src/app/goalPrefillReadiness.test.ts',
  'src/app/nutritionSyncReleaseReadiness.test.ts',
  'src/app/releaseReadiness.test.ts',
  'src/app/rewardThemeArtDirectionReadiness.test.ts',
  'src/app/rewardsRoutinesSyncReadiness.test.ts',
  'src/app/syncOrchestratorReadiness.test.ts',
  'src/app/unifiedSyncCenterReadiness.test.ts',
  'src/features/settings/components/SettingsOverview.test.tsx',
];
check(
  'no stale 0.28.1 assertions',
  versionSensitiveSources.every((source) => !read(source).includes('0.28.1')),
);

let failed = false;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'} - ${label}`);
  if (!ok) failed = true;
}

const passed = checks.filter(([, ok]) => ok).length;
console.log(`A26 social release finalization audit: ${passed}/${checks.length} OK`);
if (failed) process.exit(1);
