import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredBehaviorSuites = [
  'src/infrastructure/sync-prototype/accountMultiDeviceContinuity.integration.test.ts',
  'src/infrastructure/sync-prototype/realStrengthSyncService.test.ts',
  'src/application/sync/automaticSyncController.test.ts',
  'src/application/sync/syncOrchestrator.test.ts',
  'src/application/sync/syncOrchestratorAdapters.test.ts',
  'src/infrastructure/data-spaces/cloudAccountRestoreService.test.ts',
  'src/app/data-spaces/DataSpaceAccountGate.test.tsx',
  'src/infrastructure/data-spaces/accountDataIsolation.integration.test.ts',
  'src/infrastructure/data-spaces/accountDataSpaceService.test.ts',
  'src/infrastructure/data-spaces/guestDataImportService.test.ts',
  'src/application/account/cloudAccountAccess.test.ts',
];
for (const path of requiredBehaviorSuites) {
  if (!existsSync(join(root, path))) {
    fail(`suite comportementale P0 absente : ${path}.`);
  }
}

const requiredStructuralFiles = [
  'src/application/sync/automaticSyncController.ts',
  'src/application/sync/syncOrchestrator.ts',
  'src/application/sync/syncOrchestratorAdapters.ts',
  'src/infrastructure/sync-prototype/realStrengthSyncService.ts',
  'src/infrastructure/sync-prototype/logicalSyncState.ts',
  'src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts',
  'src/infrastructure/data-spaces/cloudAccountRestoreService.ts',
  'src/infrastructure/data-spaces/accountContinuityInitializationService.ts',
  'src/infrastructure/database/migrations/versions.ts',
  'src/infrastructure/backup/backupMigrations.ts',
];
for (const path of requiredStructuralFiles) {
  if (!existsSync(join(root, path))) {
    fail(`garde-fou structurel P0 absent : ${path}.`);
  }
}

if (failures.length === 0) {
  const packageJson = JSON.parse(read('package.json'));
  const scripts = packageJson.scripts ?? {};

  if (scripts.test !== 'vitest run') {
    fail('la gate P0 attend que npm test exécute toute la suite Vitest via `vitest run`.');
  }
  if (
    scripts['audit:p0-account-continuity']
    !== 'node scripts/audit-p0-account-continuity.mjs'
  ) {
    fail('le script audit:p0-account-continuity est absent ou incohérent.');
  }

  const requiredAudits = [
    'audit:sync-orchestrator',
    'audit:automatic-sync',
    'audit:automatic-sync-release',
    'audit:strength-sync',
    'audit:guest-data-import',
    'audit:cloud-account-restore',
    'audit:account-isolation',
    'audit:full-account-continuity-release',
    'audit:data-continuity-release',
    'audit:p0-account-continuity',
  ];
  for (const audit of requiredAudits) {
    if (!scripts[audit]) fail(`script P0 requis absent : ${audit}.`);
    for (const pipeline of ['check', 'ci']) {
      if (!String(scripts[pipeline] ?? '').includes(`npm run ${audit}`)) {
        fail(`le pipeline ${pipeline} n’intègre pas ${audit}.`);
      }
    }
  }

  const integrationTest = read(
    'src/infrastructure/sync-prototype/accountMultiDeviceContinuity.integration.test.ts',
  );
  for (const structuralMarker of [
    'createSyncOrchestratorDomains',
    'createSyncOrchestrator',
    "syncMode: 'local-only'",
    "syncMode: 'cloud-only'",
    'synchronizeRealStrengthToCloud',
    'synchronizeRealStrengthFromCloud',
    'replicateStrengthCloud',
  ]) {
    if (!integrationTest.includes(structuralMarker)) {
      fail(`contrat structurel du test A→B absent : ${structuralMarker}.`);
    }
  }

  const adapters = read('src/application/sync/syncOrchestratorAdapters.ts');
  for (const marker of [
    "syncMode === 'cloud-only'",
    "syncMode === 'local-only'",
    'client.syncRealStrengthFromCloud',
    'client.syncRealStrengthToCloud',
  ]) {
    if (!adapters.includes(marker)) {
      fail(`routage directionnel S1/S2 absent : ${marker}.`);
    }
  }

  const strength = read(
    'src/infrastructure/sync-prototype/realStrengthSyncService.ts',
  );
  for (const marker of [
    'synchronizeRealStrengthFromCloud',
    'synchronizeRealStrengthToCloud',
    "requireChangeOrigin: 'cloud'",
    "requireChangeOrigin: 'local'",
    'requireCloudStateMatch: true',
  ]) {
    if (!strength.includes(marker)) {
      fail(`primitive directionnelle Strength absente : ${marker}.`);
    }
  }

  const controller = read('src/application/sync/automaticSyncController.ts');
  const whitelist = (constantName) => {
    const match = controller.match(
      new RegExp(`${constantName}\\s*=\\s*\\n?\\s*new Set<[^>]+>\\(\\[([^\\]]*)\\]\\)`, 'm'),
    );
    if (!match) return undefined;
    return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((value) => value[1]);
  };
  for (const constantName of [
    'SAFE_REMOTE_CONVERGENCE_DOMAIN_IDS',
    'SAFE_LOCAL_UPLOAD_DOMAIN_IDS',
  ]) {
    const values = whitelist(constantName);
    if (!values || values.length !== 1 || values[0] !== 'strength') {
      fail(`${constantName} doit rester strictement limité à Strength.`);
    }
  }

  const cloudDatabase = read(
    'src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts',
  );
  if (!cloudDatabase.includes("unsyncedTables: ['realSyncBaselines']")) {
    fail('realSyncBaselines doit rester local à chaque replica cloud/appareil.');
  }

  const databaseVersions = read(
    'src/infrastructure/database/migrations/versions.ts',
  );
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_12\b/.test(databaseVersions)) {
    fail('S5 ne doit pas modifier Dexie métier : version 12 attendue.');
  }
  const backupMigrations = read(
    'src/infrastructure/backup/backupMigrations.ts',
  );
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10\b/.test(backupMigrations)) {
    fail('S5 ne doit pas modifier le schéma backup : version 10 attendue.');
  }
}

if (failures.length > 0) {
  console.error('Audit P0 continuité multi-appareils échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit P0 continuité multi-appareils réussi : contrats structurels S0–S5 présents, suites comportementales intégrées à Vitest, primitives directionnelles limitées à Strength, baselines par replica et versions Dexie/backup préservées. Les comportements A→B restent prouvés par Vitest, pas par cet audit structurel.',
);
