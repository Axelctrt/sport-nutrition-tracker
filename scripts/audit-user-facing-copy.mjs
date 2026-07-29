import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceRoot = join(root, 'src');
const excludedSegments = [
  '.test.',
  `${join('features', 'sync-prototype')}`,
];
const forbiddenPatterns = [
  { label: 'version de développement', pattern: /0\.25\.1\s+F2/iu },
  { label: 'fallback local', pattern: /fallback local/iu },
  { label: 'proxy backend', pattern: /proxy backend/iu },
  { label: 'confiance brute', pattern: /confidence\s+(?:low|medium|high)/iu },
  { label: 'mode technique', pattern: /mode\s*:\s*(?:fallback|remote|local)/iu },
  { label: 'variable Vite', pattern: /VITE_[A-Z0-9_]+/u },
];

function listTsxFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return listTsxFiles(path);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [path] : [];
  });
}

const failures = [];
for (const path of listTsxFiles(sourceRoot)) {
  const projectPath = relative(root, path);
  if (excludedSegments.some((segment) => projectPath.includes(segment))) continue;
  const contents = readFileSync(path, 'utf8');

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(contents)) failures.push(`${projectPath} : ${label}`);
  }
}

if (failures.length > 0) {
  console.error('Audit des textes utilisateur échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit des textes utilisateur réussi : aucun terme de développement interdit dans les composants ordinaires.');
