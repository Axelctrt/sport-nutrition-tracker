import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';

const failures = [];
const fail = (message) => failures.push(message);
const deploymentConfigPath =
  'src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts';
const runtimeConfigPath =
  'src/infrastructure/sync-prototype/syncPrototypeConfig.ts';

if (!existsSync(deploymentConfigPath)) {
  fail(`la configuration publique ${deploymentConfigPath} est absente.`);
}

let databaseUrl = '';
if (existsSync(deploymentConfigPath)) {
  const source = readFileSync(deploymentConfigPath, 'utf8');
  const urlMatch =
    /VITE_DEXIE_CLOUD_DATABASE_URL:\s*['"]([^'"]+)['"]/.exec(source);
  databaseUrl = urlMatch?.[1] ?? '';

  for (const expected of [
    "VITE_ENABLE_SYNC_PROTOTYPE: 'true'",
    "VITE_ENABLE_REAL_WEIGHT_SYNC: 'true'",
    "VITE_ENABLE_REAL_ACTIVITY_SYNC: 'true'",
    "VITE_ENABLE_REAL_GOAL_SYNC: 'true'",
    "VITE_ENABLE_REAL_STRENGTH_SYNC: 'true'",
    "VITE_ENABLE_SYNC_DIAGNOSTICS: 'false'",
  ]) {
    if (!source.includes(expected)) fail(`la valeur attendue ${expected} est absente.`);
  }

  if (/dexie-cloud\.(?:key|json)|private[_-]?key|client[_-]?secret|password\s*[:=]|token\s*[:=]/i.test(source)) {
    fail('la configuration publique semble contenir une donnée interdite ou sensible.');
  }

  try {
    const parsed = new URL(databaseUrl);
    const valid =
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.dexie.cloud') &&
      parsed.hostname !== 'dexie.cloud' &&
      parsed.pathname === '/' &&
      !parsed.search &&
      !parsed.hash &&
      !parsed.username &&
      !parsed.password &&
      parsed.port === '';
    if (!valid) fail('l’URL Dexie Cloud publique n’est pas une URL racine HTTPS valide.');
  } catch {
    fail('l’URL Dexie Cloud publique est absente ou invalide.');
  }
}

if (existsSync(runtimeConfigPath)) {
  const source = readFileSync(runtimeConfigPath, 'utf8');
  if (!source.includes('syncPublicDeploymentConfig')) {
    fail('la configuration publique n’est pas reliée au lecteur de configuration.');
  }
  if (!source.includes('import.meta.env.PROD')) {
    fail('la configuration publique n’est pas limitée au build de production.');
  }
  if (!source.includes('...import.meta.env')) {
    fail('les variables de la plateforme ne conservent pas la priorité.');
  }
}

const assetsDirectory = 'dist/assets';
if (existsSync(assetsDirectory) && databaseUrl) {
  const javascriptFiles = readdirSync(assetsDirectory)
    .filter((name) => ['.js', '.mjs'].includes(extname(name)))
    .map((name) => join(assetsDirectory, name));
  const bundleContainsUrl = javascriptFiles.some((path) =>
    readFileSync(path, 'utf8').includes(databaseUrl),
  );
  if (!bundleContainsUrl) {
    fail('le bundle de production ne contient pas l’URL Dexie Cloud publique attendue.');
  }
}

if (failures.length > 0) {
  console.error('\nAudit de déploiement de la synchronisation échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Audit de déploiement de la synchronisation réussi : configuration publique valide, surcharge de plateforme prioritaire et aucun secret évident.');
}
