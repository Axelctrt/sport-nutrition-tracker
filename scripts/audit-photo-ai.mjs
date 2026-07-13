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
  'docs/architecture/photo-nutrition-ai-0.25.1-f2.md',
  'docs/architecture/photo-nutrition-ai-0.25.1-f3.md',
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
    'VITE_PHOTO_NUTRITION_AI_ENDPOINT',
    'createRemotePhotoNutritionAnalysisPort',
    'assertPhotoNutritionAiEndpoint',
    'multipart/form-data',
    'contractVersion',
    'external-consent-required',
    'Photo trop volumineuse',
    'fallback local conseillé',
    'SENSITIVE_QUERY_KEYS',
    'Réponse IA invalide',
    'valeurs nutritionnelles manquantes',
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
    'Autoriser l’analyse IA pour cette photo',
    'Autoriser l’analyse IA distante pour cette photo',
    'createRemotePhotoNutritionAnalysisPort',
    'readPhotoNutritionAiConfig',
    'Analyser avec l’IA',
    'Analyser en local',
    'aucune image n’est conservée',
    'remoteFallbackMessage',
    'IA indisponible, fallback local utilisé',
    'Fallback local appliqué automatiquement',
    'analysisFormKey',
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
    'Réponse IA invalide',
  ]) {
    if (!clientTest.includes(marker)) fail(`tests client IA photo incomplets : ${marker}.`);
  }

  const pageTest = read('src/features/photo-nutrition/pages/PhotoNutritionEstimatePage.test.tsx');
  for (const marker of [
    'n’envoie la photo au proxy IA qu’après consentement explicite',
    'remplit le formulaire avec la réponse IA distante',
    'bascule automatiquement sur le fallback local si le proxy IA échoue',
    'Analyser avec l’IA',
    'Analyser en local',
    'Analyse IA à vérifier',
    'IA indisponible, fallback local utilisé',
  ]) {
    if (!pageTest.includes(marker)) fail(`tests interface IA photo incomplets : ${marker}.`);
  }

  const envExample = read('.env.example');
  for (const marker of [
    'VITE_PHOTO_NUTRITION_AI_ENDPOINT=',
    'VITE_PHOTO_NUTRITION_AI_TIMEOUT_MS=15000',
    'Ne jamais placer de clé Gemini',
    'PHOTO_NUTRITION_AI_API_KEY=',
    'PHOTO_NUTRITION_AI_MODEL=gemini-2.5-flash-lite',
    'Free Tier Gemini',
  ]) {
    if (!envExample.includes(marker)) fail(`configuration .env.example incomplète : ${marker}.`);
  }

  const f1Doc = read('docs/architecture/photo-nutrition-ai-0.25.1-f1.md');
  for (const marker of [
    'backend/proxy sécurisé',
    'consentement explicite',
    'VITE_PHOTO_NUTRITION_AI_ENDPOINT',
    'clé serveur uniquement',
    'Aucune migration Dexie',
  ]) {
    if (!f1Doc.includes(marker)) fail(`documentation IA photo F1 incomplète : ${marker}.`);
  }

  const f2Doc = read('docs/architecture/photo-nutrition-ai-0.25.1-f2.md');
  for (const marker of [
    'Branchement IA photo via proxy',
    'fallback automatique',
    'réponse IA invalide',
    'aucune clé IA',
    'Aucune migration Dexie',
  ]) {
    if (!f2Doc.includes(marker)) fail(`documentation IA photo F2 incomplète : ${marker}.`);
  }



  const proxy = read('functions/_shared/photoNutritionAiProxy.js');
  for (const marker of [
    'generativelanguage.googleapis.com',
    'gemini-2.5-flash-lite',
    'PHOTO_NUTRITION_AI_API_KEY',
    'GEMINI_API_KEY',
    'inlineData',
    'responseMimeType',
    'PHOTO_AI_NOT_CONFIGURED',
    'PHOTO_AI_INVALID_IMAGE',
    'Photo transmise à Google Gemini',
  ]) {
    if (!proxy.includes(marker)) fail(`proxy IA Gemini incomplet : ${marker}.`);
  }

  const proxyTest = read('functions/_shared/photoNutritionAiProxy.test.mjs');
  for (const marker of [
    'photoNutritionAiProxy Gemini',
    'PHOTO_AI_NOT_CONFIGURED',
    'PHOTO_AI_INVALID_IMAGE',
    'appelle Gemini côté serveur',
    'generativelanguage.googleapis.com',
  ]) {
    if (!proxyTest.includes(marker)) fail(`tests proxy IA Gemini incomplets : ${marker}.`);
  }

  const viteConfig = read('vite.config.ts');
  if (!viteConfig.includes("'/api/photo-nutrition/analyze'") || !viteConfig.includes('http://127.0.0.1:8787')) {
    fail('proxy Vite local IA photo absent ou incohérent.');
  }

  const f3Doc = read('docs/architecture/photo-nutrition-ai-0.25.1-f3.md');
  for (const marker of [
    'Gemini Free Tier',
    'PHOTO_NUTRITION_AI_API_KEY',
    'consent explicitement',
    'Aucune migration Dexie',
  ]) {
    if (!f3Doc.includes(marker)) fail(`documentation IA photo F3 Gemini incomplète : ${marker}.`);
  }

  const packageJson = JSON.parse(read('package.json'));
  if (packageJson.scripts?.['audit:photo-ai'] !== 'node scripts/audit-photo-ai.mjs') {
    fail('le script audit:photo-ai est absent ou incohérent.');
  }
  if (!String(packageJson.scripts?.check ?? '').includes('audit:photo-ai')) {
    fail('npm run check ne lance pas audit:photo-ai.');
  }
  if (packageJson.scripts?.['dev:photo-ai-proxy'] !== 'node scripts/photo-nutrition-gemini-proxy-local.mjs') {
    fail('le script dev:photo-ai-proxy Gemini est absent ou incohérent.');
  }
}

if (failures.length > 0) {
  console.error('Audit IA photo échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit IA photo réussi : proxy Gemini Free Tier, consentement explicite, réponse IA validée, fallback automatique et absence de clé front couverts.');
