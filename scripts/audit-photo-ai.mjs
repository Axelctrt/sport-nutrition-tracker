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
  'src/application/photo-nutrition/photoNutritionImagePreparation.ts',
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx',
  'src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx',
  'functions/api/photo-nutrition/analyze.js',
  'functions/_shared/photoNutritionAiProxy.js',
  'functions/_shared/photoNutritionAiProxy.test.mjs',
  'scripts/photo-nutrition-gemini-proxy-local.mjs',
  '.env.example',
];

for (const path of requiredFiles) {
  if (!existsSync(join(root, path))) fail(`fichier IA photo absent : ${path}.`);
}

if (failures.length === 0) {
  const client = read('src/application/photo-nutrition/photoNutritionAiClient.ts');
  for (const marker of [
    "DEFAULT_ENDPOINT_URL = '/api/photo-nutrition/analyze'",
    'DEFAULT_TIMEOUT_MS = 30_000',
    'DEPRECATED_ENDPOINT_URL',
    'preparePhotoForNutritionAnalysis',
    'PhotoNutritionAiError',
    'PHOTO_AI_CLIENT_TIMEOUT',
    'diagnosticRef',
    'resolveSocialCloudApiCredentials',
    'authorization: `Bearer ${credentials.accessToken}`',
  ]) {
    if (!client.includes(marker)) fail(`client IA photo incomplet : ${marker}.`);
  }
  for (const forbidden of [
    'VITE_OPENAI_API_KEY',
    'VITE_MISTRAL_API_KEY',
    'VITE_ANTHROPIC_API_KEY',
    'fallback local conseillé',
  ]) {
    if (client.includes(forbidden)) fail(`secret ou ancien fallback interdit dans le client : ${forbidden}.`);
  }

  const page = read('src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.tsx');
  for (const marker of [
    'Activer l’analyse IA pour cette photo',
    'La photo sera envoyée à Google Gemini uniquement pour cette analyse.',
    'Analyser avec l’IA',
    'Saisir manuellement',
    'Réessayer',
    'Référence :',
  ]) {
    if (!page.includes(marker)) fail(`interface IA photo incomplète : ${marker}.`);
  }

  const proxy = read('functions/_shared/photoNutritionAiProxy.js');
  for (const marker of [
    'generativelanguage.googleapis.com',
    'PHOTO_NUTRITION_AI_API_KEY',
    'DEFAULT_PROVIDER_TIMEOUT_MS = 22_000',
    'PHOTO_AI_PROVIDER_TIMEOUT',
    'PHOTO_AI_PROVIDER_QUOTA',
    'PHOTO_AI_PROVIDER_UNAVAILABLE',
    'x-sportpilot-request-id',
    'diagnosticRef',
    'timingsMs',
    'AbortController',
    "'x-goog-api-key': apiKey",
  ]) {
    if (!proxy.includes(marker)) fail(`proxy IA Gemini incomplet : ${marker}.`);
  }

  const proxyTest = read('functions/_shared/photoNutritionAiProxy.test.mjs');
  for (const marker of [
    'PHOTO_AI_PROVIDER_TIMEOUT',
    'PHOTO_AI_PROVIDER_QUOTA',
    'journalise uniquement les métadonnées',
    'not.toContain',
  ]) {
    if (!proxyTest.includes(marker)) fail(`tests proxy IA incomplets : ${marker}.`);
  }

  const envExample = read('.env.example');
  for (const marker of [
    'VITE_PHOTO_NUTRITION_AI_ENDPOINT=/api/photo-nutrition/analyze',
    'VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS=30000',
    'PHOTO_NUTRITION_AI_TIMEOUT_MS=22000',
    'PHOTO_NUTRITION_AI_API_KEY=',
  ]) {
    if (!envExample.includes(marker)) fail(`configuration IA photo incomplète : ${marker}.`);
  }

  const viteConfig = read('vite.config.ts');
  if (!viteConfig.includes("'/api/photo-nutrition/analyze'") || !viteConfig.includes('http://127.0.0.1:8787')) {
    fail('proxy Vite local IA photo absent ou incohérent.');
  }

  const packageJson = JSON.parse(read('package.json'));
  if (!String(packageJson.scripts?.['audit:photo-ai'] ?? '').includes('node scripts/audit-photo-ai.mjs')) {
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

console.log('Audit IA photo réussi : route réelle, délais explicites, diagnostic traçable et aucun secret côté client.');
