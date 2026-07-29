import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const targetPath = join(root, 'scripts/audit-nutrition-library-sync.mjs');
const failures = [];

const fail = (message) => failures.push(message);

if (!existsSync(targetPath)) {
  fail('fichier introuvable : scripts/audit-nutrition-library-sync.mjs');
} else {
  const original = readFileSync(targetPath, 'utf8');
  let next = original;

  next = next.replace(
    '/^0\\.(?:20|21|22|23|24|25|26|27)\\.\\d+$/.test(packageJson.version)',
    '/^0\\.(?:20|21|22|23|24|25|26|27|28)\\.\\d+$/.test(packageJson.version)',
  );

  next = next.replace(
    'la version doit appartenir aux séries stables 0.20.x, 0.21.x, 0.22.x, 0.23.x, 0.24.x, 0.25.x, 0.26.x ou 0.27.x, reçue ${String(packageJson.version)}.',
    'la version doit appartenir aux séries stables 0.20.x, 0.21.x, 0.22.x, 0.23.x, 0.24.x, 0.25.x, 0.26.x, 0.27.x ou 0.28.x, reçue ${String(packageJson.version)}.',
  );

  if (next === original) {
    if (
      original.includes('/^0\\.(?:20|21|22|23|24|25|26|27|28)\\.\\d+$/') &&
      original.includes('0.27.x ou 0.28.x')
    ) {
      console.log('Correctif F7 0.28.0 audit nutrition library déjà appliqué.');
      process.exit(0);
    }
    fail('base inattendue : impossible de trouver la restriction 0.20.x → 0.27.x dans audit-nutrition-library-sync.mjs');
  } else {
    writeFileSync(targetPath, next, 'utf8');
  }
}

if (failures.length > 0) {
  console.error('Échec du correctif F7 0.28.0 audit nutrition library :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Correctif F7 0.28.0 audit nutrition library appliqué avec succès.');
console.log('Fichiers corrigés : 1');
console.log('Fichiers déjà à jour : 0');
console.log('Correction : audit:nutrition-library-sync accepte désormais 0.28.x comme série stable finale.');
