import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredBehaviorSuites = [
  'src/infrastructure/sync-prototype/accountMultiDeviceContinuity.integration.test.ts',
  'src/infrastructure/sync-prototype/realStrengthSyncService.test.ts',
  'src/infrastructure/sync-prototype/realGoalsWeightsAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realActivitySyncService.test.ts',
  'src/infrastructure/sync-prototype/realActivitiesAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realGoalConcurrentResolutionService.test.ts',
  'src/infrastructure/sync-prototype/realGoalLwwConflictResolution.test.ts',
  'src/infrastructure/sync-prototype/realAccountPreferencesAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realRewardsRoutinesAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realDailyCoachingAutomaticReadiness.test.ts',
  'src/infrastructure/sync-prototype/realNutritionJournalAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realNutritionLibraryAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realNutritionTrackingAutomaticContinuity.test.ts',
  'src/application/sync/automaticSyncController.test.ts',
  'src/application/sync/automaticSyncControllerGoalsWeights.test.ts',
  'src/application/sync/automaticSyncControllerActivities.test.ts',
  'src/application/sync/automaticSyncControllerMergeSafeDomains.test.ts',
  'src/application/sync/automaticSyncControllerMergeSafeGuards.test.ts',
  'src/application/sync/automaticSyncControllerNutritionDomains.test.ts',
  'src/application/sync/automaticSyncControllerRewardsEventIsolation.test.ts',
  'src/application/sync/syncOrchestrator.test.ts',
  'src/application/sync/syncOrchestratorAdapters.test.ts',
  'src/application/sync/syncOrchestratorAdaptersNutrition.test.ts',
  'src/infrastructure/repositories/dexie/trashRestoreSyncNotification.test.ts',
  'src/infrastructure/repositories/dexie/DexieRecipeRepository.c2.test.ts',
  'src/infrastructure/user-state/userStateAutomaticSyncNotification.test.ts',
  'src/infrastructure/data-spaces/cloudAccountRestoreService.test.ts',
  'src/app/data-spaces/DataSpaceAccountGate.test.tsx',
  'src/infrastructure/data-spaces/accountDataIsolation.integration.test.ts',
  'src/infrastructure/data-spaces/accountDataSpaceService.test.ts',
  'src/infrastructure/data-spaces/guestDataImportService.test.ts',
  'src/application/account/cloudAccountAccess.test.ts',
];
for (const path of requiredBehaviorSuites) {
  if (!existsSync(join(root, path))) {
    fail(`suite comportementale P0 absente : ${path}.`);
  }
}

const requiredStructuralFiles = [
  'src/application/sync/automaticSyncController.ts',
  'src/application/sync/syncOrchestrator.ts',
  'src/application/sync/syncOrchestratorAdapters.ts',
  'src/infrastructure/sync-prototype/realStrengthSyncService.ts',
  'src/infrastructure/sync-prototype/realGoalSyncService.ts',
  'src/infrastructure/sync-prototype/realGoalConcurrentResolutionService.ts',
  'src/infrastructure/sync-prototype/realWeightSyncService.ts',
  'src/infrastructure/sync-prototype/realActivitySyncService.ts',
  'src/infrastructure/sync-prototype/realAccountPreferencesSyncService.ts',
  'src/infrastructure/sync-prototype/realRewardsRoutinesSyncService.ts',
  'src/infrastructure/sync-prototype/realDailyCoachingSyncService.ts',
  'src/infrastructure/sync-prototype/realNutritionJournalSyncService.ts',
  'src/infrastructure/sync-prototype/realNutritionLibrarySyncService.ts',
  'src/infrastructure/sync-prototype/realNutritionTrackingSyncService.ts',
  'src/infrastructure/sync-prototype/syncPrototypeConfig.ts',
  'src/infrastructure/sync-prototype/logicalSyncState.ts',
  'src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts',
  'src/infrastructure/data-spaces/cloudAccountRestoreService.ts',
  'src/infrastructure/data-spaces/accountContinuityInitializationService.ts',
  'src/infrastructure/database/migrations/versions.ts',
  'src/infrastructure/backup/backupMigrations.ts',
];
for (const path of requiredStructuralFiles) {
  if (!existsSync(join(root, path))) {
    fail(`garde-fou structurel P0 absent : ${path}.`);
  }
}

function whitelist(controller, constantName) {
  const match = controller.match(
    new RegExp(`${constantName}\\s*=\\s*\\n?\\s*new Set<[^>]+>\\(\\[([^\\]]*)\\]\\)`, 'm'),
  );
  if (!match) return undefined;
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((value) => value[1]);
}

