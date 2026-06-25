import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = (message) => {
  throw new Error(`Audit release échoué : ${message}`);
};

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));
const version = packageJson.version;

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`la version ${String(version)} n’est pas une version stable.`);
}
if (packageLock.version !== version || packageLock.packages?.['']?.version !== version) {
  fail('package.json et package-lock.json n’utilisent pas la même version.');
}
if (!read('README.md').startsWith(`# SportPilot ${version}\n`)) {
  fail('le titre du README ne correspond pas à la version du package.');
}
if (!read('README-PATCH.md').startsWith(`# SportPilot ${version}`)) {
  fail('README-PATCH.md ne correspond pas à la version stable.');
}
if (!read('INSTALLATION.txt').includes(`SPORTPILOT ${version}`)) {
  fail('INSTALLATION.txt ne correspond pas à la version stable.');
}

const productionRoots = ['src', 'vite.config.ts', 'index.html', 'INSTALLATION.txt', 'README-PATCH.md'];
const allowedExtensions = new Set(['.ts', '.tsx', '.html', '.txt', '.md']);
const staleVersionPattern = /0\.14\.0-alpha|0\.13\.0-alpha/g;
const correctionFilePattern = /^README-CORRECTION-/;

function collectFiles(path) {
  const absolute = join(root, path);
  const entries = readdirSync(absolute, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const next = join(path, entry.name);
    if (entry.isDirectory()) return collectFiles(next);
    return allowedExtensions.has(extname(entry.name)) ? [next] : [];
  });
}

const files = productionRoots.flatMap((path) => path === 'src' ? collectFiles(path) : [path]);
for (const path of files) {
  const content = read(path);
  if (staleVersionPattern.test(content)) {
    fail(`une ancienne préversion est encore présente dans ${relative(root, join(root, path))}.`);
  }
  staleVersionPattern.lastIndex = 0;
}

const rootFiles = readdirSync(root);
if (rootFiles.some((name) => correctionFilePattern.test(name))) {
  fail('un fichier temporaire README-CORRECTION-* est encore présent à la racine.');
}

const viteConfig = read('vite.config.ts');
if (!viteConfig.includes('__APP_VERSION__: JSON.stringify(appVersion)')) {
  fail('la version du build Vite n’est pas injectée depuis package.json.');
}
const openFoodFactsClient = read('src/infrastructure/open-food-facts/OpenFoodFactsClient.ts');
if (!openFoodFactsClient.includes('app_version: __APP_VERSION__')) {
  fail('Open Food Facts n’utilise pas la version injectée du build.');
}
if (!/databaseSchemaVersion = 2/.test(read('src/infrastructure/database/schema.ts'))) {
  fail('la version Dexie attendue est absente.');
}
if (!/CURRENT_BACKUP_SCHEMA_VERSION = 2/.test(read('src/infrastructure/backup/backupMigrations.ts'))) {
  fail('la version de sauvegarde attendue est absente.');
}

console.log(`Audit release réussi : SportPilot ${version}, versions, documentation, schémas et métadonnées cohérents.`);
