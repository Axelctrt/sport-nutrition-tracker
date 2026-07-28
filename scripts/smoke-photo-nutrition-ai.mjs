import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

const baseUrl = process.env.PHOTO_NUTRITION_SMOKE_BASE_URL?.trim();
const accessToken = process.env.PHOTO_NUTRITION_SMOKE_TOKEN?.trim();
const imagePath = process.env.PHOTO_NUTRITION_SMOKE_IMAGE?.trim();

if (!baseUrl || !accessToken || !imagePath) {
  console.error([
    'Variables requises :',
    '- PHOTO_NUTRITION_SMOKE_BASE_URL=https://...',
    '- PHOTO_NUTRITION_SMOKE_TOKEN=<token SportPilot temporaire>',
    '- PHOTO_NUTRITION_SMOKE_IMAGE=<chemin vers une vraie photo>',
  ].join('\n'));
  process.exit(2);
}

const mimeTypes = new Map([
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);
const mimeType = mimeTypes.get(extname(imagePath).toLowerCase());
if (!mimeType) {
  console.error('Le smoke test accepte une image JPEG, PNG ou WebP.');
  process.exit(2);
}

const image = await readFile(imagePath);
const formData = new FormData();
formData.append('photo', new Blob([image], { type: mimeType }), `smoke${extname(imagePath)}`);
formData.append('contractVersion', 'sportpilot-photo-nutrition-v1');

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 35_000);
const startedAt = performance.now();

try {
  const endpoint = new URL('/api/photo-nutrition/analyze', baseUrl);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
    },
    body: formData,
    signal: controller.signal,
  });
  const elapsedMs = Math.round(performance.now() - startedAt);
  const payload = await response.json().catch(() => undefined);
  const diagnosticRef = response.headers.get('x-sportpilot-request-id')
    ?? payload?.diagnosticRef
    ?? 'absente';

  console.log(`HTTP ${response.status} en ${elapsedMs} ms · référence ${diagnosticRef}`);
  if (!response.ok) {
    console.error(`${payload?.code ?? 'UNKNOWN'} : ${payload?.message ?? 'Réponse non JSON'}`);
    process.exit(1);
  }

  console.log(JSON.stringify({
    name: payload?.estimate?.name,
    amount: payload?.estimate?.amount,
    caloriesKcal: payload?.estimate?.nutrition?.caloriesKcal,
    confidence: payload?.confidence,
  }, null, 2));
} catch (error) {
  console.error(
    controller.signal.aborted
      ? 'Smoke test interrompu après 35 secondes.'
      : `Smoke test impossible : ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exit(1);
} finally {
  clearTimeout(timeout);
}
