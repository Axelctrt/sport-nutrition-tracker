import { existsSync, readFileSync, readdirSync } from 'node:fs';
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

const releaseNotesPath = `RELEASE-NOTES-${version}.md`;
const versionedDocumentation = [
  'README-PATCH.md',
  'INSTALLATION.txt',
  'RELEASE-CHECKLIST.md',
  'ROLLBACK.md',
  'KNOWN-LIMITATIONS.md',
  releaseNotesPath,
];
for (const path of versionedDocumentation) {
  if (!existsSync(join(root, path))) {
    fail(`le document versionné ${path} est absent.`);
  }
  if (!read(path).includes(version)) {
    fail(`${path} ne référence pas la version ${version}.`);
  }
}

const scripts = packageJson.scripts ?? {};
if (scripts['audit:production'] !== 'node scripts/audit-rc.mjs --auto') {
  fail('le script audit:production ne sélectionne pas automatiquement le mode RC ou stable.');
}
if (scripts['audit:repository'] !== 'node scripts/audit-repository.mjs') {
  fail('le script audit:repository est absent ou incohérent.');
}
if (!String(scripts.ci ?? '').includes('audit:production') || !String(scripts.ci ?? '').includes('audit:repository')) {
  fail('le pipeline ci n’exécute pas tous les audits de production et du dépôt.');
}

const ciWorkflow = read('.github/workflows/ci.yml');
for (const command of ['npm run ci', 'npm run test:stability', 'npm run test:e2e']) {
  if (!ciWorkflow.includes(command)) {
    fail(`le workflow CI n’exécute pas ${command}.`);
  }
}

if (typeof version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  fail(`la version ${String(version)} n’est pas une version sémantique valide.`);
}
if (packageLock.version !== version || packageLock.packages?.['']?.version !== version) {
  fail('package.json et package-lock.json n’utilisent pas la même version.');
}
const readmeTitle = read('README.md').split(/\r?\n/, 1)[0];
if (readmeTitle !== `# SportPilot ${version}`) {
  fail('le titre du README ne correspond pas à la version du package.');
}
if (!read('README-PATCH.md').startsWith(`# SportPilot ${version}`)) {
  fail('README-PATCH.md ne correspond pas à la version du package.');
}
if (!read('INSTALLATION.txt').includes(`SPORTPILOT ${version}`)) {
  fail('INSTALLATION.txt ne correspond pas à la version du package.');
}

const productionRoots = ['src', 'vite.config.ts', 'index.html', 'INSTALLATION.txt', 'README-PATCH.md'];
const allowedExtensions = new Set(['.ts', '.tsx', '.html', '.txt', '.md']);
const baseVersion = version.split('-', 1)[0];
const escapedBaseVersion = baseVersion.replaceAll('.', '\\.');
const staleVersionPattern = version.includes('-')
  ? /0\.15\.0-alpha\.\d+|0\.14\.0-alpha|0\.13\.0-alpha/g
  : new RegExp(`${escapedBaseVersion}-(?:alpha\\.\\d+|rc\\.\\d+)|0\\.14\\.0-alpha|0\\.13\\.0-alpha`, 'g');
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
const databaseVersions = read(
  'src/infrastructure/database/migrations/versions.ts',
);
const databaseSchema = read('src/infrastructure/database/schema.ts');
const backupMigrations = read(
  'src/infrastructure/backup/backupMigrations.ts',
);

if (
  !/DATABASE_VERSION_8\s*=\s*8\s+as\s+const\b/.test(
    databaseVersions,
  ) ||
  !/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_8\b/.test(
    databaseVersions,
  ) ||
  !/databaseSchemaVersion\s*=\s*CURRENT_DATABASE_VERSION\b/.test(
    databaseSchema,
  )
) {
  fail('le schéma Dexie v8 attendu est absent ou mal relié.');
}

if (
  !/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*7\b/.test(
    backupMigrations,
  )
) {
  fail('le format de sauvegarde JSON v7 attendu est absent.');
}

console.log(`Audit version réussi : SportPilot ${version}, documentation, schémas et métadonnées cohérents.`);
