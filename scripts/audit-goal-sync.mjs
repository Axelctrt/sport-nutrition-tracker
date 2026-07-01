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
  'src/infrastructure/sync-prototype/realGoalSyncService.ts',
);
const client = read(
  'src/infrastructure/sync-prototype/syncPrototypeClient.ts',
);
const cloudValues = read(
  'src/infrastructure/sync-prototype/cloudSyncValue.ts',
);
const goalService = read(
  'src/application/goals/goalProgressService.ts',
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


for (const expected of [
  "sportpilot-sync-runtime-0.20.0-v",
  "disableEagerSync: true",
]) {
  if (!cloudDatabase.includes(expected)) {
    fail(`le runtime cloud B2 ne contient pas le garde-fou ${expected}.`);
  }
}

for (const tableName of ['realGoals', 'realGoalDeletionRecords']) {
  if (!cloudDatabase.includes(tableName)) {
    fail(`la table cloud ${tableName} n’est pas déclarée.`);
  }
}

if (!service.includes("from '@/infrastructure/sync-prototype/cloudSyncValue'")) {
  fail('le service d’objectifs n’utilise pas les règles communes de convergence.');
}
for (const expected of ['owner', 'realmId', '$ts', '_hasBlobRefs']) {
  if (!cloudValues.includes(expected)) {
    fail(`l’utilitaire commun ne neutralise pas ${expected}.`);
  }
}

for (const expected of [
  'previewRealGoalSync',
  'synchronizeRealGoals',
  "equals('goal')",
  "entityType: 'goal'",
  'cloudPrivateId',
  'belongsToCurrentUser',
]) {
  if (!service.includes(expected)) {
    fail(`le service d’objectifs ne contient pas le garde-fou ${expected}.`);
  }
}

for (const expected of [
  'analyzeRealGoals',
  'syncRealGoals',
  'realGoalSyncEnabled',
  'reloadUserStateRuntime',
]) {
  if (!client.includes(expected)) {
    fail(`le client cloud n’expose pas ${expected}.`);
  }
}

for (const expected of [
  "deletionRecordId('goal'",
  "entityType: 'goal'",
  'createDeletedDeletionRecord',
]) {
  if (!goalService.includes(expected)) {
    fail(`la suppression locale des objectifs ne contient pas ${expected}.`);
  }
}

if (!settingsPage.includes('GoalSyncSettingsPanel')) {
  fail('le panneau de synchronisation des objectifs n’est pas monté dans les paramètres.');
}

if (!deployment.includes("VITE_ENABLE_REAL_GOAL_SYNC: 'true'")) {
  fail('le build de production n’active pas explicitement le lot B2.');
}

if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8/.test(mainVersions)) {
  fail('le lot B2 ne doit pas modifier la version de la base locale principale.');
}

if (failures.length > 0) {
  console.error('\nAudit de synchronisation des objectifs B2 échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    'Audit de synchronisation des objectifs B2 réussi : objectifs, suppressions, isolation de compte, runtime local isolé, métadonnées cloud et interface manuelle validés.',
  );
}
