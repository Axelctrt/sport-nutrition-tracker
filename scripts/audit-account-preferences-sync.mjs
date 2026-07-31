import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/infrastructure/sync-prototype/realAccountPreferencesSyncService.ts',
  'src/infrastructure/sync-prototype/realAccountPreferencesSyncService.test.ts',
  'src/features/settings/components/AccountPreferencesSyncSettingsPanel.tsx',
  'src/features/settings/components/AccountPreferencesSyncSettingsPanel.test.tsx',
  'src/infrastructure/sync-prototype/accountPreferencesSyncEvents.ts',
  'src/app/accountPreferencesSyncReadiness.test.ts',
  'docs/architecture/account-preferences-sync-0.22.0-e1.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Fichier E1 absent : ${path}.`);
}

if (failures.length === 0) {
  const service = read(requiredFiles[0]);
  for (const marker of [
    'ACCOUNT_PREFERENCES_AGGREGATE_ID',
    'createSyncedUserSettingsSnapshot',
    'routineReminderPreferences: _routineReminderPreferences',
    'isDefaultSyncedUserSettings',
    'localLooksUninitialized',
    'writeCloud !== false',
    'notifyAccountPreferencesChanged',
  ]) {
    if (!service.includes(marker)) fail(`Garde-fou E1 manquant : ${marker}.`);
  }

  const settingsRepository = read(
    'src/infrastructure/repositories/dexie/DexieSettingsRepository.ts',
  );
  for (const marker of [
    'syncableUpdatedAt',
    "key !== 'routineReminderPreferences'",
  ]) {
    if (!settingsRepository.includes(marker)) {
      fail(`Horodatage partageable incomplet : ${marker}.`);
    }
  }

  const database = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  for (const marker of [
    'SYNC_PROTOTYPE_DATABASE_VERSION = 16',
    "'realAccountPreferences'",
    "realAccountPreferences: 'id, updatedAt'",
  ]) {
    if (!database.includes(marker)) fail(`Schéma cloud E1 incomplet : ${marker}.`);
  }

  const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
  const deployment = read(
    'src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts',
  );
  for (const source of [config, deployment]) {
    if (!source.includes('VITE_ENABLE_REAL_ACCOUNT_PREFERENCES_SYNC')) {
      fail('Le drapeau public E1 est absent.');
    }
  }

  const client = read('src/infrastructure/sync-prototype/syncPrototypeClient.ts');
  for (const marker of [
    'analyzeRealAccountPreferences',
    'syncRealAccountPreferences',
    'realAccountPreferencesSyncEnabled',
  ]) {
    if (!client.includes(marker)) fail(`Client E1 incomplet : ${marker}.`);
  }

  const restore = read(
    'src/infrastructure/data-spaces/cloudAccountRestoreService.ts',
  );
  for (const marker of [
    'accountPreferences',
    'synchronizeRealAccountPreferences',
    'isDefaultSyncedUserSettings',
  ]) {
    if (!restore.includes(marker)) fail(`Restauration E1 incomplète : ${marker}.`);
  }

  const panel = read(requiredFiles[2]);
  for (const marker of [
    'Synchronisation du profil et des réglages',
    'Les thèmes de récompense et les rappels disposent désormais de leur synchronisation E2 séparée.',
    '<ConfirmationDialog',
  ]) {
    if (!panel.includes(marker)) fail(`Interface E1 incomplète : ${marker}.`);
  }

  const localVersions = read(
    'src/infrastructure/database/migrations/versions.ts',
  );
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_12\b/.test(localVersions)) {
    fail('La base métier doit utiliser Dexie v12.');
  }
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10\b/.test(backup)) {
    fail('La sauvegarde JSON doit rester en v10.');
  }

  const packageJson = JSON.parse(read('package.json'));
  if (
    packageJson.scripts?.['audit:account-preferences-sync'] !==
    'node scripts/audit-account-preferences-sync.mjs'
  ) {
    fail('Le script audit:account-preferences-sync est absent ou incohérent.');
  }
  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:account-preferences-sync')) {
      fail(`Le pipeline ${pipeline} n’exécute pas l’audit E1.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Audit E1 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit E1 réussi : profil, réglages partageables, exclusions appareil/domaine E2, restauration initiale, isolation et runtime cloud v16 validés.',
);
