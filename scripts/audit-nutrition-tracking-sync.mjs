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

const database = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const expected of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 8',
  'sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}',
  'realNutritionTracking',
  'realNutritionJournalDays',
  'disableEagerSync: true',
]) {
  if (!database.includes(expected)) fail(`la base cloud C3 ne contient pas ${expected}.`);
}

const service = read('src/infrastructure/sync-prototype/realNutritionTrackingSyncService.ts');
for (const expected of [
  'NutritionTrackingAggregate',
  'AcceptedCalorieAdjustment',
  'validateAggregate',
  'resolveAcceptedCalibrationAdjustment',
  'reconcileDailyTargets',
  'localDatabase.transaction',
  'belongsToCurrentUser',
  'chooseLatest',
  'sameEntity',
]) {
  if (!service.includes(expected)) fail(`le service C3 ne contient pas ${expected}.`);
}

const client = read('src/infrastructure/sync-prototype/syncPrototypeClient.ts');
for (const expected of [
  'analyzeRealNutritionTracking',
  'syncRealNutritionTracking',
  'synchronizeRealNutritionJournal',
]) {
  if (!client.includes(expected)) fail(`le client C3 ne contient pas ${expected}.`);
}

for (const path of [
  'src/infrastructure/sync-prototype/realNutritionTrackingSyncService.test.ts',
  'src/features/settings/components/NutritionTrackingSyncSettingsPanel.tsx',
  'src/features/settings/components/NutritionTrackingSyncSettingsPanel.test.tsx',
  'docs/architecture/nutrition-sync-0.20.0-c3.md',
]) read(path);

const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
for (const expected of [
  'VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC',
  'realNutritionTrackingSyncEnabled',
]) {
  if (!config.includes(expected)) fail(`la configuration C3 ne contient pas ${expected}.`);
}

const deployment = read('src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts');
if (!deployment.includes("VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC: 'true'")) {
  fail('la configuration publique n’active pas C3.');
}

const versions = read('src/infrastructure/database/migrations/versions.ts');
if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8/.test(versions)) {
  fail('la base métier principale n’est plus en Dexie v8.');
}
const backup = read('src/infrastructure/backup/backupMigrations.ts');
if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7/.test(backup)) {
  fail('la sauvegarde n’est plus en JSON v7.');
}

const packageJson = JSON.parse(read('package.json'));
if (packageJson.version !== '0.20.0') {
  fail('la release finale doit publier la version 0.20.0.');
}
const scripts = packageJson.scripts ?? {};
if (scripts['audit:nutrition-tracking-sync'] !== 'node scripts/audit-nutrition-tracking-sync.mjs') {
  fail('le script audit:nutrition-tracking-sync est absent ou incohérent.');
}
for (const pipeline of ['check', 'ci']) {
  if (!String(scripts[pipeline] ?? '').includes('audit:nutrition-tracking-sync')) {
    fail(`le pipeline ${pipeline} n’exécute pas l’audit C3.`);
  }
}

if (failures.length > 0) {
  console.error('\nAudit C3 du suivi nutritionnel échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit C3 réussi : bilans et ajustements atomiques, objectifs quotidiens recalculés, propagation C1 et runtime cloud v8 validés.',
  );
}