function expectExactWhitelist(controller, constantName, expectedValues) {
  const values = whitelist(controller, constantName);
  const expected = new Set(expectedValues);
  if (
    !values
    || values.length !== expected.size
    || values.some((value) => !expected.has(value))
  ) {
    fail(`${constantName} doit rester exactement limité à ${expectedValues.join(', ')}.`);
  }
}

if (failures.length === 0) {
  const packageJson = JSON.parse(read('package.json'));
  const scripts = packageJson.scripts ?? {};

  if (scripts.test !== 'vitest run') {
    fail('la gate P0 attend que npm test exécute toute la suite Vitest via `vitest run`.');
  }
  if (
    scripts['audit:p0-account-continuity']
    !== 'node scripts/audit-p0-account-continuity.mjs'
  ) {
    fail('le script audit:p0-account-continuity est absent ou incohérent.');
  }

  const requiredAudits = [
    'audit:sync-orchestrator',
    'audit:automatic-sync',
    'audit:automatic-sync-release',
    'audit:nutrition-sync-release',
    'audit:strength-sync',
    'audit:guest-data-import',
    'audit:cloud-account-restore',
    'audit:account-isolation',
    'audit:full-account-continuity-release',
    'audit:data-continuity-release',
    'audit:p0-account-continuity',
  ];
  for (const audit of requiredAudits) {
    if (!scripts[audit]) fail(`script P0 requis absent : ${audit}.`);
    for (const pipeline of ['check', 'ci']) {
      if (!String(scripts[pipeline] ?? '').includes(`npm run ${audit}`)) {
        fail(`le pipeline ${pipeline} n’intègre pas ${audit}.`);
      }
    }
  }

  const integrationTest = read(
    'src/infrastructure/sync-prototype/accountMultiDeviceContinuity.integration.test.ts',
  );
  for (const structuralMarker of [
    'createSyncOrchestratorDomains',
    'createSyncOrchestrator',
    "syncMode: 'local-only'",
    "syncMode: 'cloud-only'",
    'synchronizeRealStrengthToCloud',
    'synchronizeRealStrengthFromCloud',
    'replicateStrengthCloud',
  ]) {
    if (!integrationTest.includes(structuralMarker)) {
      fail(`contrat structurel du test A→B Strength absent : ${structuralMarker}.`);
    }
  }

  const goalsWeightsIntegrationTest = read(
    'src/infrastructure/sync-prototype/realGoalsWeightsAutomaticContinuity.test.ts',
  );
  for (const structuralMarker of [
    'AutomaticSyncController',
    'synchronizeRealGoalsToCloud',
    'synchronizeRealGoalsFromCloud',
    'synchronizeRealWeightsToCloud',
    'synchronizeRealWeightsFromCloud',
    'writeGoalState',
    'flushGoalStatePersistence',
    'REAL_WEIGHT_DATA_CHANGED_EVENT',
  ]) {
    if (!goalsWeightsIntegrationTest.includes(structuralMarker)) {
      fail(`contrat structurel du test A→B Goals/Weights absent : ${structuralMarker}.`);
    }
  }

  const activitiesIntegrationTest = read(
    'src/infrastructure/sync-prototype/realActivitiesAutomaticContinuity.test.ts',
  );
  for (const structuralMarker of [
    'AutomaticSyncController',
    'synchronizeRealActivitiesToCloud',
    'synchronizeRealActivitiesFromCloud',
    'DexieActivityRepository',
    'ENDURANCE_PLANNING_PERSISTED_EVENT',
    'replicateActivitiesCloud',
  ]) {
    if (!activitiesIntegrationTest.includes(structuralMarker)) {
      fail(`contrat structurel du test A→B Activities absent : ${structuralMarker}.`);
    }
  }

  const accountIntegrationTest = read(
    'src/infrastructure/sync-prototype/realAccountPreferencesAutomaticContinuity.test.ts',
  );
  for (const structuralMarker of [
    'AutomaticSyncController',
    'DexieProfileRepository',
    'DexieSettingsRepository',
    'synchronizeRealAccountPreferences',
  ]) {
    if (!accountIntegrationTest.includes(structuralMarker)) {
      fail(`contrat structurel du test A→B Account Preferences absent : ${structuralMarker}.`);
    }
  }

  const rewardsIntegrationTest = read(
    'src/infrastructure/sync-prototype/realRewardsRoutinesAutomaticContinuity.test.ts',
  );
  for (const structuralMarker of [
    'AutomaticSyncController',
    'flushAchievementStatePersistence',
    'flushVisualThemeStatePersistence',
    'flushWeeklyMissionHistoryPersistence',
    'flushRoutineReminderCompletionPersistence',
    'synchronizeRealRewardsRoutines',
  ]) {
    if (!rewardsIntegrationTest.includes(structuralMarker)) {
      fail(`contrat structurel du test A→B Rewards/Routines absent : ${structuralMarker}.`);
    }
  }

  const dailyReadinessTest = read(
    'src/infrastructure/sync-prototype/realDailyCoachingAutomaticReadiness.test.ts',
  );
  if (!dailyReadinessTest.includes('daily-coaching')) {
    fail('le gate automatique Daily Coaching ne verrouille pas son domaine.');
  }

  const nutritionGates = [
    [
      'Journal',
      'src/infrastructure/sync-prototype/realNutritionJournalAutomaticContinuity.test.ts',
      ['AutomaticSyncController', 'DexieFoodRepository', '{ writeCloud: false }'],
    ],
    [
      'Library',
      'src/infrastructure/sync-prototype/realNutritionLibraryAutomaticContinuity.test.ts',
      ['AutomaticSyncController', 'saveRecipe', 'restoreTrashItemWithSyncNotification', '{ writeCloud: false }'],
    ],
    [
      'Tracking',
      'src/infrastructure/sync-prototype/realNutritionTrackingAutomaticContinuity.test.ts',
      ['AutomaticSyncController', 'DexieWeeklyReviewRepository', 'syncRealNutritionJournal', '{ writeCloud: false }'],
    ],
  ];
  for (const [label, path, markers] of nutritionGates) {
    const source = read(path);
    for (const marker of markers) {
      if (!source.includes(marker)) {
        fail(`contrat structurel du test A→B Nutrition ${label} absent : ${marker}.`);
      }
    }
  }

  const adapters = read('src/application/sync/syncOrchestratorAdapters.ts');
  for (const marker of [
    "syncMode === 'cloud-only'",
    "syncMode === 'local-only'",
    'client.syncRealStrengthFromCloud',
    'client.syncRealStrengthToCloud',
    'synchronizeRegisteredRealGoalsFromCloud',
    'synchronizeRegisteredRealGoalsToCloud',
    'synchronizeRegisteredRealWeightsFromCloud',
    'synchronizeRegisteredRealWeightsToCloud',
    'synchronizeRegisteredRealActivitiesFromCloud',
    'synchronizeRegisteredRealActivitiesToCloud',
    'nutrition-library-product-remap',
    'nutrition-tracking-daily-target-recalculation',
  ]) {
    if (!adapters.includes(marker)) {
      fail(`routage sûr absent : ${marker}.`);
    }
  }

  const strength = read(
    'src/infrastructure/sync-prototype/realStrengthSyncService.ts',
  );
  for (const marker of [
    'synchronizeRealStrengthFromCloud',
    'synchronizeRealStrengthToCloud',
    "requireChangeOrigin: 'cloud'",
    "requireChangeOrigin: 'local'",
    'requireCloudStateMatch: true',
  ]) {
    if (!strength.includes(marker)) {
      fail(`primitive directionnelle Strength absente : ${marker}.`);
    }
  }

  const goals = read(
    'src/infrastructure/sync-prototype/realGoalSyncService.ts',
  );
  for (const marker of [
    'synchronizeRealGoalsFromCloud',
    'synchronizeRealGoalsToCloud',
    "requireChangeOrigin: 'cloud'",
    "requireChangeOrigin: 'local'",
    'applyCloudTargetIfUnchanged',
    'applyLocalTargetIfUnchanged',
    'sameCloudOwnedCollection',
    'restoreRealGoalsFromCloudIntoEmptyLocal',
    'options.writeCloud !== false',
    "domainId: 'goals'",
    "entityId: 'goals'",
    'goalStateMutationTimestamp',
    'latestGoalState',
    'stableValue',
    'resolveMergedGoalLogicalState',
    'preserveRestorationMarker',
  ]) {
    if (!goals.includes(marker)) {
      fail(`contrat Goals directionnel/LWW absent : ${marker}.`);
    }
  }

  const goalsFallback = read(
    'src/infrastructure/sync-prototype/realGoalConcurrentResolutionService.ts',
  );
  for (const marker of [
    "origin !== 'both'",
    'baselineDigest',
    'prepareRealGoalConcurrentReconciliation',
    'applyRealGoalConcurrentReconciliation',
  ]) {
    if (!goalsFallback.includes(marker)) {
      fail(`fallback manuel Goals both absent : ${marker}.`);
    }
  }

  const weights = read(
    'src/infrastructure/sync-prototype/realWeightSyncService.ts',
  );
  for (const marker of [
    'synchronizeRealWeightsFromCloud',
    'synchronizeRealWeightsToCloud',
    "requireChangeOrigin: 'cloud'",
    "requireChangeOrigin: 'local'",
    'requireCloudStateMatch: true',
    "domainId: 'weights'",
    "entityId: 'weights'",
  ]) {
    if (!weights.includes(marker)) {
      fail(`primitive directionnelle Weights absente : ${marker}.`);
    }
  }

  const activities = read(
    'src/infrastructure/sync-prototype/realActivitySyncService.ts',
  );
  for (const marker of [
    'synchronizeRealActivitiesFromCloud',
    'synchronizeRealActivitiesToCloud',
    "requireChangeOrigin: 'cloud'",
    "requireChangeOrigin: 'local'",
    'applyCloudTargetIfUnchanged',
    'applyLocalTargetIfUnchanged',
    'cloudStateMatchesExpected',
    'flushEndurancePlanningPersistence',
    "domainId: 'activities'",
    "entityId: 'activities'",
  ]) {
    if (!activities.includes(marker)) {
      fail(`primitive directionnelle Activities absente : ${marker}.`);
    }
  }
  if (/\bchooseLatest\b/.test(activities)) {
    fail('Activities ne doit pas choisir silencieusement une version sur unknown/both.');
  }

  const controller = read('src/application/sync/automaticSyncController.ts');
  expectExactWhitelist(controller, 'SAFE_REMOTE_CONVERGENCE_DOMAIN_IDS', [
    'strength',
    'goals',
    'weights',
    'activities',
  ]);
  expectExactWhitelist(controller, 'SAFE_LOCAL_UPLOAD_DOMAIN_IDS', [
    'strength',
    'goals',
    'weights',
    'activities',
  ]);
  expectExactWhitelist(controller, 'SAFE_MERGE_DOMAIN_IDS', [
    'account-preferences',
    'rewards-routines',
    'goals',
    'daily-coaching',
    'nutrition-journal',
    'nutrition-library',
    'nutrition-tracking',
  ]);

  const automaticStart = controller.indexOf('function automaticDomainIds');
  const automaticEnd = controller.indexOf('function normalizeDomains');
  const automaticDomainFunction = automaticStart >= 0 && automaticEnd > automaticStart
    ? controller.slice(automaticStart, automaticEnd)
    : '';
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
    if (!automaticDomainFunction.includes(`'${domain}'`)) {
      fail(`automaticDomainIds() ne contient pas le domaine final ${domain}.`);
    }
  }

  for (const marker of [
    'safeMergeDomainIds',
    "syncMode: 'bidirectional'",
    'isCurrentAccountOperation',
    'await this.client.syncNow()',
  ]) {
    if (!controller.includes(marker)) {
      fail(`garde-fou merge-safe automatique absent : ${marker}.`);
    }
  }

  const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
  for (const variable of [
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
  ]) {
    if (!config.includes(`syncPublicDeploymentConfig.${variable}`)) {
      fail(`le hardening de production ne verrouille pas ${variable}.`);
    }
  }

  const cloudDatabase = read(
    'src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts',
  );
  if (!cloudDatabase.includes("unsyncedTables: ['realSyncBaselines']")) {
    fail('realSyncBaselines doit rester local à chaque replica cloud/appareil.');
  }

  const databaseVersions = read(
    'src/infrastructure/database/migrations/versions.ts',
  );
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_12\b/.test(databaseVersions)) {
    fail('P0 ne doit pas modifier Dexie métier : version 12 attendue.');
  }
  const backupMigrations = read(
    'src/infrastructure/backup/backupMigrations.ts',
  );
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10\b/.test(backupMigrations)) {
    fail('P0 ne doit pas modifier le schéma backup : version 10 attendue.');
  }
}

if (failures.length > 0) {
  console.error('Audit P0 continuité multi-appareils échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit P0 continuité multi-appareils réussi : quatre chemins directionnels préservés, sept domaines merge-safe et dix domaines automatiques non sociaux, Goals LWW avec fallback manuel, Nutrition A→B et chaînages Journal qualifiés, baselines par replica et versions Dexie/backup préservées.',
);
