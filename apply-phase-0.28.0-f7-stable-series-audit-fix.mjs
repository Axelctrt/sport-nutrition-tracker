import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = process.cwd();
const patchName = 'Correctif F7 0.28.0 séries stables audits';

const allowedRoots = ['scripts', 'src/app', 'src/features/settings/components'];
const allowedExtensions = new Set(['.mjs', '.ts', '.tsx', '.js', '.jsx']);

function extensionOf(path) {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot);
}

function listFiles(dir) {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return [];
  const entries = readdirSync(absolute);
  const files = [];
  for (const entry of entries) {
    const path = join(absolute, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...listFiles(relative(root, path)));
      continue;
    }
    if (stats.isFile() && allowedExtensions.has(extensionOf(path))) {
      files.push(path);
    }
  }
  return files;
}

function patchContent(source) {
  let next = source;

  const replacements = [
    [
      /\^0\\\.\(\?:20\|21\|22\|23\|24\|25\|26\|27\)\\\.\\d\+\$/g,
      '^0\\.(?:20|21|22|23|24|25|26|27|28)\\.\\d+$',
    ],
    [
      /\^0\\\.\(\?:24\|25\|26\|27\)\\\.\\d\+\$/g,
      '^0\\.(?:24|25|26|27|28)\\.\\d+$',
    ],
    [
      /0\.20\.x, 0\.21\.x, 0\.22\.x, 0\.23\.x, 0\.24\.x, 0\.25\.x, 0\.26\.x ou 0\.27\.x/g,
      '0.20.x, 0.21.x, 0.22.x, 0.23.x, 0.24.x, 0.25.x, 0.26.x, 0.27.x ou 0.28.x',
    ],
    [
      /0\.24\.x à 0\.27\.x/g,
      '0.24.x à 0.28.x',
    ],
    [
      /0\.24\.x a 0\.27\.x/g,
      '0.24.x a 0.28.x',
    ],
  ];

  for (const [pattern, replacement] of replacements) {
    next = next.replace(pattern, replacement);
  }

  return next;
}

const files = allowedRoots.flatMap(listFiles);
const touched = [];
const alreadyAligned = [];

for (const absolute of files) {
  const before = readFileSync(absolute, 'utf8');
  const after = patchContent(before);
  if (after !== before) {
    writeFileSync(absolute, after);
    touched.push(relative(root, absolute).replaceAll('\\\\', '/'));
  } else if (
    before.includes('0.20.x, 0.21.x, 0.22.x, 0.23.x, 0.24.x, 0.25.x, 0.26.x, 0.27.x ou 0.28.x') ||
    before.includes('0.24.x à 0.28.x') ||
    before.includes('(?:20|21|22|23|24|25|26|27|28)') ||
    before.includes('(?:24|25|26|27|28)')
  ) {
    alreadyAligned.push(relative(root, absolute).replaceAll('\\\\', '/'));
  }
}

const remainingLegacy = [];
for (const absolute of files) {
  const content = readFileSync(absolute, 'utf8');
  const normalized = relative(root, absolute).replaceAll('\\\\', '/');
  if (
    content.includes('0.20.x, 0.21.x, 0.22.x, 0.23.x, 0.24.x, 0.25.x, 0.26.x ou 0.27.x') ||
    content.includes('0.24.x à 0.27.x') ||
    content.includes('(?:20|21|22|23|24|25|26|27)') ||
    content.includes('(?:24|25|26|27)')
  ) {
    remainingLegacy.push(normalized);
  }
}

if (remainingLegacy.length > 0) {
  console.error(`${patchName} échoué :`);
  for (const file of remainingLegacy) {
    console.error(`- série stable 0.28.x non alignée dans ${file}`);
  }
  process.exit(1);
}

console.log(`${patchName} appliqué avec succès.`);
console.log(`Fichiers corrigés : ${touched.length}`);
console.log(`Fichiers déjà alignés : ${alreadyAligned.length}`);
if (touched.length > 0) {
  console.log('Fichiers concernés :');
  for (const file of touched) console.log(`- ${file}`);
}
console.log('Correction : tous les audits/readiness qui limitaient les séries stables à 0.27.x acceptent désormais 0.28.x.');
console.log('Versions métier inchangées : Dexie locale v10, sauvegarde JSON v9, runtime cloud prototype v14.');
