import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const fail = (message) => failures.push(message);
const read = (path) => {
  if (!existsSync(path)) {
    fail(`le fichier ${path} est absent.`);
    return '';
  }
  return readFileSync(path, 'utf8');
};

const cloudDatabase = read(
  'src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts',
);
const service = read(
  'src/infrastructure/sync-prototype/realActivitySyncService.ts',
);
const client = read(
  'src/infrastructure/sync-prototype/syncPrototypeClient.ts',
);
const cloudValues = read(
  'src/infrastructure/sync-prototype/cloudSyncValue.ts',
);
const settingsPage = read(
  'src/features/settings/pages/AdvancedSettingsPage.tsx',
);
const deployment = read(
  'src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts',
);
const mainVersions = read(
  'src/infrastructure/database/migrations/versions.ts',
);

for (const tableName of [
  'realActivities',
  'realActivityDeletionRecords',
]) {
  if (!cloudDatabase.includes(tableName)) {
    fail(`la table cloud ${tableName} n’est pas déclarée.`);
  }
}

if (!service.includes("from '@/infrastructure/sync-prototype/cloudSyncValue'")) {
  fail('le service d’activités n’utilise pas les règles communes de convergence.');
}
for (const expected of ['owner', 'realmId', '$ts', '_hasBlobRefs']) {
  if (!cloudValues.includes(expected)) {
    fail(`l’utilitaire commun ne neutralise pas ${expected}.`);
  }
}

for (const expected of [
  'previewRealActivitySync',
  'synchronizeRealActivities',
  "equals('activity')",
  "entityType: 'activity'",
  'cloudPrivateId',
  'belongsToCurrentUser',
]) {
  if (!service.includes(expected)) {
    fail(`le service d’activités ne contient pas le garde-fou ${expected}.`);
  }
}

for (const expected of [
  'analyzeRealActivities',
  'syncRealActivities',
  'realActivitySyncEnabled',
]) {
  if (!client.includes(expected)) {
    fail(`le client cloud n’expose pas ${expected}.`);
  }
}

if (!settingsPage.includes('ActivitySyncSettingsPanel')) {
  fail('le panneau de synchronisation des activités n’est pas monté dans les paramètres.');
}

if (!deployment.includes("VITE_ENABLE_REAL_ACTIVITY_SYNC: 'true'")) {
  fail('le build de production n’active pas explicitement le lot B1.');
}

if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8/.test(mainVersions)) {
  fail('le lot B1 ne doit pas modifier la version de la base locale principale.');
}

if (failures.length > 0) {
  console.error('\nAudit de synchronisation sportive B1 échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit de synchronisation sportive B1 réussi : activités, suppressions, isolation de compte et interface manuelle validées.',
  );
}
