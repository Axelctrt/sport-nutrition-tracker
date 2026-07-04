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
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx',
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx',
  'docs/architecture/photo-nutrition-estimation-0.25.0-f1.md',
  'docs/architecture/photo-nutrition-estimation-0.25.0-f2.md',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier photo nutrition absent : ${path}.`);
}

if (failures.length === 0) {
  const service = read('src/application/photo-nutrition/photoNutritionEstimationService.ts');
  for (const marker of [
    'PhotoNutritionAnalysisMode',
    'local-fallback',
    'local-only',
    'warnings',
    'Format non supporté',
    'Photo non conservée dans le journal alimentaire',
    'assertEstimate',
  ]) {
    if (!service.includes(marker)) fail(`service photo nutrition incomplet : ${marker}.`);
  }

  const page = read('src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx');
  for (const marker of [
    'Choisir une photo',
    'Supprimer la photo sélectionnée',
    'Analyse locale prudente',
    'isAnalyzing',
    'isSaving',
    'URL.revokeObjectURL',
    'aucune image n’est envoyée',
  ]) {
    if (!page.includes(marker)) fail(`interface photo nutrition incomplète : ${marker}.`);
  }

  const pageTest = read('src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx');
  for (const marker of [
    'Photo non conservée dans le journal alimentaire.',
    'Analyser la photo',
    'toBeDisabled',
    'Supprimer la photo sélectionnée',
    'fallback local sans IA distante',
  ]) {
    if (!pageTest.includes(marker)) fail(`tests interface photo incomplets : ${marker}.`);
  }

  const serviceTest = read('src/application/photo-nutrition/photoNutritionEstimationService.test.ts');
  for (const marker of [
    'local-only',
    'Format non supporté',
    'Quantité approximative invalide',
    'not.toContain',
  ]) {
    if (!serviceTest.includes(marker)) fail(`tests service photo incomplets : ${marker}.`);
  }

  const packageJson = JSON.parse(read('package.json'));
  if (packageJson.scripts?.['audit:photo-nutrition'] !== 'node scripts/audit-photo-nutrition.mjs') {
    fail('le script audit:photo-nutrition est absent ou incohérent.');
  }

  const f2Doc = read('docs/architecture/photo-nutrition-estimation-0.25.0-f2.md');
  for (const marker of [
    'fallback local',
    'confidentialité',
    'consentement explicite',
    'Aucune migration',
    'API IA',
  ]) {
    if (!f2Doc.includes(marker)) fail(`documentation F2 incomplète : ${marker}.`);
  }
}

if (failures.length > 0) {
  console.error('Audit photo nutrition échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit photo nutrition réussi : estimation locale prudente, confidentialité, erreurs, correction manuelle et préparation API IA couvertes.');
