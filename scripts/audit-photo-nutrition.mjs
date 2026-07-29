import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/application/photo-nutrition/photoNutritionEstimationService.ts',
  'src/application/photo-nutrition/photoNutritionEstimationService.test.ts',
  'src/application/photo-nutrition/photoNutritionImagePreparation.ts',
  'src/application/photo-nutrition/photoNutritionImagePreparation.test.ts',
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx',
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier photo nutrition absent : ${path}.`);
}

if (failures.length === 0) {
  const service = read('src/application/photo-nutrition/photoNutritionEstimationService.ts');
  for (const marker of [
    "PhotoNutritionAnalysisMode = 'remote-ai'",
    'PhotoNutritionAnalysisPort',
    'assertPhoto',
    'assertEstimate',
    'savePhotoNutritionEstimateToJournal',
  ]) {
    if (!service.includes(marker)) fail(`service photo nutrition incomplet : ${marker}.`);
  }
  for (const forbidden of ['local-fallback', 'localPhotoNutritionAnalysisPort', 'estimateFor()']) {
    if (service.includes(forbidden)) fail(`ancienne estimation locale encore présente : ${forbidden}.`);
  }

  const preparation = read('src/application/photo-nutrition/photoNutritionImagePreparation.ts');
  for (const marker of [
    'DEFAULT_MAX_DIMENSION = 1600',
    'imageOrientation',
    'image/jpeg',
    'image/heic',
    'maxOutputSizeBytes',
  ]) {
    if (!preparation.includes(marker)) fail(`préparation photo incomplète : ${marker}.`);
  }

  const page = read('src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx');
  for (const marker of [
    'Choisis une photo du repas.',
    'Analyse IA',
    'Saisir manuellement',
    'Analyse indisponible',
    'diagnosticRef',
    'EMPTY_ESTIMATE',
  ]) {
    if (!page.includes(marker)) fail(`interface photo nutrition incomplète : ${marker}.`);
  }
  for (const forbidden of ['fallback local', 'local-fallback', 'En 0.25.1', 'proxy backend']) {
    if (page.includes(forbidden)) fail(`texte technique ou faux résultat encore visible : ${forbidden}.`);
  }

  const packageJson = JSON.parse(read('package.json'));
  if (packageJson.scripts?.['audit:photo-nutrition'] !== 'node scripts/audit-photo-nutrition.mjs') {
    fail('le script audit:photo-nutrition est absent ou incohérent.');
  }
}

if (failures.length > 0) {
  console.error('Audit photo nutrition échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit photo nutrition réussi : image préparée, résultat réel ou saisie manuelle vide, sans estimation fictive.');
