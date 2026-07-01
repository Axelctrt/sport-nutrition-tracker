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
  'RELEASE-NOTES-0.19.0.md',
  'docs/architecture/sports-sync-0.19.0-b1.md',
  'docs/architecture/sports-sync-0.19.0-b2.md',
  'docs/architecture/sports-sync-0.19.0-b3.md',
  'docs/architecture/sports-sync-0.19.0-b4.md',
  'src/infrastructure/sync-prototype/cloudSyncValue.ts',
  'src/infrastructure/sync-prototype/cloudSyncValue.test.ts',
]) {
  read(path);
}

const cloudDatabase = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const expected of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 8',
  'sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}',
  'disableEagerSync: true',
  'realWeights',
  'realWeightDeletionRecords',
  'realActivities',
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
  ['pesées', 'src/infrastructure/sync-prototype/realWeightSyncService.ts'],
  ['activités', 'src/infrastructure/sync-prototype/realActivitySyncService.ts'],
  ['objectifs', 'src/infrastructure/sync-prototype/realGoalSyncService.ts'],
  ['musculation', 'src/infrastructure/sync-prototype/realStrengthSyncService.ts'],
];
for (const [label, path] of services) {
  const service = read(path);
  if (!service.includes("from '@/infrastructure/sync-prototype/cloudSyncValue'")) {
    fail(`le service ${label} n’utilise pas les règles communes de convergence.`);
  }
  if (service.includes('function stableValue(') || service.includes('type CloudOwned<T>')) {
    fail(`le service ${label} conserve une implémentation locale divergente.`);
  }
  for (const expected of ['belongsToCurrentUser', 'chooseLatest', 'sameEntity']) {
    if (!service.includes(expected)) {
      fail(`le service ${label} ne contient pas ${expected}.`);
    }
  }
}

const strength = read('src/infrastructure/sync-prototype/realStrengthSyncService.ts');
for (const expected of [
  'applyTemplateAggregate',
  'applySessionAggregate',
  'database.transaction',
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
if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8/.test(databaseVersions)) {
  fail('la base métier principale n’est plus en Dexie v8.');
}
const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7/.test(backupMigrations)) {
  fail('la sauvegarde n’est plus en JSON v7.');
}

if (failures.length > 0) {
  console.error('\nAudit du socle de synchronisation sportive échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit du socle sportif réussi : quatre domaines synchronisés, convergence commune, suppressions durables, agrégats de musculation atomiques et runtime cloud v8 validés.',
  );
}
