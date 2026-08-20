import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/infrastructure/sync-prototype/realRewardsRoutinesSyncService.ts',
  'src/infrastructure/sync-prototype/realRewardsRoutinesSyncService.test.ts',
  'src/features/settings/components/RewardsRoutinesSyncSettingsPanel.tsx',
  'src/features/settings/components/RewardsRoutinesSyncSettingsPanel.test.tsx',
  'src/infrastructure/sync-prototype/rewardsRoutinesSyncEvents.ts',
  'src/app/rewardsRoutinesSyncReadiness.test.ts',
  'docs/architecture/rewards-routines-sync-0.22.0-e2.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Fichier E2 absent : ${path}.`);
}

if (failures.length === 0) {
  const service = read(requiredFiles[0]);
  for (const marker of [
    'REWARDS_ROUTINES_AGGREGATE_ID',
    'mergeAchievements',
    'mergeUnlockedThemes',
    'mergeWeeklyMissions',
    'mergeReminderCompletions',
    'localLooksUninitialized',
    'isDefaultRoutineReminderPreferencesSnapshot',
    'writeCloud !== false',
    'reloadUserStateRuntime',
    'notifyRoutineReminderChanged',
    'notifyRewardsRoutinesChanged',
  ]) {
    if (!service.includes(marker)) fail(`Garde-fou E2 manquant : ${marker}.`);
  }

  const settingsModel = read('src/domain/models/settings.ts');
  const settingsRepository = read(
    'src/infrastructure/repositories/dexie/DexieSettingsRepository.ts',
  );
  const accountPreferences = read(
    'src/infrastructure/sync-prototype/realAccountPreferencesSyncService.ts',
  );
  for (const source of [settingsModel, settingsRepository, accountPreferences]) {
    if (!source.includes('routineReminderUpdatedAt')) {
      fail('L’horodatage séparé des rappels est incomplet.');
    }
  }

  const database = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  for (const marker of [
    'SYNC_PROTOTYPE_DATABASE_VERSION = 17',
    "'realRewardsRoutines'",
    "realRewardsRoutines: 'id, updatedAt'",
  ]) {
    if (!database.includes(marker)) fail(`Schéma cloud E2 incomplet : ${marker}.`);
  }

  const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
  const deployment = read(
    'src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts',
  );
  for (const source of [config, deployment]) {
    if (!source.includes('VITE_ENABLE_REAL_REWARDS_ROUTINES_SYNC')) {
      fail('Le drapeau public E2 est absent.');
    }
  }

  const client = read('src/infrastructure/sync-prototype/syncPrototypeClient.ts');
  for (const marker of [
    'analyzeRealRewardsRoutines',
    'syncRealRewardsRoutines',
    'realRewardsRoutinesSyncEnabled',
  ]) {
    if (!client.includes(marker)) fail(`Client E2 incomplet : ${marker}.`);
  }

  const restore = read(
    'src/infrastructure/data-spaces/cloudAccountRestoreService.ts',
  );
  for (const marker of [
    'rewardsRoutines',
    'synchronizeRealRewardsRoutines',
    'earnedAchievements',
    'routineReminderCompletions',
  ]) {
    if (!restore.includes(marker)) fail(`Restauration E2 incomplète : ${marker}.`);
  }

  const panel = read(requiredFiles[2]);
  for (const marker of [
    'Synchronisation des récompenses et rappels',
    'Fusion non destructive',
    'Le mode clair ou sombre reste propre à chaque appareil.',
    '<ConfirmationDialog',
  ]) {
    if (!panel.includes(marker)) fail(`Interface E2 incomplète : ${marker}.`);
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
    packageJson.scripts?.['audit:rewards-routines-sync'] !==
    'node scripts/audit-rewards-routines-sync.mjs'
  ) {
    fail('Le script audit:rewards-routines-sync est absent ou incohérent.');
  }
  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:rewards-routines-sync')) {
      fail(`Le pipeline ${pipeline} n’exécute pas l’audit E2.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Audit E2 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit E2 réussi : badges, thèmes, missions et rappels fusionnés sans perte, préférences horodatées séparément, restauration initiale, isolation et runtime cloud v17 validés.',
);
