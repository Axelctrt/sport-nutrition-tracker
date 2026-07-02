import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const expectedVersion = '0.21.1';

if (packageJson.version !== expectedVersion) {
  fail(`package.json doit publier ${expectedVersion}.`);
}
if (
  packageLock.version !== expectedVersion
  || packageLock.packages?.['']?.version !== expectedVersion
) {
  fail('package-lock.json ne correspond pas à la version 0.21.1.');
}

const requiredFiles = [
  'src/features/account-devices/pages/AccountDevicesPage.tsx',
  'src/features/account-devices/components/GuestDataImportPanel.tsx',
  'src/features/account-devices/components/CloudAccountRestorePanel.tsx',
  'src/infrastructure/data-spaces/guestDataImportService.ts',
  'src/infrastructure/data-spaces/cloudAccountRestoreService.ts',
  'src/app/data-spaces/DataSpaceAccountGate.tsx',
  'src/app/dataContinuityReleaseReadiness.test.ts',
  'scripts/audit-account-management.mjs',
  'scripts/audit-guest-data-import.mjs',
  'scripts/audit-cloud-account-restore.mjs',
  'docs/architecture/guest-data-import-0.21.0-d2.md',
  'docs/architecture/cloud-account-restore-0.21.0-d3.md',
  'docs/architecture/data-continuity-release-0.21.0-d4.md',
  'docs/architecture/nutrition-journal-idempotence-0.21.1.md',
  'RELEASE-NOTES-0.21.0.md',
  'RELEASE-NOTES-0.21.1.md',
];
for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier requis absent : ${path}.`);
}

if (failures.length === 0) {
  const accountPage = read('src/features/account-devices/pages/AccountDevicesPage.tsx');
  for (const marker of ['<GuestDataImportPanel', '<CloudAccountRestorePanel']) {
    if (!accountPage.includes(marker)) {
      fail(`Compte et appareils ne contient pas ${marker}.`);
    }
  }

  const gate = read('src/app/data-spaces/DataSpaceAccountGate.tsx');
  for (const marker of ['<GuestDataImportPanel', '<CloudAccountRestorePanel']) {
    if (!gate.includes(marker)) {
      fail(`La barrière de compte ne contient pas ${marker}.`);
    }
  }

  const guestImport = read('src/infrastructure/data-spaces/guestDataImportService.ts');
  for (const marker of [
    'prepareGuestDataImport',
    'applyPreparedGuestDataImport',
    'sourceFingerprint',
    'targetFingerprint',
    'targetHandle.database.transaction("rw"',
  ]) {
    if (!guestImport.includes(marker)) fail(`garde-fou D2 absent : ${marker}.`);
  }
  if (guestImport.includes('sourceHandle.database.clear')) {
    fail('D2 ne doit jamais vider l’espace invité.');
  }

  const restore = read('src/infrastructure/data-spaces/cloudAccountRestoreService.ts');
  for (const marker of [
    'prepareCloudAccountRestore',
    'applyPreparedCloudAccountRestore',
    'sourceFingerprint',
    'targetFingerprint',
    'new AppDatabase(stageDatabaseName)',
    'restoreTo(stageDatabase)',
  ]) {
    if (!restore.includes(marker)) fail(`garde-fou D3 absent : ${marker}.`);
  }

  const runtime = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
  if (!runtime.includes('SYNC_PROTOTYPE_DATABASE_VERSION = 8')) {
    fail('le runtime cloud v8 attendu est absent.');
  }
  if (!runtime.includes('sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}')) {
    fail('le nom du runtime cloud validé a changé sans migration déclarée.');
  }

  const databaseVersions = read('src/infrastructure/database/migrations/versions.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8\b/.test(databaseVersions)) {
    fail('le schéma métier doit rester en Dexie v8.');
  }
  const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7\b/.test(backupMigrations)) {
    fail('la sauvegarde JSON doit rester en v7.');
  }
  const dataSpace = read('src/domain/data-spaces/dataSpace.ts');
  if (!/DATA_SPACE_REGISTRY_VERSION\s*=\s*1\s+as\s+const/.test(dataSpace)) {
    fail('le registre local des espaces doit rester en v1.');
  }

  for (const audit of [
    'audit:account-management',
    'audit:guest-data-import',
    'audit:cloud-account-restore',
    'audit:data-continuity-release',
    'audit:account-isolation',
  ]) {
    if (!packageJson.scripts?.[audit]) fail(`script ${audit} absent.`);
    for (const pipeline of ['check', 'ci']) {
      if (!String(packageJson.scripts?.[pipeline] ?? '').includes(audit)) {
        fail(`le pipeline ${pipeline} n’exécute pas ${audit}.`);
      }
    }
  }

  const releaseNotes = read('RELEASE-NOTES-0.21.0.md');
  for (const marker of [
    'Gestion du compte',
    'Import des données invitées',
    'Restauration après nouvelle installation',
    'Aucune migration',
  ]) {
    if (!releaseNotes.includes(marker)) {
      fail(`les notes de version 0.21.0 ne contiennent pas : ${marker}.`);
    }
  }

  const hotfixNotes = read('RELEASE-NOTES-0.21.1.md');
  for (const marker of [
    'divergence répétitive du journal nutritionnel',
    'updatedAt',
    'idempotent',
    'Aucune migration',
  ]) {
    if (!hotfixNotes.includes(marker)) {
      fail(`les notes de version 0.21.1 ne contiennent pas : ${marker}.`);
    }
  }

  const targetRepository = read(
    'src/infrastructure/repositories/dexie/DexieTargetRepository.ts',
  );
  for (const marker of [
    'hasSameTargetData',
    'normalizeComparableValue',
    'return current;',
  ]) {
    if (!targetRepository.includes(marker)) {
      fail(`le correctif d’idempotence 0.21.1 ne contient pas ${marker}.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Audit D4 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit D4 réussi : version 0.21.1, continuité des données, idempotence du journal nutritionnel, isolation, documentation et versions de données validées.',
);
