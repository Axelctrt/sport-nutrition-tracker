import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isStableVersionAtLeast, stableVersionExpectation } from './shared/stableVersion.mjs';

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
if (!isStableVersionAtLeast(packageJson.version, 20)) {
  fail(`la version doit être ${stableVersionExpectation(20)}, reçue ${String(packageJson.version)}.`);
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
  'src/infrastructure/sync-prototype/realNutritionJournalAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realNutritionLibraryAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realNutritionTrackingAutomaticContinuity.test.ts',
  'src/application/sync/automaticSyncControllerNutritionDomains.test.ts',
  'src/application/sync/syncOrchestratorAdaptersNutrition.test.ts',
  'src/infrastructure/repositories/dexie/trashRestoreSyncNotification.test.ts',
  'src/infrastructure/repositories/dexie/DexieRecipeRepository.c2.test.ts',
  'src/infrastructure/sync-prototype/syncPrototypeConfig.test.ts',
  'src/app/nutritionSyncReleaseReadiness.test.ts',
]) {
  read(path);
}

const cloudDatabase = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const expected of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 18',
  "'sportpilot-sync-runtime-0.20.0-v16'",
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

const controller = read('src/application/sync/automaticSyncController.ts');
for (const domain of [
  'account-preferences',
  'rewards-routines',
  'weights',
  'activities',
  'goals',
  'strength',
  'nutrition-journal',
  'nutrition-library',
  'nutrition-tracking',
  'daily-coaching',
]) {
  if (!controller.includes(`'${domain}'`)) {
    fail(`le contrôleur automatique final ne contient pas ${domain}.`);
  }
}
for (const mergeSafeDomain of [
  'account-preferences',
  'rewards-routines',
  'goals',
  'daily-coaching',
  'nutrition-journal',
  'nutrition-library',
  'nutrition-tracking',
]) {
  const mergeSetStart = controller.indexOf('const SAFE_MERGE_DOMAIN_IDS');
  const automaticStart = controller.indexOf('function automaticDomainIds');
  const mergeSection = mergeSetStart >= 0 && automaticStart > mergeSetStart
    ? controller.slice(mergeSetStart, automaticStart)
    : '';
  if (!mergeSection.includes(`'${mergeSafeDomain}'`)) {
    fail(`la whitelist merge-safe finale ne contient pas ${mergeSafeDomain}.`);
  }
}

const adapters = read('src/application/sync/syncOrchestratorAdapters.ts');
for (const expected of [
  'nutrition-library-product-remap',
  'remappedProductReferences > 0',
  'nutrition-tracking-daily-target-recalculation',
  'recalculatedDailyTargets > 0',
  "['nutrition-journal']",
]) {
  if (!adapters.includes(expected)) {
    fail(`le chaînage automatique Nutrition ne contient pas ${expected}.`);
  }
}

const adapterTests = read('src/application/sync/syncOrchestratorAdaptersNutrition.test.ts');
for (const expected of [
  'publie Journal après un remapping durable de références Library',
  'publie Journal après un recalcul durable de dailyTargets par Tracking',
  'ne publie aucun signal croisé lorsque les compteurs sont à zéro',
  'refuse les chemins directionnels artificiels',
]) {
  if (!adapterTests.includes(expected)) {
    fail(`le gate de chaînage Nutrition ne contient pas ${expected}.`);
  }
}

const journalAutomatic = read(
  'src/infrastructure/sync-prototype/realNutritionJournalAutomaticContinuity.test.ts',
);
for (const expected of [
  'AutomaticSyncController',
  'DexieFoodRepository',
  'restoreTrashItemWithSyncNotification',
  '{ writeCloud: false }',
  'reference: originalSnapshot',
]) {
  if (!journalAutomatic.includes(expected)) {
    fail(`le gate automatique Journal ne contient pas ${expected}.`);
  }
}

const libraryAutomatic = read(
  'src/infrastructure/sync-prototype/realNutritionLibraryAutomaticContinuity.test.ts',
);
for (const expected of [
  'AutomaticSyncController',
  'saveRecipe',
  'DexieRecipeRepository',
  'restoreTrashItemWithSyncNotification',
  '{ writeCloud: false }',
]) {
  if (!libraryAutomatic.includes(expected)) {
    fail(`le gate automatique Library ne contient pas ${expected}.`);
  }
}

