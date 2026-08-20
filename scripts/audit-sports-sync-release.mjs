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
  'RELEASE-NOTES-0.19.0.md',
  'docs/architecture/sports-sync-0.19.0-b1.md',
  'docs/architecture/sports-sync-0.19.0-b2.md',
  'docs/architecture/sports-sync-0.19.0-b3.md',
  'docs/architecture/sports-sync-0.19.0-b4.md',
  'src/infrastructure/sync-prototype/cloudSyncValue.ts',
  'src/infrastructure/sync-prototype/cloudSyncValue.test.ts',
  'src/infrastructure/sync-prototype/realGoalConcurrentResolutionService.ts',
  'src/infrastructure/sync-prototype/realGoalConcurrentResolutionService.test.ts',
  'src/infrastructure/sync-prototype/realGoalLwwConflictResolution.test.ts',
]) {
  read(path);
}

const cloudDatabase = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const expected of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 17',
  "'sportpilot-sync-runtime-0.20.0-v16'",
  'disableEagerSync: true',
  'realWeights',
  'realWeightDeletionRecords',
  'realActivities',
  'realEndurancePlanningSessions',
  'realActivityDeletionRecords',
  'realGoals',
  'realGoalDeletionRecords',
  'realStrengthExercises',
  'realWorkoutTemplates',
  'realWorkoutSessions',
  'realStrengthDeletionRecords',
  'realNutritionJournalDays',
  'realNutritionJournalDeletionRecords',
]) {
  if (!cloudDatabase.includes(expected)) {
    fail(`la base cloud ne contient pas ${expected}.`);
  }
}

const utility = read('src/infrastructure/sync-prototype/cloudSyncValue.ts');
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
  if (!utility.includes(expected)) {
    fail(`l’utilitaire commun ne contient pas ${expected}.`);
  }
}

const services = [
  ['pesées', 'src/infrastructure/sync-prototype/realWeightSyncService.ts', ['belongsToCurrentUser', 'chooseLatest', 'sameEntity']],
  ['activités', 'src/infrastructure/sync-prototype/realActivitySyncService.ts', ['belongsToCurrentUser', 'sameEntity']],
  ['objectifs', 'src/infrastructure/sync-prototype/realGoalSyncService.ts', ['belongsToCurrentUser', 'sameEntity', 'stableValue']],
  ['musculation', 'src/infrastructure/sync-prototype/realStrengthSyncService.ts', ['belongsToCurrentUser', 'chooseLatest', 'sameEntity']],
];
for (const [label, path, expectedHelpers] of services) {
  const service = read(path);
  if (!service.includes("from '@/infrastructure/sync-prototype/cloudSyncValue'")) {
    fail(`le service ${label} n’utilise pas les règles communes de convergence.`);
  }
  if (service.includes('function stableValue(') || service.includes('type CloudOwned<T>')) {
    fail(`le service ${label} conserve une implémentation locale divergente.`);
  }
  for (const expected of expectedHelpers) {
    if (!service.includes(expected)) {
      fail(`le service ${label} ne contient pas ${expected}.`);
    }
  }
}

const activities = read('src/infrastructure/sync-prototype/realActivitySyncService.ts');
if (/\bchooseLatest\b/.test(activities)) {
  fail('Activities ne doit pas utiliser chooseLatest : unknown/both doivent rester fail-closed.');
}
for (const expected of [
  'changeOrigin',
  'flushEndurancePlanningPersistence',
  "domainId: 'activities'",
  "entityId: 'activities'",
  'synchronizeRealActivitiesFromCloud',
  'synchronizeRealActivitiesToCloud',
  "requireChangeOrigin: 'cloud'",
  "requireChangeOrigin: 'local'",
  'applyCloudTargetIfUnchanged',
  'applyLocalTargetIfUnchanged',
  'cloudStateMatchesExpected',
  'persistEqualActivityBaseline',
  'restoreRealActivitiesFromCloudIntoEmptyLocal',
  'options.writeCloud !== false',
]) {
  if (!activities.includes(expected)) {
    fail(`la continuité sûre Activities ne verrouille pas ${expected}.`);
  }
}

const goals = read('src/infrastructure/sync-prototype/realGoalSyncService.ts');
if (/\bchooseLatest\b/.test(goals)) {
  fail('Goals ne doit pas déléguer sa règle métier concurrente à chooseLatest : le LWW logique par mutation doit rester explicite.');
}
for (const expected of [
  'prepareInitialRealGoalReconciliation',
  'applyInitialRealGoalReconciliation',
  "origin === 'local'",
  "origin === 'cloud'",
  'return emptyResult({',
  'ensureDomainBaselineMissing',
  'goalStateMutationTimestamp',
  'latestGoalState',
  'stableValue',
  'resolveMergedGoalLogicalState',
  'preserveRestorationMarker',
]) {
  if (!goals.includes(expected)) {
    fail(`la synchronisation Goals directionnelle/LWW ne verrouille pas ${expected}.`);
  }
}

const goalsFallback = read(
  'src/infrastructure/sync-prototype/realGoalConcurrentResolutionService.ts',
);
for (const expected of [
  'prepareRealGoalConcurrentReconciliation',
  'applyRealGoalConcurrentReconciliation',
  "origin !== 'both'",
  'baselineDigest',
  'readRequiredBaseline',
  'cloudStateMatchesExpected',
  'applyCloudTargetIfUnchanged',
  'applyLocalTargetIfUnchanged',
  'persistEqualBaseline',
]) {
  if (!goalsFallback.includes(expected)) {
    fail(`le fallback manuel Goals both ne verrouille pas ${expected}.`);
  }
}

const lwwGate = read(
  'src/infrastructure/sync-prototype/realGoalLwwConflictResolution.test.ts',
);
for (const expected of [
  'stableValue',
  'updatedAt',
  'deleted',
  'restored',
]) {
  if (!lwwGate.includes(expected)) {
    fail(`le gate LWW Goals ne couvre pas ${expected}.`);
  }
}

const strength = read('src/infrastructure/sync-prototype/realStrengthSyncService.ts');
for (const expected of [
  'resolveStrengthLogicalState',
  'sameLocalCollection',
  'localDatabase.transaction',
  'upsertLogicalCloudValue',
  'persistLogicalSyncBaseline',
  "marker.entityType === 'strengthSet'",
  "marker.entityType === 'workoutSessionExercise'",
]) {
  if (!strength.includes(expected)) {
    fail(`la synchronisation de la musculation ne contient pas ${expected}.`);
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
]) {
  if (!deployment.includes(`${variable}: 'true'`)) {
    fail(`la configuration publique n’active pas ${variable}.`);
  }
}

const scripts = packageJson.scripts ?? {};
if (scripts['audit:sports-sync-release'] !== 'node scripts/audit-sports-sync-release.mjs') {
  fail('le script audit:sports-sync-release est absent ou incohérent.');
}
for (const pipeline of ['check', 'ci']) {
  if (!String(scripts[pipeline] ?? '').includes('audit:sports-sync-release')) {
    fail(`le pipeline ${pipeline} n’exécute pas l’audit final de synchronisation.`);
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

if (failures.length > 0) {
  console.error('\nAudit du socle de synchronisation sportive échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit du socle sportif réussi : Activities conserve ses contrats directionnels fail-closed, Goals journalise ses mutations concurrentes avant résolution, le fallback manuel reste disponible, les suppressions durables et agrégats Strength atomiques sont préservés, runtime cloud v17 validé.',
  );
}
