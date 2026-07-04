import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const requiredFiles = [
  'src/application/photo-nutrition/photoNutritionAiClient.ts',
  'src/application/photo-nutrition/photoNutritionAiClient.test.ts',
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx',
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx',
  'docs/architecture/photo-nutrition-ai-0.25.1-f1.md',
  '.env.example',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier IA photo absent : ${path}.`);
}

if (failures.length === 0) {
  const client = read('src/application/photo-nutrition/photoNutritionAiClient.ts');
  for (const marker of [
    'VITE_PHOTO_NUTRITION_AI_ENDPOINT',
    'createRemotePhotoNutritionAnalysisPort',
    'assertPhotoNutritionAiEndpoint',
    'multipart/form-data',
    'contractVersion',
    'external-consent-required',
    'Photo trop volumineuse',
    'fallback local conseillé',
    'SENSITIVE_QUERY_KEYS',
  ]) {
    if (!client.includes(marker)) fail(`client IA photo incomplet : ${marker}.`);
  }

  for (const forbidden of [
    'VITE_OPENAI_API_KEY',
    'VITE_MISTRAL_API_KEY',
    'VITE_ANTHROPIC_API_KEY',
    'Authorization',
    'Bearer ',
    'x-api-key',
  ]) {
    if (client.includes(forbidden)) fail(`secret ou en-tête sensible interdit dans le client IA photo : ${forbidden}.`);
  }

  const page = read('src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx');
  for (const marker of [
    'Analyse IA sécurisée',
    'J’autorise l’envoi ponctuel de cette photo au proxy IA',
    'createRemotePhotoNutritionAnalysisPort',
    'readPhotoNutritionAiConfig',
    'Analyser avec l’IA',
    'Analyser en local',
    'aucune image n’est envoyée',
  ]) {
    if (!page.includes(marker)) fail(`interface IA photo incomplète : ${marker}.`);
  }

  const clientTest = read('src/application/photo-nutrition/photoNutritionAiClient.test.ts');
  for (const marker of [
    'refuse un endpoint HTTP public',
    'refuse une clé ou un token',
    'normalise le contrat IA',
    'bloque les photos trop volumineuses',
    'fallback local conseillé',
  ]) {
    if (!clientTest.includes(marker)) fail(`tests client IA photo incomplets : ${marker}.`);
  }

  const pageTest = read('src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx');
  for (const marker of [
    'n’envoie la photo au proxy IA qu’après consentement explicite',
    'Analyser avec l’IA',
    'Analyser en local',
    'Analyse IA à vérifier',
  ]) {
    if (!pageTest.includes(marker)) fail(`tests interface IA photo incomplets : ${marker}.`);
  }

  const envExample = read('.env.example');
  for (const marker of [
    'VITE_PHOTO_NUTRITION_AI_ENDPOINT=',
    'VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS=15000',
    'Ne jamais placer de clé OpenAI',
  ]) {
    if (!envExample.includes(marker)) fail(`configuration .env.example incomplète : ${marker}.`);
  }

  const doc = read('docs/architecture/photo-nutrition-ai-0.25.1-f1.md');
  for (const marker of [
    'backend/proxy sécurisé',
    'consentement explicite',
    'VITE_PHOTO_NUTRITION_AI_ENDPOINT',
    'clé serveur uniquement',
    'Aucune migration Dexie',
  ]) {
    if (!doc.includes(marker)) fail(`documentation IA photo incomplète : ${marker}.`);
  }

  const packageJson = JSON.parse(read('package.json'));
  if (packageJson.scripts?.['audit:photo-ai'] !== 'node scripts/audit-photo-ai.mjs') {
    fail('le script audit:photo-ai est absent ou incohérent.');
  }
  if (!String(packageJson.scripts?.check ?? '').includes('audit:photo-ai')) {
    fail('npm run check ne lance pas audit:photo-ai.');
  }
}

if (failures.length > 0) {
  console.error('Audit IA photo échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit IA photo réussi : contrat proxy, consentement explicite, absence de clé front et fallback local couverts.');
