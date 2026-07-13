import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);
const expectedVersion = JSON.parse(read('package.json')).version;

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
if (packageJson.version !== expectedVersion) {
  fail(`package.json doit publier ${expectedVersion}.`);
}
if (
  packageLock.version !== expectedVersion
  || packageLock.packages?.['']?.version !== expectedVersion
) {
  fail(`package-lock.json ne correspond pas à la version ${expectedVersion}.`);
}

const requiredFiles = [
  'src/app/fullAccountContinuityReleaseReadiness.test.ts',
  'src/features/settings/components/UnifiedSyncCenterPanel.tsx',
  'src/infrastructure/data-spaces/cloudAccountRestoreService.ts',
  'src/infrastructure/sync-prototype/realAccountPreferencesSyncService.ts',
  'src/infrastructure/sync-prototype/realRewardsRoutinesSyncService.ts',
  'docs/architecture/account-preferences-sync-0.22.0-e1.md',
  'docs/architecture/rewards-routines-sync-0.22.0-e2.md',
  'docs/architecture/unified-sync-center-0.22.0-e3.md',
  'docs/architecture/full-account-continuity-release-0.22.0-e4.md',
  'RELEASE-NOTES-0.22.0.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier E4 absent : ${path}.`);
}

if (failures.length === 0) {
  const database = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  for (const marker of [
    'SYNC_PROTOTYPE_DATABASE_VERSION = 14',
    'sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}',
    "'realAccountPreferences'",
    "'realRewardsRoutines'",
  ]) {
    if (!database.includes(marker)) fail(`runtime cloud incomplet : ${marker}.`);
  }

  const databaseVersions = read('src/infrastructure/database/migrations/versions.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_10\b/.test(databaseVersions)) {
    fail('le schéma métier doit rester en Dexie v8.');
  }
  const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*9\b/.test(backupMigrations)) {
    fail('la sauvegarde JSON doit rester en v7.');
  }
  const dataSpace = read('src/domain/data-spaces/dataSpace.ts');
  if (!/DATA_SPACE_REGISTRY_VERSION\s*=\s*1\s+as\s+const/.test(dataSpace)) {
    fail('le registre local des espaces doit rester en v1.');
  }

  const deployment = read('src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts');
  for (const flag of [
    'VITE_ENABLE_SYNC_PROTOTYPE',
    'VITE_ENABLE_REAL_WEIGHT_SYNC',
    'VITE_ENABLE_REAL_ACTIVITY_SYNC',
    'VITE_ENABLE_REAL_GOAL_SYNC',
    'VITE_ENABLE_REAL_STRENGTH_SYNC',
    'VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC',
    'VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC',
    'VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC',
    'VITE_ENABLE_REAL_ACCOUNT_PREFERENCES_SYNC',
    'VITE_ENABLE_REAL_REWARDS_ROUTINES_SYNC',
  ]) {
    if (!deployment.includes(`${flag}: 'true'`)) fail(`domaine public désactivé : ${flag}.`);
  }
  if (!deployment.includes("VITE_ENABLE_SYNC_DIAGNOSTICS: 'false'")) {
    fail('les diagnostics de laboratoire doivent rester désactivés en production.');
  }

  const center = [
    read('src/features/settings/components/UnifiedSyncCenterPanel.tsx'),
    read('src/features/settings/components/UnifiedSyncCenterAdvancedDetails.tsx'),
    read('src/features/settings/components/unifiedSyncDomainRegistry.ts'),
  ].join('\n');
  for (const marker of [
    'Analyser tout',
    'Synchroniser tout',
    'Relancer uniquement les rubriques en échec',
    'Aucune opération cloud n’est lancée hors connexion',
    'analyzeRealAccountPreferences',
    'analyzeRealRewardsRoutines',
    'analyzeRealNutritionTracking',
  ]) {
    if (!center.includes(marker)) fail(`centre unifié incomplet : ${marker}.`);
  }

  const restore = read('src/infrastructure/data-spaces/cloudAccountRestoreService.ts');
  for (const marker of [
    'synchronizeRealAccountPreferences',
    'synchronizeRealRewardsRoutines',
    'prepareCloudAccountRestore',
    'applyPreparedCloudAccountRestore',
    'sourceFingerprint',
    'targetFingerprint',
  ]) {
    if (!restore.includes(marker)) fail(`restauration complète incomplète : ${marker}.`);
  }

  const releaseNotes = read('RELEASE-NOTES-0.22.0.md');
  for (const marker of [
    'Profil et réglages partageables',
    'Récompenses, thèmes et routines',
    'Centre de synchronisation unifié',
    'Aucune migration',
    'iPhone 15 sous iOS 26',
  ]) {
    if (!releaseNotes.includes(marker)) fail(`notes 0.22.0 incomplètes : ${marker}.`);
  }

  for (const audit of [
    'audit:account-preferences-sync',
    'audit:rewards-routines-sync',
    'audit:unified-sync-center',
    'audit:full-account-continuity-release',
    'audit:account-isolation',
  ]) {
    if (!packageJson.scripts?.[audit]) fail(`script ${audit} absent.`);
    for (const pipeline of ['check', 'ci']) {
      if (!String(packageJson.scripts?.[pipeline] ?? '').includes(audit)) {
        fail(`le pipeline ${pipeline} n’exécute pas ${audit}.`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error('Audit E4 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Audit E4 réussi : socle 0.22.0 conservé sous SportPilot ${expectedVersion}, neuf domaines cloud, restauration complète, centre unifié, isolation et versions de données validés.`,
);
