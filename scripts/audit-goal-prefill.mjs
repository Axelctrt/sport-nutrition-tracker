import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/features/goals/components/GoalEditor.tsx',
  'src/features/goals/components/GoalEditor.test.tsx',
  'src/features/goals/pages/GoalsPage.tsx',
  'src/features/goals/pages/GoalsPage.test.tsx',
  'src/app/goalPrefillReadiness.test.ts',
  'RELEASE-NOTES-0.23.1.md',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier de préremplissage absent : ${path}.`);
}

if (failures.length === 0) {
  const packageJson = JSON.parse(read('package.json'));
  const packageLock = JSON.parse(read('package-lock.json'));

  if (!/^\d+\.\d+\.\d+$/.test(String(packageJson.version))) {
    fail(`package.json doit publier une version stable, version trouvée : ${String(packageJson.version)}.`);
  }
  if (packageLock.version !== packageJson.version || packageLock.packages?.['']?.version !== packageJson.version) {
    fail(`package-lock.json ne correspond pas à SportPilot ${packageJson.version}.`);
  }

  const goalEditor = read('src/features/goals/components/GoalEditor.tsx');
  for (const marker of [
    'initialWeightBaseline',
    'formatOptionalNumber(goal.baselineValue)',
    'setTitle(goal.title)',
    'setMetric(goal.metric)',
    'setTargetValue(String(goal.targetValue))',
    'setStartDate(goal.startDate)',
    "setDeadline(goal.deadline ?? '')",
    'initialBaselineForCreation',
  ]) {
    if (!goalEditor.includes(marker)) fail(`éditeur d’objectif incomplet : ${marker}.`);
  }

  const goalsPage = read('src/features/goals/pages/GoalsPage.tsx');
  for (const marker of [
    'loadLatestWeightBaselineFromRepository',
    'repositories.weight.listAll()',
    'right.date.localeCompare(left.date)',
    'initialWeightBaseline={latestWeightBaseline}',
  ]) {
    if (!goalsPage.includes(marker)) fail(`page Objectifs incomplète : ${marker}.`);
  }

  const goalEditorTest = read('src/features/goals/components/GoalEditor.test.tsx');
  for (const marker of [
    'réhydrate tous les champs',
    'dernière pesée connue',
    'ne remplace pas le poids de départ saisi',
    'poids de départ historique',
  ]) {
    if (!goalEditorTest.includes(marker)) fail(`test éditeur objectif manquant : ${marker}.`);
  }

  const goalsPageTest = read('src/features/goals/pages/GoalsPage.test.tsx');
  if (!goalsPageTest.includes('loadLatestWeightBaseline')) {
    fail('le test de page ne contrôle pas le chargement de la dernière pesée.');
  }

  const readiness = read('src/app/goalPrefillReadiness.test.ts');
  if (!readiness.includes(`expect(__APP_VERSION__).toBe('${packageJson.version}')`)) {
    fail('le test de readiness ne verrouille pas la version publiée.');
  }

  const releaseNotes = read('RELEASE-NOTES-0.23.1.md');
  for (const marker of [
    'Préremplissage des objectifs',
    'dernière pesée',
    'poids de départ historique',
    'Aucune migration',
  ]) {
    if (!releaseNotes.includes(marker)) fail(`notes de version incomplètes : ${marker}.`);
  }

  for (const pipeline of ['check', 'ci']) {
    if (!String(packageJson.scripts?.[pipeline] ?? '').includes('audit:goal-prefill')) {
      fail(`le pipeline ${pipeline} n’exécute pas l’audit de préremplissage des objectifs.`);
    }
  }

  if (packageJson.scripts?.['audit:goal-prefill'] !== 'node scripts/audit-goal-prefill.mjs') {
    fail('le script audit:goal-prefill est absent ou incohérent.');
  }

  const versions = read('src/infrastructure/database/migrations/versions.ts');
  const backup = read('src/infrastructure/backup/backupMigrations.ts');
  if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_11\b/.test(versions)) {
    fail('la base métier doit rester en Dexie v8.');
  }
  if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*10\b/.test(backup)) {
    fail('la sauvegarde JSON doit rester en v7.');
  }
}

if (failures.length > 0) {
  console.error('Audit préremplissage objectifs échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  'Audit préremplissage objectifs réussi : édition fidèle, dernière pesée utilisée seulement en création et versions de données inchangées.',
);
