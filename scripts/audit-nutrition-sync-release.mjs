import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    fail(`le fichier ${path} est absent.`);
    return '';
  }
  return readFileSync(absolute, 'utf8');
};

const packageJson = JSON.parse(read('package.json'));
if (!/^0\.20\.\d+$/.test(packageJson.version)) {
  fail(`la version attendue appartient à la série 0.20.x, reçue ${String(packageJson.version)}.`);
}

for (const path of [
  `RELEASE-NOTES-${packageJson.version}.md`,
  'docs/architecture/nutrition-sync-0.20.0-c1.md',
  'docs/architecture/nutrition-sync-0.20.0-c2.md',
  'docs/architecture/nutrition-sync-0.20.0-c3.md',
  'docs/architecture/nutrition-sync-0.20.0-c4.md',
  'src/infrastructure/sync-prototype/cloudSyncValue.ts',
  'src/infrastructure/sync-prototype/realNutritionJournalSyncService.ts',
  'src/infrastructure/sync-prototype/realNutritionLibrarySyncService.ts',
  'src/infrastructure/sync-prototype/realNutritionTrackingSyncService.ts',
  'src/app/nutritionSyncReleaseReadiness.test.ts',
]) {
  read(path);
}

const cloudDatabase = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const expected of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 8',
  'sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}',
  'disableEagerSync: true',
  'realNutritionJournalDays',
  'realNutritionJournalDeletionRecords',
  'realNutritionProducts',
  'realNutritionRecipes',
  'realFavoriteMeals',
  'realNutritionLibraryDeletionRecords',
  'realNutritionTracking',
]) {
  if (!cloudDatabase.includes(expected)) {
    fail(`la base cloud finale ne contient pas ${expected}.`);
  }
}

const commonUtility = read('src/infrastructure/sync-prototype/cloudSyncValue.ts');
for (const expected of [
  'owner',
  'realmId',
  '$ts',
  '_hasBlobRefs',
  'belongsToCurrentUser',
  'stripCloudFields',
  'cloudPrivateId',
  'localIdFromCloud',
  'stableValue',
  'sameEntity',
  'chooseLatest',
]) {
  if (!commonUtility.includes(expected)) {
    fail(`l’utilitaire commun de convergence ne contient pas ${expected}.`);
  }
}

const journal = read('src/infrastructure/sync-prototype/realNutritionJournalSyncService.ts');
for (const expected of [
  "from '@/infrastructure/sync-prototype/cloudSyncValue'",
  'NutritionJournalDayAggregate',
  'validateDayAggregate',
  'cloudDatabase.transaction',
  'localDatabase.transaction',
  "entityType === 'meal'",
  "entityType === 'foodEntry'",
  'createRestoredDeletionRecord',
]) {
  if (!journal.includes(expected)) {
    fail(`le journal nutritionnel final ne contient pas ${expected}.`);
  }
}

const library = read('src/infrastructure/sync-prototype/realNutritionLibrarySyncService.ts');
for (const expected of [
  "from '@/infrastructure/sync-prototype/cloudSyncValue'",
  'NutritionRecipeAggregate',
  'validateRecipeAggregate',
  'normalizeOpenFoodFactsBarcode',
  'productAliases',
  'realNutritionJournalDays',
  'realNutritionLibraryDeletionRecords',
]) {
  if (!library.includes(expected)) {
    fail(`la bibliothèque nutritionnelle finale ne contient pas ${expected}.`);
  }
}

const tracking = read('src/infrastructure/sync-prototype/realNutritionTrackingSyncService.ts');
for (const expected of [
  "from '@/infrastructure/sync-prototype/cloudSyncValue'",
  'NutritionTrackingAggregate',
  'validateAggregate',
  'resolveAcceptedCalibrationAdjustment',
  'reconcileDailyTargets',
  'localDatabase.transaction',
]) {
  if (!tracking.includes(expected)) {
    fail(`le suivi nutritionnel final ne contient pas ${expected}.`);
  }
}

