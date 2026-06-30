import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const failures = [];

async function requireFile(relativePath) {
  try {
    await access(join(root, relativePath));
  } catch {
    failures.push(`Fichier manquant : ${relativePath}`);
  }
}

await Promise.all([
  requireFile('dist/index.html'),
  requireFile('dist/manifest.webmanifest'),
  requireFile('dist/sw.js'),
  requireFile('dist/icons/icon-192.png'),
  requireFile('dist/icons/icon-512.png'),
  requireFile('dist/icons/icon-maskable-192.png'),
  requireFile('dist/icons/icon-maskable-512.png'),
]);

try {
  const manifest = JSON.parse(await readFile(join(root, 'dist/manifest.webmanifest'), 'utf8'));
  const requiredFields = ['id', 'name', 'short_name', 'start_url', 'scope', 'display', 'icons'];
  for (const field of requiredFields) {
    if (!(field in manifest)) failures.push(`Manifest PWA incomplet : champ ${field} absent.`);
  }
  if (manifest.display !== 'standalone') {
    failures.push('Manifest PWA : display doit valoir standalone.');
  }
  if (!Array.isArray(manifest.shortcuts) || manifest.shortcuts.length < 3) {
    failures.push('Manifest PWA : au moins trois raccourcis sont attendus.');
  }
  const iconPurposes = new Set(
    (manifest.icons ?? []).flatMap((icon) => String(icon.purpose ?? 'any').split(/\s+/)),
  );
  if (!iconPurposes.has('maskable')) failures.push('Manifest PWA : icône maskable absente.');
} catch (error) {
  failures.push(`Manifest PWA illisible : ${error instanceof Error ? error.message : String(error)}`);
}

try {
  const indexHtml = await readFile(join(root, 'dist/index.html'), 'utf8');
  if (!indexHtml.includes('lang="fr"')) failures.push('index.html : langue française absente.');
  if (!indexHtml.includes('name="viewport"')) failures.push('index.html : meta viewport absente.');
} catch {
  // Le fichier manquant est déjà signalé ci-dessus.
}

const sourceFiles = [
  'src/app/layouts/AppLayout.tsx',
  'src/features/backup/pages/BackupPage.tsx',
  'src/infrastructure/open-food-facts/OpenFoodFactsClient.ts',
];
const forbiddenSecretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /SUPABASE_SERVICE_ROLE_KEY\s*=/,
  /sk_live_[A-Za-z0-9]+/,
];

for (const relativePath of sourceFiles) {
  try {
    const content = await readFile(join(root, relativePath), 'utf8');
    for (const pattern of forbiddenSecretPatterns) {
      if (pattern.test(content)) failures.push(`Secret potentiel détecté dans ${relativePath}.`);
    }
  } catch {
    failures.push(`Source attendue absente : ${relativePath}`);
  }
}

try {
  const layout = await readFile(join(root, 'src/app/layouts/AppLayout.tsx'), 'utf8');
  if (!/href\s*=\s*["']#main-content["']/.test(layout)) {
    failures.push('Accessibilité : lien d’évitement absent.');
  }

  const hasMainLandmark = /<main\b[^>]*\bid\s*=\s*["']main-content["'][^>]*>/s.test(
    layout,
  );
  if (!hasMainLandmark) {
    failures.push('Accessibilité : repère principal absent.');
  }
} catch {
  // Déjà couvert.
}

if (failures.length > 0) {
  console.error('\nAudit MVP échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Audit MVP réussi : PWA, fichiers hors ligne, repères d’accessibilité et absence de secrets évidents validés.');
}