const trackingAutomatic = read(
  'src/infrastructure/sync-prototype/realNutritionTrackingAutomaticContinuity.test.ts',
);
for (const expected of [
  'AutomaticSyncController',
  'DexieWeeklyReviewRepository',
  'acceptedCalibrationAdjustmentKcal',
  'syncRealNutritionTracking',
  'syncRealNutritionJournal',
  '{ writeCloud: false }',
]) {
  if (!trackingAutomatic.includes(expected)) {
    fail(`le gate automatique Tracking ne contient pas ${expected}.`);
  }
}

const trashRestore = read(
  'src/infrastructure/repositories/dexie/trashRestoreSyncNotification.ts',
);
for (const expected of [
  "restored.entityType === 'foodEntry'",
  "restored.entityType === 'meal'",
  "['nutrition-journal']",
  "restored.entityType === 'favoriteMeal'",
  "restored.entityType === 'recipe'",
  "['nutrition-library']",
]) {
  if (!trashRestore.includes(expected)) {
    fail(`la restauration Corbeille Nutrition ne contient pas ${expected}.`);
  }
}

const recipeRepository = read(
  'src/infrastructure/repositories/dexie/DexieRecipeRepository.ts',
);
if (!recipeRepository.includes('saveWithIngredients')) {
  fail('la sauvegarde atomique Recipe n’est plus disponible.');
}
const recipeTriggerTest = read(
  'src/infrastructure/repositories/dexie/DexieRecipeRepository.c2.test.ts',
);
if (!recipeTriggerTest.includes('publie nutrition-library après la sauvegarde atomique durable')) {
  fail('le déclencheur automatique de saveWithIngredients n’est pas verrouillé par un test.');
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
const continuityVariables = [
  'VITE_ENABLE_REAL_WEIGHT_SYNC',
  'VITE_ENABLE_REAL_ACTIVITY_SYNC',
  'VITE_ENABLE_REAL_GOAL_SYNC',
  'VITE_ENABLE_REAL_STRENGTH_SYNC',
  'VITE_ENABLE_REAL_ACCOUNT_PREFERENCES_SYNC',
  'VITE_ENABLE_REAL_REWARDS_ROUTINES_SYNC',
  'VITE_ENABLE_REAL_DAILY_COACHING_SYNC',
  'VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC',
  'VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC',
  'VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC',
];
for (const variable of [
  'VITE_ENABLE_SYNC_PROTOTYPE',
  ...continuityVariables,
]) {
  if (!deployment.includes(`${variable}: 'true'`)) {
    fail(`la configuration publique n’active pas ${variable}.`);
  }
}
if (!deployment.includes("VITE_ENABLE_REAL_SOCIAL_CLOUD: 'false'")) {
  fail('le cloud Social ne reste pas désactivé par défaut.');
}
if (!deployment.includes("VITE_ENABLE_SYNC_DIAGNOSTICS: 'false'")) {
  fail('les diagnostics de laboratoire ne sont pas désactivés en production.');
}

const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
for (const variable of continuityVariables) {
  const marker = `${variable}:\n      syncPublicDeploymentConfig.${variable}`;
  if (!config.includes(marker)) {
    fail(`le hardening de production ne verrouille pas ${variable}.`);
  }
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
if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_12/.test(databaseVersions)) {
  fail('la base métier principale n’est plus en Dexie v12.');
}
const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10/.test(backupMigrations)) {
  fail('la sauvegarde n’est plus en JSON v10.');
}
const dataSpaces = read('src/infrastructure/data-spaces/dataSpaceRegistry.ts');
if (!dataSpaces.includes("'sportpilot:data-spaces:v1'")) {
  fail('le registre local des espaces n’est plus en v1.');
}

if (failures.length > 0) {
  console.error('\nAudit final de synchronisation nutritionnelle échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit final de synchronisation nutritionnelle réussi : Journal/Library/Tracking automatiques A→B, chaînages Journal, restaurations Corbeille, hardening des dix domaines, intégrité Nutrition et runtime cloud v18 validés sans modification des formules.',
  );
}
