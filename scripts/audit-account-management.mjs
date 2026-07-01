import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const failures = [];

const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
if (!config.includes('...environment,\n    ...syncPublicDeploymentConfig')) {
  failures.push('La configuration publique de production ne prime pas sur les variables obsolètes.');
}

const panels = [
  'WeightSyncSettingsPanel',
  'ActivitySyncSettingsPanel',
  'GoalSyncSettingsPanel',
  'StrengthSyncSettingsPanel',
  'NutritionJournalSyncSettingsPanel',
  'NutritionLibrarySyncSettingsPanel',
  'NutritionTrackingSyncSettingsPanel',
];
for (const panel of panels) {
  const source = read(`src/features/settings/components/${panel}.tsx`);
  if (source.includes('Gérer le compte') && !source.includes('to={routePaths.accountDevices}')) {
    failures.push(`${panel} ne dirige pas vers Compte et appareils.`);
  }
}

const page = read('src/features/account-devices/pages/AccountDevicesPage.tsx');
for (const marker of [
  'Compte de synchronisation',
  'Service cloud',
  'Espace actif',
  'Connexion et changement de compte',
  'Déconnecter le compte',
  'Les données locales restent conservées',
]) {
  if (!page.includes(marker)) failures.push(`Compte et appareils : élément manquant « ${marker} ».`);
}

if (failures.length) {
  console.error('Audit D1 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit D1 réussi : accès au compte, configuration publique de production, état cloud/local et actions non destructives validés.');
