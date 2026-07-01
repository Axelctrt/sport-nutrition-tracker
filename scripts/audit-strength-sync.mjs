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
  'src/infrastructure/sync-prototype/realStrengthSyncService.ts',
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
const panel = read(
  'src/features/settings/components/StrengthSyncSettingsPanel.tsx',
);
const deployment = read(
  'src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts',
);
const mainVersions = read(
  'src/infrastructure/database/migrations/versions.ts',
);

for (const expected of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 6',
  'sportpilot-sync-runtime-0.20.0-v${SYNC_PROTOTYPE_DATABASE_VERSION}',
]) {
  if (!cloudDatabase.includes(expected)) {
    fail(`le runtime cloud B3 ne contient pas le garde-fou ${expected}.`);
  }
}

for (const tableName of [
  'realStrengthExercises',
  'realWorkoutTemplates',
  'realWorkoutSessions',
  'realStrengthDeletionRecords',
]) {
  if (!cloudDatabase.includes(tableName)) {
    fail(`la table cloud ${tableName} n’est pas déclarée.`);
  }
}

if (!service.includes("from '@/infrastructure/sync-prototype/cloudSyncValue'")) {
  fail('le service B3 n’utilise pas les règles communes de convergence.');
}
for (const expected of ['owner', 'realmId', '$ts', '_hasBlobRefs']) {
  if (!cloudValues.includes(expected)) {
    fail(`l’utilitaire commun ne neutralise pas ${expected}.`);
  }
}

for (const expected of [
  'previewRealStrengthSync',
  'synchronizeRealStrength',
  'applyTemplateAggregate',
  'applySessionAggregate',
  'database.transaction',
  "marker.entityType === 'strengthSet'",
  "marker.entityType === 'workoutSessionExercise'",
  "exercise.source === 'user'",
  'belongsToCurrentUser',
]) {
  if (!service.includes(expected)) {
    fail(`le service B3 ne contient pas le garde-fou ${expected}.`);
  }
}

for (const expected of [
  'analyzeRealStrength',
  'syncRealStrength',
  'realStrengthSyncEnabled',
]) {
  if (!client.includes(expected)) {
    fail(`le client cloud n’expose pas ${expected}.`);
  }
}

if (!settingsPage.includes('StrengthSyncSettingsPanel')) {
  fail('le panneau de synchronisation de la musculation n’est pas monté dans les paramètres.');
}

for (const expected of [
  'Synchronisation de la musculation',
  'agrégats complets',
]) {
  if (!panel.includes(expected)) {
    fail(`le panneau B3 ne contient pas ${expected}.`);
  }
}

if (!deployment.includes("VITE_ENABLE_REAL_STRENGTH_SYNC: 'true'")) {
  fail('le build de production n’active pas explicitement le lot B3.');
}

if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8/.test(mainVersions)) {
  fail('le lot B3 ne doit pas modifier la version de la base locale principale.');
}

if (failures.length > 0) {
  console.error('\nAudit de synchronisation de la musculation B3 échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit de synchronisation de la musculation B3 réussi : exercices personnalisés, modèles et séances atomiques, séries, suppressions, isolation de compte et interface manuelle validés.',
  );
}
