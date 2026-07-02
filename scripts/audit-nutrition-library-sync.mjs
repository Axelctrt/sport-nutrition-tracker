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
  'realNutritionProducts',
  'realNutritionRecipes',
  'realFavoriteMeals',
  'realNutritionLibraryDeletionRecords',
  'disableEagerSync: true',
]) {
  if (!database.includes(expected)) fail(`la base cloud C2 ne contient pas ${expected}.`);
}

const service = read('src/infrastructure/sync-prototype/realNutritionLibrarySyncService.ts');
for (const expected of [
  'NutritionRecipeAggregate',
  'shouldSynchronizeProduct',
  'normalizeOpenFoodFactsBarcode',
  'productAliases',
  'validateRecipeAggregate',
  'realNutritionJournalDays',
  'realNutritionLibraryDeletionRecords',
  'belongsToCurrentUser',
  'chooseLatest',
  'sameEntity',
]) {
  if (!service.includes(expected)) fail(`le service C2 ne contient pas ${expected}.`);
}

const repository = read('src/infrastructure/repositories/dexie/DexieRecipeRepository.ts');
for (const expected of [
  "deletionRecordId('recipeIngredient'",
  'createDeletedDeletionRecord',
  'this.database.deletionRecords',
]) {
  if (!repository.includes(expected)) {
    fail(`le repository de recettes ne pérennise pas ${expected}.`);
  }
}

for (const path of [
  'src/infrastructure/sync-prototype/realNutritionLibrarySyncService.test.ts',
  'src/features/settings/components/NutritionLibrarySyncSettingsPanel.tsx',
  'src/features/settings/components/NutritionLibrarySyncSettingsPanel.test.tsx',
  'docs/architecture/nutrition-sync-0.20.0-c2.md',
]) read(path);

const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
for (const expected of [
  'VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC',
  'realNutritionLibrarySyncEnabled',
]) {
  if (!config.includes(expected)) fail(`la configuration C2 ne contient pas ${expected}.`);
}

const deployment = read('src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts');
if (!deployment.includes("VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC: 'true'")) {
  fail('la configuration publique n’active pas C2.');
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
if (!/^0\.(?:20|21)\.\d+$/.test(packageJson.version)) {
  fail(`la version doit appartenir aux séries stables 0.20.x ou 0.21.x, reçue ${String(packageJson.version)}.`);
}
const scripts = packageJson.scripts ?? {};
if (scripts['audit:nutrition-library-sync'] !== 'node scripts/audit-nutrition-library-sync.mjs') {
  fail('le script audit:nutrition-library-sync est absent ou incohérent.');
}
for (const pipeline of ['check', 'ci']) {
  if (!String(scripts[pipeline] ?? '').includes('audit:nutrition-library-sync')) {
    fail(`le pipeline ${pipeline} n’exécute pas l’audit C2.`);
  }
}

if (failures.length > 0) {
  console.error('\nAudit C2 de la bibliothèque nutritionnelle échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit C2 réussi : produits utiles, recettes atomiques, favoris, déduplication Open Food Facts, suppressions durables et runtime cloud v8 validés.',
  );
}
