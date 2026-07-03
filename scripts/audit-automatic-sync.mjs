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
  'src/application/sync/automaticSyncEvents.ts',
  'src/application/sync/syncLocalChangeEvents.ts',
  'src/application/sync/syncOrchestratorAdapters.ts',
  'src/app/sync/AutomaticSyncCoordinator.tsx',
  'src/app/automaticSyncReadiness.test.ts',
  'src/features/settings/components/AutomaticSyncSettingsPanel.tsx',
  'src/features/settings/components/AutomaticSyncSettingsPanel.test.tsx',
  'docs/architecture/automatic-sync-0.23.0-f2.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Fichier F2 absent : ${path}.`);
}

if (failures.length === 0) {
  const controller = read('src/application/sync/automaticSyncController.ts');
  for (const marker of [
    "triggerLifecycle('application-start')",
    "triggerLifecycle('network-restored')",
    "triggerLifecycle('cloud-restore')",
    "triggerLifecycle('account-connected')",
    "triggerLocalChange",
    "source: 'local-change'",
    'differingEntityCount === 0',
    "hasCleanBaseline ? 'sync' : 'analyze'",
    'foregroundMinimumIntervalMs',
    'automaticAccountSyncAccountFingerprint',
    "return this.connectionType() === 'wifi'",
  ]) {
    if (!controller.includes(marker)) {
      fail(`Garde-fou F2 manquant dans le contrôleur : ${marker}.`);
    }
  }

  const coordinator = read('src/app/sync/AutomaticSyncCoordinator.tsx');
  for (const marker of [
    'AutomaticSyncController',
    'document.visibilityState',
    'navigator.onLine',
    'connectionType: currentConnectionType',
  ]) {
    if (!coordinator.includes(marker)) fail(`Coordinateur F2 incomplet : ${marker}.`);
  }
  if (coordinator.includes('periodicSync') || coordinator.includes('serviceWorker.sync')) {
    fail('F2 ne doit pas dépendre d’une tâche PWA en arrière-plan non garantie sur iPhone.');
  }

  const app = read('src/app/App.tsx');
  if (!app.includes('<AutomaticSyncCoordinator />')) {
    fail('Le coordinateur F2 n’est pas monté dans l’application.');
  }

  const panel = read('src/features/settings/components/AutomaticSyncSettingsPanel.tsx');
  for (const marker of [
    'Synchronisation automatique',
    'Toute connexion',
    'Wi-Fi uniquement',
    'automaticWeightSyncEnabled: false',
    'Activer pour ce compte',
  ]) {
    if (!panel.includes(marker)) fail(`Réglage F2 incomplet : ${marker}.`);
  }

  const advancedSettings = read('src/features/settings/pages/AdvancedSettingsPage.tsx');
  if (!advancedSettings.includes('<AutomaticSyncSettingsPanel')) {
    fail('Le panneau F2 n’est pas exposé dans Synchronisation des données.');
  }

  const repositoryOperation = read('src/infrastructure/repositories/dexie/repositoryOperation.ts');
  if (!repositoryOperation.includes('notifySyncLocalDataChanged')) {
    fail('Les écritures de dépôt ne publient pas les modifications locales pour F2.');
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

  const settings = read('src/domain/models/settings.ts');
  for (const marker of [
    'automaticAccountSyncEnabled',
    'automaticAccountSyncConnectionMode',
    'automaticAccountSyncAccountFingerprint',
  ]) {
    if (!settings.includes(marker)) fail(`Préférence F2 absente : ${marker}.`);
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
      fail(`Le pipeline ${pipeline} n’exécute pas l’audit F2.`);
    }
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8\b/.test(versions)) {
    fail('La base métier doit rester en Dexie v8.');
  }
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7\b/.test(backup)) {
    fail('La sauvegarde JSON doit rester en v7.');
  }
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 10')) {
    fail('Le runtime cloud doit rester en v10.');
  }
  if (JSON.parse(read('package.json')).version !== '0.23.0') {
    fail('La publication F4 doit exposer la version 0.23.0.');
  }
}

if (failures.length > 0) {
  console.error('Audit F2 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit F2 réussi : déclencheurs maîtrisés, autorisation par compte, analyse préalable, anti-rebond local, modes réseau et versions de stockage inchangées.',
);
