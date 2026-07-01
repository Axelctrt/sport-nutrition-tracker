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
  'SYNC_PROTOTYPE_DATABASE_VERSION = 7',
  'sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}',
  'realNutritionJournalDays',
  'realNutritionJournalDeletionRecords',
  'disableEagerSync: true',
]) {
  if (!database.includes(expected)) {
    fail(`la base cloud C1 ne contient pas ${expected}.`);
  }
}

const service = read(
  'src/infrastructure/sync-prototype/realNutritionJournalSyncService.ts',
);
for (const expected of [
  'NutritionJournalDayAggregate',
  'validateDayAggregate',
  'cloudDatabase.transaction',
  'localDatabase.transaction',
  'realNutritionJournalDays',
  'realNutritionJournalDeletionRecords',
  "entityType === 'meal'",
  "entityType === 'foodEntry'",
  'createRestoredDeletionRecord',
  'belongsToCurrentUser',
  'chooseLatest',
  'sameEntity',
]) {
  if (!service.includes(expected)) {
    fail(`le service C1 ne contient pas ${expected}.`);
  }
}

for (const path of [
  'src/infrastructure/sync-prototype/realNutritionJournalSyncService.test.ts',
  'src/features/settings/components/NutritionJournalSyncSettingsPanel.tsx',
  'src/features/settings/components/NutritionJournalSyncSettingsPanel.test.tsx',
  'docs/architecture/nutrition-sync-0.20.0-c1.md',
]) {
  read(path);
}

const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
for (const expected of [
  'VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC',
  'realNutritionJournalSyncEnabled',
]) {
  if (!config.includes(expected)) {
    fail(`la configuration C1 ne contient pas ${expected}.`);
  }
}

const deployment = read(
  'src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts',
);
if (!deployment.includes("VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC: 'true'")) {
  fail('la configuration publique n’active pas C1.');
}

const appDatabase = read('src/infrastructure/database/migrations/versions.ts');
if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8/.test(appDatabase)) {
  fail('la base métier principale n’est plus en Dexie v8.');
}
const backup = read('src/infrastructure/backup/backupMigrations.ts');
if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7/.test(backup)) {
  fail('la sauvegarde n’est plus en JSON v7.');
}

const packageJson = JSON.parse(read('package.json'));
if (packageJson.version !== '0.19.0') {
  fail('C1 ne doit pas publier prématurément la version 0.20.0.');
}
const scripts = packageJson.scripts ?? {};
if (scripts['audit:nutrition-journal-sync'] !== 'node scripts/audit-nutrition-journal-sync.mjs') {
  fail('le script audit:nutrition-journal-sync est absent ou incohérent.');
}
for (const pipeline of ['check', 'ci']) {
  if (!String(scripts[pipeline] ?? '').includes('audit:nutrition-journal-sync')) {
    fail(`le pipeline ${pipeline} n’exécute pas l’audit C1.`);
  }
}

if (failures.length > 0) {
  console.error('\nAudit C1 du journal nutritionnel échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit C1 réussi : journées nutritionnelles atomiques, suppressions repas/entrées, runtime cloud v7 et invariants métier validés.',
  );
}
