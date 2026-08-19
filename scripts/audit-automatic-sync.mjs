import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/application/sync/automaticSyncController.ts',
  'src/application/sync/automaticSyncController.test.ts',
  'src/application/sync/automaticSyncControllerActivities.test.ts',
  'src/application/sync/automaticSyncControllerMergeSafeDomains.test.ts',
  'src/application/sync/automaticSyncControllerMergeSafeGuards.test.ts',
  'src/application/sync/automaticSyncControllerNutritionDomains.test.ts',
  'src/application/sync/automaticSyncControllerRewardsEventIsolation.test.ts',
  'src/application/sync/automaticSyncEvents.ts',
  'src/application/sync/syncLocalChangeEvents.ts',
  'src/application/sync/syncOrchestratorAdapters.ts',
  'src/application/sync/syncOrchestratorAdaptersNutrition.test.ts',
  'src/app/sync/AutomaticSyncCoordinator.tsx',
  'src/app/automaticSyncReadiness.test.ts',
  'src/features/settings/components/AutomaticSyncSettingsPanel.tsx',
  'src/features/settings/components/AutomaticSyncSettingsPanel.test.tsx',
  'src/infrastructure/sync-prototype/realAccountPreferencesAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realRewardsRoutinesAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realDailyCoachingAutomaticReadiness.test.ts',
  'src/infrastructure/sync-prototype/realNutritionJournalAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realNutritionLibraryAutomaticContinuity.test.ts',
  'src/infrastructure/sync-prototype/realNutritionTrackingAutomaticContinuity.test.ts',
  'src/infrastructure/repositories/dexie/trashRestoreSyncNotification.test.ts',
  'src/infrastructure/repositories/dexie/DexieRecipeRepository.c2.test.ts',
  'src/infrastructure/sync-prototype/syncPrototypeConfig.test.ts',
  'src/infrastructure/user-state/userStateAutomaticSyncNotification.test.ts',
  'docs/architecture/automatic-sync-0.23.0-f2.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Fichier de continuité automatique absent : ${path}.`);
}

function readSet(controller, constantName) {
  const match = controller.match(
    new RegExp(`${constantName}\\s*=\\s*\\n?\\s*new Set<[^>]+>\\(\\[([^\\]]*)\\]\\)`, 'm'),
  );
  if (!match) return undefined;
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((value) => value[1]);
}

function expectExactSet(controller, constantName, expectedValues) {
  const actual = readSet(controller, constantName);
  const expected = new Set(expectedValues);
  if (
    !actual
    || actual.length !== expected.size
    || actual.some((value) => !expected.has(value))
  ) {
    fail(`${constantName} doit contenir exactement : ${expectedValues.join(', ')}.`);
  }
}

