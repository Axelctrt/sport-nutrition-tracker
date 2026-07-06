import { existsSync, readFileSync } from 'node:fs';

const requiredFiles = [
  'functions/_shared/socialDirectory.js',
  'functions/api/social-directory/reserve.js',
  'functions/api/social-directory/lookup.js',
  'src/infrastructure/sync-prototype/socialDirectoryGateway.ts',
  'src/infrastructure/sync-prototype/socialDirectoryGateway.test.ts',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    throw new Error(`Annuaire social serveur incomplet : fichier manquant ${file}`);
  }
}

const server = readFileSync('functions/_shared/socialDirectory.js', 'utf8');
const client = readFileSync('src/infrastructure/sync-prototype/socialDirectoryGateway.ts', 'utf8');
const identityRuntime = readFileSync('src/infrastructure/sync-prototype/realSocialCloudIdentityService.ts', 'utf8');
const lookupRuntime = readFileSync('src/infrastructure/sync-prototype/realSocialCloudUserLookupGateway.ts', 'utf8');
const envExample = readFileSync('.env.example', 'utf8');

const checks = [
  [server.includes('SOCIAL_DIRECTORY_DB'), 'Le serveur doit utiliser le binding D1 SOCIAL_DIRECTORY_DB.'],
  [server.includes('CREATE TABLE IF NOT EXISTS social_directory_handles'), 'Le serveur doit créer le contrat D1 social_directory_handles.'],
  [server.includes('Identifiant déjà réservé par un autre compte SportPilot.'), 'Le conflit handle déjà pris doit être explicite.'],
  [client.includes('VITE_SOCIAL_DIRECTORY_ENDPOINT'), 'Le front doit passer par un endpoint public configurable, sans secret VITE.'],
  [client.includes('/lookup?handle='), 'Le lookup exact doit passer par l’annuaire serveur.'],
  [client.includes('/reserve'), 'La réservation de handle doit passer par l’annuaire serveur.'],
  [identityRuntime.includes('createSocialDirectoryClient'), 'La publication identité runtime doit brancher l’annuaire serveur.'],
  [lookupRuntime.includes('socialDirectoryLookupClient'), 'La recherche runtime doit prioriser l’annuaire serveur.'],
  [envExample.includes('VITE_SOCIAL_DIRECTORY_ENDPOINT'), '.env.example doit documenter l’endpoint front.'],
  [envExample.includes('SOCIAL_DIRECTORY_DB'), '.env.example doit documenter le binding serveur D1.'],
];

for (const [ok, message] of checks) {
  if (!ok) throw new Error(message);
}

console.log('Audit annuaire social serveur OK.');