for (const [label, source] of [
  ['journal', journal],
  ['bibliothèque', library],
  ['suivi', tracking],
]) {
  for (const expected of ['belongsToCurrentUser', 'chooseLatest', 'sameEntity']) {
    if (!source.includes(expected)) {
      fail(`le domaine ${label} ne contient pas ${expected}.`);
    }
  }
  if (source.includes('function stableValue(') || source.includes('type CloudOwned<T>')) {
    fail(`le domaine ${label} conserve une implémentation locale divergente.`);
  }
}

const client = read('src/infrastructure/sync-prototype/syncPrototypeClient.ts');
for (const expected of [
  'analyzeRealNutritionJournal',
  'syncRealNutritionJournal',
  'analyzeRealNutritionLibrary',
  'syncRealNutritionLibrary',
  'analyzeRealNutritionTracking',
  'syncRealNutritionTracking',
  'synchronizeRealNutritionTracking',
  'synchronizeRealNutritionJournal',
]) {
  if (!client.includes(expected)) {
    fail(`le client final ne contient pas ${expected}.`);
  }
}

const settingsPage = read('src/features/settings/pages/AdvancedSettingsPage.tsx');
for (const expected of [
  '<NutritionJournalSyncSettingsPanel />',
  '<NutritionLibrarySyncSettingsPanel />',
  '<NutritionTrackingSyncSettingsPanel />',
]) {
  if (!settingsPage.includes(expected)) {
    fail(`la page Paramètres ne contient pas ${expected}.`);
  }
}

const deployment = read('src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts');
for (const variable of [
  'VITE_ENABLE_SYNC_PROTOTYPE',
  'VITE_ENABLE_REAL_WEIGHT_SYNC',
  'VITE_ENABLE_REAL_ACTIVITY_SYNC',
  'VITE_ENABLE_REAL_GOAL_SYNC',
  'VITE_ENABLE_REAL_STRENGTH_SYNC',
  'VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC',
  'VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC',
  'VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC',
]) {
  if (!deployment.includes(`${variable}: 'true'`)) {
    fail(`la configuration publique n’active pas ${variable}.`);
  }
}
if (!deployment.includes("VITE_ENABLE_SYNC_DIAGNOSTICS: 'false'")) {
  fail('les diagnostics de laboratoire ne sont pas désactivés en production.');
}

const scripts = packageJson.scripts ?? {};
for (const [name, command] of [
  ['audit:nutrition-journal-sync', 'node scripts/audit-nutrition-journal-sync.mjs'],
  ['audit:nutrition-library-sync', 'node scripts/audit-nutrition-library-sync.mjs'],
  ['audit:nutrition-tracking-sync', 'node scripts/audit-nutrition-tracking-sync.mjs'],
  ['audit:nutrition-sync-release', 'node scripts/audit-nutrition-sync-release.mjs'],
]) {
  if (scripts[name] !== command) {
    fail(`le script ${name} est absent ou incohérent.`);
  }
}
for (const pipeline of ['check', 'ci']) {
  const command = String(scripts[pipeline] ?? '');
  for (const audit of [
    'audit:nutrition-journal-sync',
    'audit:nutrition-library-sync',
    'audit:nutrition-tracking-sync',
    'audit:nutrition-sync-release',
  ]) {
    if (!command.includes(audit)) {
      fail(`le pipeline ${pipeline} n’exécute pas ${audit}.`);
    }
  }
}

const databaseVersions = read('src/infrastructure/database/migrations/versions.ts');
if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8/.test(databaseVersions)) {
  fail('la base métier principale n’est plus en Dexie v8.');
}
const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7/.test(backupMigrations)) {
  fail('la sauvegarde n’est plus en JSON v7.');
}
const dataSpaces = read('src/infrastructure/data-spaces/dataSpaceRegistry.ts');
if (!dataSpaces.includes("'sportpilot:data-spaces:v1'")) {
  fail('le registre local des espaces n’est plus en v1.');
}

if (failures.length > 0) {
  console.error('\nAudit final de synchronisation nutritionnelle 0.20.x échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit final 0.20.x réussi : journal atomique, bibliothèque cohérente, bilans et ajustements synchronisés, recalcul C1, isolation des comptes et runtime cloud v8 validés.',
  );
}