if (failures.length === 0) {
  const controller = read('src/application/sync/automaticSyncController.ts');
  for (const marker of [
    "triggerLifecycle('application-start')",
    "triggerLifecycle('network-restored')",
    "triggerLifecycle('cloud-restore')",
    "triggerLifecycle('account-connected')",
    'triggerLocalChange',
    "source: 'local-change'",
    'safeRemoteConvergenceDomainIds',
    'safeLocalUploadDomainIds',
    'safeMergeDomainIds',
    'SAFE_MERGE_DOMAIN_IDS',
    "syncMode: 'cloud-only'",
    "syncMode: 'local-only'",
    "syncMode: 'bidirectional'",
    'foregroundMinimumIntervalMs',
    'automaticAccountSyncAccountFingerprint',
    "return this.connectionType() === 'wifi'",
    'SYNC_LOCAL_DATA_CHANGED_EVENT',
    'ENDURANCE_PLANNING_PERSISTED_EVENT',
    "this.triggerLocalChange(['activities'])",
    'identityGeneration',
    'isCurrentAccountOperation',
    'await this.client.syncNow()',
  ]) {
    if (!controller.includes(marker)) {
      fail(`Garde-fou de continuité automatique manquant : ${marker}.`);
    }
  }
  if (controller.includes('ENDURANCE_PLANNING_CHANGED_EVENT')) {
    fail('Le contrôleur automatique ne doit pas utiliser le signal UI du planning avant persistance.');
  }

  expectExactSet(controller, 'SAFE_REMOTE_CONVERGENCE_DOMAIN_IDS', [
    'strength',
    'goals',
    'weights',
    'activities',
  ]);
  expectExactSet(controller, 'SAFE_LOCAL_UPLOAD_DOMAIN_IDS', [
    'strength',
    'goals',
    'weights',
    'activities',
  ]);
  expectExactSet(controller, 'SAFE_MERGE_DOMAIN_IDS', [
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
      fail(`Le domaine automatique final ${domain} est absent de automaticDomainIds().`);
    }
  }

  if (controller.includes("hasCleanBaseline ? 'sync' : 'analyze'")) {
    fail('La continuité automatique ne doit pas écrire depuis une preview locale potentiellement périmée.');
  }

  const coordinator = read('src/app/sync/AutomaticSyncCoordinator.tsx');
  for (const marker of [
    'AutomaticSyncController',
    'document.visibilityState',
    'navigator.onLine',
    'connectionType: currentConnectionType',
  ]) {
    if (!coordinator.includes(marker)) fail(`Coordinateur automatique incomplet : ${marker}.`);
  }
  if (coordinator.includes('periodicSync') || coordinator.includes('serviceWorker.sync')) {
    fail('La continuité automatique ne doit pas dépendre d’une tâche PWA en arrière-plan non garantie sur iPhone.');
  }

  const app = read('src/app/App.tsx');
  if (!app.includes('<AutomaticSyncCoordinator />')) {
    fail('Le coordinateur automatique n’est pas monté dans l’application.');
  }

  const panel = read('src/features/settings/components/AutomaticSyncSettingsPanel.tsx');
  for (const marker of [
    'Continuité automatique',
    'Toute connexion',
    'Wi-Fi uniquement',
    'automaticWeightSyncEnabled: false',
    'Autoriser la continuité',
    'le journal nutritionnel, la bibliothèque nutritionnelle et le suivi nutritionnel',
    'seuls les domaines explicitement compatibles avec une fusion sûre peuvent résoudre automatiquement une divergence des deux côtés',
    'Un domaine désactivé, non autorisé ou hors périmètre automatique reste sans écriture automatique',
  ]) {
    if (!panel.includes(marker)) fail(`Réglage de continuité automatique incomplet : ${marker}.`);
  }

  const advancedSettings = read('src/features/settings/pages/AdvancedSettingsPage.tsx');
  if (!advancedSettings.includes('<AutomaticSyncSettingsPanel')) {
    fail('Le panneau de continuité automatique n’est pas exposé dans Synchronisation des données.');
  }

  const repositoryOperation = read('src/infrastructure/repositories/dexie/repositoryOperation.ts');
  if (!repositoryOperation.includes('notifySyncLocalDataChanged')) {
    fail('Les écritures de dépôt ne publient pas les modifications locales pour la continuité automatique.');
  }
  const repositoryMarkers = [
    ['DexieActivityRepository.ts', "['activities']"],
    ['DexieProfileRepository.ts', "['account-preferences']"],
    ['DexieFoodRepository.ts', "['nutrition-journal']"],
    ['DexieFoodRepository.ts', "['nutrition-library']"],
    ['DexieRecipeRepository.ts', "['nutrition-library']"],
    ['DexieTargetRepository.ts', "['nutrition-journal']"],
    ['DexieWeeklyReviewRepository.ts', "['nutrition-tracking']"],
    ['DexieStrengthSetRepository.ts', "['strength']"],
    ['DexieWorkoutSessionRepository.ts', "['strength']"],
    ['DexieWorkoutTemplateRepository.ts', "['strength']"],
    ['DexieStrengthExerciseRepository.ts', "['strength']"],
  ];
  for (const [filename, marker] of repositoryMarkers) {
    const content = read(`src/infrastructure/repositories/dexie/${filename}`);
    if (!content.includes(marker)) {
      fail(`Le dépôt ${filename} ne signale pas correctement son domaine ${marker}.`);
    }
  }

  const recipeRepository = read(
    'src/infrastructure/repositories/dexie/DexieRecipeRepository.ts',
  );
  if (!recipeRepository.includes('saveWithIngredients')) {
    fail('Le dépôt Recipe ne conserve pas la sauvegarde atomique recette + ingrédients.');
  }
  const recipeNotificationTest = read(
    'src/infrastructure/repositories/dexie/DexieRecipeRepository.c2.test.ts',
  );
  for (const marker of [
    'publie nutrition-library après la sauvegarde atomique durable',
    'ne publie rien si la sauvegarde atomique échoue',
  ]) {
    if (!recipeNotificationTest.includes(marker)) {
      fail(`Gate de notification Recipe absent : ${marker}.`);
    }
  }

  const adapters = read('src/application/sync/syncOrchestratorAdapters.ts');
  for (const marker of [
    'nutrition-library-product-remap',
    'nutrition-tracking-daily-target-recalculation',
    'remappedProductReferences > 0',
    'recalculatedDailyTargets > 0',
  ]) {
    if (!adapters.includes(marker)) {
      fail(`Chaînage automatique Nutrition incomplet : ${marker}.`);
    }
  }

  const trashRestore = read(
    'src/infrastructure/repositories/dexie/trashRestoreSyncNotification.ts',
  );
  for (const marker of [
    "restored.entityType === 'foodEntry'",
    "restored.entityType === 'meal'",
    "['nutrition-journal']",
    "restored.entityType === 'favoriteMeal'",
    "restored.entityType === 'recipe'",
    "['nutrition-library']",
  ]) {
    if (!trashRestore.includes(marker)) {
      fail(`Notification Corbeille Nutrition absente : ${marker}.`);
    }
  }

  const planning = read('src/domain/planning/endurancePlanningState.ts');
  for (const marker of [
    'ENDURANCE_PLANNING_CHANGED_EVENT',
    'ENDURANCE_PLANNING_PERSISTED_EVENT',
    'dispatchEndurancePlanningPersisted',
    '.then(() => persist(snapshot))',
  ]) {
    if (!planning.includes(marker)) {
      fail(`Le planning endurance ne verrouille pas la persistance durable : ${marker}.`);
    }
  }

  const settings = read('src/domain/models/settings.ts');
  for (const marker of [
    'automaticAccountSyncEnabled',
    'automaticAccountSyncConnectionMode',
    'automaticAccountSyncAccountFingerprint',
  ]) {
    if (!settings.includes(marker)) fail(`Préférence automatique absente : ${marker}.`);
  }

  const packageJson = JSON.parse(read('package.json'));
  if (
    packageJson.scripts?.['audit:automatic-sync'] !==
    'node scripts/audit-automatic-sync.mjs'
  ) {
    fail('Le script audit:automatic-sync est absent ou incohérent.');
  }
  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:automatic-sync')) {
      fail(`Le pipeline ${pipeline} n’exécute pas l’audit de continuité automatique.`);
    }
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_12\b/.test(versions)) {
    fail('La base métier doit utiliser Dexie v12.');
  }
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10\b/.test(backup)) {
    fail('La sauvegarde JSON doit rester en v10.');
  }
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 16')) {
    fail('Le runtime cloud doit utiliser la v16 pour les amitiés et permissions sociales.');
  }
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(packageJson.version))) {
    fail('La publication doit exposer une version sémantique.');
  }
}

if (failures.length > 0) {
  console.error('Audit continuité automatique échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit continuité automatique réussi : dix domaines non sociaux actifs, quatre domaines directionnels stricts, sept domaines merge-safe explicitement whitelistés, chaînages Nutrition et identité revalidée avant écriture.',
);
