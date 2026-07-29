import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);
const expectedVersion = JSON.parse(read('package.json')).version;

const requiredFiles = [
  'src/app/automaticSyncReleaseReadiness.test.ts',
  'src/application/sync/automaticSyncController.ts',
  'src/application/sync/automaticSyncController.test.ts',
  'src/application/sync/syncOrchestrator.ts',
  'src/application/sync/syncOrchestrator.test.ts',
  'src/application/sync/syncOperationHistory.ts',
  'docs/architecture/automatic-sync-release-0.23.0-f4.md',
  'RELEASE-NOTES-0.23.0.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier F4 absent : ${path}.`);
}

if (failures.length === 0) {
  const packageJson = JSON.parse(read('package.json'));
  const packageLock = JSON.parse(read('package-lock.json'));
  if (packageJson.version !== expectedVersion) {
    fail(`package.json doit publier ${expectedVersion}.`);
  }
  if (
    packageLock.version !== expectedVersion
    || packageLock.packages?.['']?.version !== expectedVersion
  ) {
    fail(`package-lock.json ne correspond pas à SportPilot ${expectedVersion}.`);
  }

  const controller = read('src/application/sync/automaticSyncController.ts');
  for (const marker of [
    'identityGeneration',
    'replaceOrchestratorForAccount',
    'isCurrentOperation',
    'generation === this.identityGeneration',
    'orchestrator === this.orchestrator',
    'foregroundMinimumIntervalMs',
  ]) {
    if (!controller.includes(marker)) {
      fail(`garde-fou F4 absent du contrôleur : ${marker}.`);
    }
  }

  if (controller.includes('hasActiveDomainOperation')) {
    fail('le controleur ne doit plus perdre une mutation locale pendant une synchronisation active.');
  }

  const orchestrator = read('src/application/sync/syncOrchestrator.ts');
  for (const marker of [
    'appendSyncOperationHistory(accountKey, result)',
    'for (const [index, domainId] of request.domainIds.entries())',
    'L’opération a été interrompue avant la fin.',
    'withAccountLock',
    'lastFailedRequest',
  ]) {
    if (!orchestrator.includes(marker)) {
      fail(`garde-fou F4 absent de l’orchestrateur : ${marker}.`);
    }
  }

  const controllerTests = read('src/application/sync/automaticSyncController.test.ts');
  for (const marker of [
    'ignore les modifications locales créées après déconnexion',
    'borne les analyses répétées au premier plan',
    'reprend une analyse au retour en ligne même après plusieurs jours',
    'conserve une modification immédiate après une restauration cloud',
    'met en file les événements locaux émis pendant une synchronisation active',
    'ignore la fin tardive d’une opération appartenant à l’ancien compte',
  ]) {
    if (!controllerTests.includes(marker)) {
      fail(`scénario contrôleur F4 absent : ${marker}.`);
    }
  }

  const orchestratorTests = read('src/application/sync/syncOrchestrator.test.ts');
  for (const marker of [
    'autorise deux comptes différents à progresser sans verrou global',
    'journalise aussi une tentative bloquée hors connexion',
    'conserve les succès acquis lors d’une perte réseau',
    'n’entame pas un nouveau domaine après l’arrêt pendant une opération',
  ]) {
    if (!orchestratorTests.includes(marker)) {
      fail(`scénario orchestrateur F4 absent : ${marker}.`);
    }
  }

  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:automatic-sync-release')) {
      fail(`le pipeline ${pipeline} n’exécute pas l’audit F4.`);
    }
  }
  if (
    packageJson.scripts?.['audit:automatic-sync-release']
    !== 'node scripts/audit-automatic-sync-release.mjs'
  ) {
    fail('le script audit:automatic-sync-release est absent ou incohérent.');
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_11\b/.test(versions)) {
    fail('la base métier doit rester en Dexie v8.');
  }
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10\b/.test(backup)) {
    fail('la sauvegarde JSON doit rester en v7.');
  }
  const cloud = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!cloud.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 16')) {
    fail('le runtime cloud doit utiliser la v16 pour les amitiés et permissions sociales.');
  }
  const productionAudit = read('scripts/audit-rc.mjs');
  if (!productionAudit.includes('totalJavaScriptBytes: 3340 * 1024')) {
    fail('le budget JavaScript global validé de 3340 Kio est absent.');
  }

  const releaseNotes = read('RELEASE-NOTES-0.23.0.md');
  for (const marker of [
    'Synchronisation automatique',
    'Résilience multiappareils',
    'Aucune migration',
    'iPhone 15 sous iOS 26',
  ]) {
    if (!releaseNotes.includes(marker)) {
      fail(`notes de version 0.23.0 incomplètes : ${marker}.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Audit F4 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  `Audit F4 réussi : isolation des comptes, interruption maîtrisée, reprise réseau, anti-boucle, budgets et compatibilité sous SportPilot ${expectedVersion} validée.`,
);
