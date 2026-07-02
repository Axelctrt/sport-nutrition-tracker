import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/infrastructure/data-spaces/cloudAccountRestoreService.ts',
  'src/infrastructure/data-spaces/cloudAccountRestoreService.test.ts',
  'src/features/account-devices/components/CloudAccountRestorePanel.tsx',
  'src/features/account-devices/components/CloudAccountRestorePanel.test.tsx',
  'src/app/data-spaces/DataSpaceAccountGate.tsx',
  'src/features/account-devices/pages/AccountDevicesPage.tsx',
  'src/infrastructure/sync-prototype/syncPrototypeClient.ts',
  'src/infrastructure/sync-prototype/syncPrototypeClient.test.ts',
  'src/infrastructure/sync-prototype/cloudSyncValue.ts',
  'docs/architecture/cloud-account-restore-0.21.0-d3.md',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`Fichier D3 absent : ${path}.`);
}

if (failures.length === 0) {
  const service = read(requiredFiles[0]);
  for (const marker of [
    'prepareCloudAccountRestore',
    'applyPreparedCloudAccountRestore',
    'createCloudAccountRestoreRuntime',
    'writeCloud: false',
    '--cloud-restore-stage',
    'sourceFingerprint',
    'targetFingerprint',
    'Les données cloud ont changé depuis l’analyse',
    'L’espace local a changé depuis l’analyse',
    'Les données cloud ont changé pendant la préparation',
    'L’espace local a changé pendant la préparation',
    'targetCreatedByRestore',
    'writeExactRestoreSnapshot',
    'activateAccountDataSpace',
    'sourcePreserved: true',
    'await Dexie.delete(stageDatabaseName)',
  ]) {
    if (!service.includes(marker)) fail(`Garde-fou D3 manquant : ${marker}.`);
  }
  for (const forbidden of [
    'cloudDatabase.delete()',
    'database.cloud.delete',
    'realWeights.clear()',
    'realActivities.clear()',
  ]) {
    if (service.includes(forbidden)) {
      fail(`Le service D3 contient une opération cloud interdite : ${forbidden}.`);
    }
  }

  const panel = read(requiredFiles[2]);
  for (const marker of [
    'Des données ont été trouvées pour ce compte',
    'Restaurer depuis le cloud',
    'Le cloud n’est jamais vidé',
    '<ConfirmationDialog',
    'base temporaire',
  ]) {
    if (!panel.includes(marker)) fail(`Interface D3 incomplète : ${marker}.`);
  }

  const gate = read(requiredFiles[4]);
  for (const marker of [
    '<CloudAccountRestorePanel',
    'autoAnalyze',
    'cloudAnalysisStatus === "loading"',
    'Commencer avec un espace vide',
  ]) {
    if (!gate.includes(marker)) fail(`Barrière D3 incomplète : ${marker}.`);
  }

  const accountPage = read(requiredFiles[5]);
  if (!accountPage.includes('<CloudAccountRestorePanel')) {
    fail('Compte et appareils ne permet pas une restauration différée.');
  }

  const client = read(requiredFiles[6]);
  for (const marker of [
    'cloudRestoreContext',
    'currentFingerprint !== normalized',
    'prepareCloudRestore',
    'applyCloudRestore',
    'accountDatabaseNameForFingerprint',
  ]) {
    if (!client.includes(marker)) fail(`Isolation D3 manquante : ${marker}.`);
  }

  const executionOptions = read(requiredFiles[8]);
  if (!executionOptions.includes('interface CloudSyncExecutionOptions')) {
    fail('Le mode de synchronisation cloud en lecture seule est absent.');
  }

  const syncServices = [
    'realWeightSyncService.ts',
    'realActivitySyncService.ts',
    'realGoalSyncService.ts',
    'realStrengthSyncService.ts',
    'realNutritionLibrarySyncService.ts',
    'realNutritionJournalSyncService.ts',
    'realNutritionTrackingSyncService.ts',
  ];
  for (const file of syncServices) {
    const source = read(`src/infrastructure/sync-prototype/${file}`);
    if (!source.includes('CloudSyncExecutionOptions')) {
      fail(`${file} n’accepte pas les options d’exécution cloud.`);
    }
    if (!source.includes('options.writeCloud !== false')) {
      fail(`${file} ne protège pas les écritures cloud en restauration.`);
    }
  }

  const serviceTest = read(requiredFiles[1]);
  for (const marker of [
    'restaure via une base temporaire puis active atomiquement l’espace du compte',
    'refuse une restauration basée sur une analyse cloud devenue obsolète',
    'interrompt la restauration si le cloud change pendant la préparation temporaire',
    'préserve un espace créé concurremment pendant la préparation',
    'refuse de remplacer un espace contenant déjà des données utilisateur',
    'autorise la restauration différée malgré un objectif quotidien recalculable',
    'annule toute écriture locale si la préparation temporaire échoue',
  ]) {
    if (!serviceTest.includes(marker)) fail(`Test D3 manquant : ${marker}.`);
  }

  const weightTest = read(
    'src/infrastructure/sync-prototype/realWeightSyncService.test.ts',
  );
  if (!weightTest.includes('restaure en lecture seule sans modifier la source cloud')) {
    fail('Le test de non-écriture cloud en mode restauration est absent.');
  }

  const clientTest = read(requiredFiles[7]);
  if (!clientTest.includes('refuse une analyse de restauration préparée pour un autre compte')) {
    fail('Le test de liaison stricte entre restauration et compte est absent.');
  }

  const packageJson = JSON.parse(read('package.json'));
  if (
    packageJson.scripts?.['audit:cloud-account-restore'] !==
    'node scripts/audit-cloud-account-restore.mjs'
  ) {
    fail('Le script audit:cloud-account-restore est absent ou incohérent.');
  }
  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:cloud-account-restore')) {
      fail(`Le pipeline ${pipeline} n’exécute pas l’audit D3.`);
    }
  }
}

if (failures.length > 0) {
  console.error('Audit D3 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit D3 réussi : détection guidée, lecture cloud sans écriture, empreintes source/cible, restauration temporaire et atomique, restauration différée et isolation stricte des comptes validées.',
);
