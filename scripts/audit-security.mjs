import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

async function read(relativePath) {
  try {
    return await readFile(join(root, relativePath), 'utf8');
  } catch {
    failures.push(`Fichier manquant : ${relativePath}`);
    return '';
  }
}

const [sourceHeaders, builtHeaders, privacyPage, routePaths] = await Promise.all([
  read('public/_headers'),
  read('dist/_headers'),
  read('src/features/information/pages/PrivacyPage.tsx'),
  read('src/app/routePaths.ts'),
]);

const requiredHeaders = [
  'Content-Security-Policy:',
  'X-Content-Type-Options: nosniff',
  'Referrer-Policy: no-referrer',
  'Permissions-Policy:',
  'X-Frame-Options: DENY',
  'Cross-Origin-Opener-Policy: same-origin',
  'Cross-Origin-Resource-Policy: same-origin',
];

const requiredCspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "script-src 'self'",
  "connect-src 'self' https://search.openfoodfacts.org https://world.openfoodfacts.org",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
];

for (const [label, content] of [
  ['public/_headers', sourceHeaders],
  ['dist/_headers', builtHeaders],
]) {
  for (const expected of [...requiredHeaders, ...requiredCspDirectives]) {
    if (!content.includes(expected)) failures.push(`${label} ne contient pas : ${expected}`);
  }
  if (content.includes("script-src 'self' 'unsafe-inline'")) {
    failures.push(`${label} autorise les scripts inline.`);
  }
  if (content.includes("'unsafe-eval'")) {
    failures.push(`${label} autorise unsafe-eval.`);
  }
  if (!content.includes('camera=(self)')) failures.push(`${label} n’autorise pas explicitement la caméra locale.`);
  for (const disabledCapability of ['microphone=()', 'geolocation=()', 'payment=()', 'usb=()']) {
    if (!content.includes(disabledCapability)) {
      failures.push(`${label} ne désactive pas ${disabledCapability}.`);
    }
  }

  const cspLine = content.split(/\r?\n/).find((line) => line.includes('Content-Security-Policy:')) ?? '';
  if (cspLine.length > 2_000) failures.push(`${label} dépasse la limite de 2 000 caractères pour un en-tête.`);
}

const privacyRequiredCopy = [
  'IndexedDB',
  'Open Food Facts',
  'Les images sont analysées dans le navigateur',
  'ne remplace pas un médecin',
];
for (const copy of privacyRequiredCopy) {
  if (!privacyPage.includes(copy)) failures.push(`La page Confidentialité ne contient pas : ${copy}`);
}
if (!routePaths.includes("privacy: '/privacy'")) failures.push('La route /privacy est absente.');

if (failures.length > 0) {
  console.error('\nAudit sécurité échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Audit sécurité réussi : en-têtes Cloudflare, CSP, permissions et page Confidentialité validés.');
}
