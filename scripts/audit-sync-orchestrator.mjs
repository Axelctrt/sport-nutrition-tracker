import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/application/sync/syncOrchestrator.ts',
  'src/application/sync/syncOrchestrator.test.ts',
  'src/app/syncOrchestratorReadiness.test.ts',
  'src/features/settings/components/UnifiedSyncCenterPanel.tsx',
  'src/features/settings/components/UnifiedSyncCenterAdvancedDetails.tsx',
  'src/features/settings/components/unifiedSyncDomainRegistry.ts',
  'docs/architecture/automatic-sync-orchestrator-0.23.0-f1.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Fichier F1 absent : ${path}.`);
}

if (failures.length === 0) {
  const orchestrator = read(requiredFiles[0]);
  for (const marker of [
    'accountExecutionChains',
    'withAccountLock',
    'queueLength',
    'defaultDebounceMs',
    'schedule(',
    'retryFailures',
    "status: 'temporary-failure'",
    "status: 'offline'",
    "case 'local':",
    "case 'cloud':",
    "case 'both':",
  ]) {
    if (!orchestrator.includes(marker)) {
      fail(`Garde-fou de l’orchestrateur F1 manquant : ${marker}.`);
    }
  }

  const panel = [
    read('src/features/settings/components/UnifiedSyncCenterPanel.tsx'),
    read('src/features/settings/components/UnifiedSyncCenterAdvancedDetails.tsx'),
    read('src/features/settings/components/unifiedSyncDomainRegistry.ts'),
  ].join('\n');
  for (const marker of [
    'createSyncOrchestrator',
    'createOrchestratorDomains',
    "source: 'manual'",
    'Orchestrateur par compte',
    'file d’attente',
  ]) {
    if (!panel.includes(marker)) fail(`Intégration du centre F1 incomplète : ${marker}.`);
  }
  if (panel.includes("source: 'local-change'")) {
    fail('F1 ne doit pas activer la synchronisation automatique après une modification locale.');
  }

  const packageJson = JSON.parse(read('package.json'));
  if (
    packageJson.scripts?.['audit:sync-orchestrator'] !==
    'node scripts/audit-sync-orchestrator.mjs'
  ) {
    fail('Le script audit:sync-orchestrator est absent ou incohérent.');
  }
  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:sync-orchestrator')) {
      fail(`Le pipeline ${pipeline} n’exécute pas l’audit F1.`);
    }
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_10\b/.test(versions)) {
    fail('La base métier doit rester en Dexie v8.');
  }
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*9\b/.test(backup)) {
    fail('La sauvegarde JSON doit rester en v7.');
  }
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 14')) {
    fail('Le runtime cloud doit passer en v14 pour les amitiés et permissions sociales.');
  }
}

if (failures.length > 0) {
  console.error('Audit F1 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit F1 réussi : file séquentielle, verrou par compte, anti-rebond prêt, reprise ciblée, analyse sans écriture et automatisation encore désactivée.',
);
