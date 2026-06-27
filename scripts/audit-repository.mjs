import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';

const failures = [];
const fail = (message) => failures.push(message);
const excludedDirectories = new Set([
  '.git',
  'node_modules',
  'dist',
  'dev-dist',
  'coverage',
  'playwright-report',
  'test-results',
]);

function collectRepositoryFiles(directory = '.', prefix = '') {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && excludedDirectories.has(entry.name)) return [];
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = join(directory, entry.name);
    return entry.isDirectory() ? collectRepositoryFiles(absolutePath, relativePath) : [relativePath];
  });
}

let repositoryFiles = [];
let sourceLabel = 'fichiers du projet';
try {
  repositoryFiles = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    .split('\0')
    .filter(Boolean)
    .map((path) => path.replaceAll('\\', '/'));
  sourceLabel = 'fichiers suivis par Git';
} catch {
  repositoryFiles = collectRepositoryFiles();
}

const forbiddenPrefixes = [
  'node_modules/',
  'dist/',
  'dev-dist/',
  'coverage/',
  'playwright-report/',
  'test-results/',
];
const forbiddenSegments = [
  '/node_modules/',
  '/dist/',
  '/coverage/',
  '/playwright-report/',
  '/test-results/',
];
const forbiddenRootPatterns = [
  /^sportpilot[_-]/i,
  /^phase\d+[_-]/i,
  /^README-CORRECTION-/i,
];
const forbiddenExtensions = new Set(['.zip', '.7z', '.rar', '.log']);
const allowedEnvironmentFiles = new Set(['.env.example']);

for (const path of repositoryFiles) {
  const rootName = path.split('/')[0] ?? '';
  if (forbiddenPrefixes.some((prefix) => path.startsWith(prefix))) {
    fail(`le fichier généré ${path} ne doit pas faire partie de la livraison.`);
  }
  if (forbiddenSegments.some((segment) => path.includes(segment))) {
    fail(`le chemin généré ${path} ne doit pas faire partie de la livraison.`);
  }
  if (forbiddenRootPatterns.some((pattern) => pattern.test(rootName))) {
    fail(`le dossier ou fichier temporaire ${rootName} est présent à la racine.`);
  }
  if (forbiddenExtensions.has(extname(path).toLowerCase())) {
    fail(`l’archive ou le journal ${path} ne doit pas faire partie de la livraison.`);
  }
  const fileName = basename(path);
  if (fileName.startsWith('.env') && !allowedEnvironmentFiles.has(fileName)) {
    fail(`le fichier d’environnement ${path} ne doit pas faire partie de la livraison.`);
  }
}

const requiredFiles = [
  '.gitignore',
  'KNOWN-LIMITATIONS.md',
  'RELEASE-CHECKLIST.md',
  'ROLLBACK.md',
  'package-lock.json',
];
for (const path of requiredFiles) {
  if (!existsSync(path)) fail(`le fichier requis ${path} est absent.`);
}

if (existsSync('.gitignore')) {
  const gitignore = readFileSync('.gitignore', 'utf8');
  for (const pattern of ['node_modules/', 'dist/', 'playwright-report/', 'test-results/']) {
    if (!gitignore.includes(pattern)) fail(`.gitignore ne protège pas ${pattern}.`);
  }
}

if (failures.length > 0) {
  console.error('\nAudit du dépôt échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(`Audit du dépôt réussi : ${repositoryFiles.length} ${sourceLabel}, aucun artefact ou secret évident détecté.`);
}
