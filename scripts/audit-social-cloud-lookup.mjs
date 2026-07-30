import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/domain/friends/socialIdentity.ts',
  'src/infrastructure/sync-prototype/socialDirectoryGateway.ts',
  'src/infrastructure/sync-prototype/realSocialCloudUserLookupGateway.ts',
  'functions/_shared/socialDirectory.js',
  'functions/api/social-directory/lookup.js',
  'src/app/socialCloudLookupReadiness.test.ts',
]) needFile(path);

const identity = read('src/domain/friends/socialIdentity.ts');
const gateway = read('src/infrastructure/sync-prototype/socialDirectoryGateway.ts');
const runtime = read('src/infrastructure/sync-prototype/realSocialCloudUserLookupGateway.ts');
const server = read('functions/_shared/socialDirectory.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

for (const value of ['validateSocialHandle', 'withoutPrefix.length < 3', 'RESERVED_SOCIAL_HANDLES']) {
  need(identity, value, 'validation exacte du handle absente');
}
for (const value of ['lookupByHandle', 'socialCloudApiHeaders(credentials', "cache: 'no-store'"]) {
  need(gateway, value, 'gateway de recherche incomplet');
}
for (const value of ['createRuntimeSocialCloudUserLookupGateway', 'realSocialCloudEnabled']) {
  need(runtime, value, 'runtime de recherche incomplet');
}
for (const value of ['authenticateRequest', 'lookupSocialHandle', 'SOCIAL_DIRECTORY_ACTOR_MISMATCH']) {
  need(server, value, 'route de recherche incomplète');
}
for (const value of ['Ajouter un ami', 'activeLookupGateway', 'sendExactFriendRequest']) {
  need(page, value, 'intégration de recherche incomplète');
}
if (server.includes('LIKE')) failures.push('la recherche sociale ne doit pas utiliser de matching SQL approximatif');

if (failures.length) {
  console.error('Audit recherche cloud sociale échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit recherche cloud sociale réussi : handle exact, route authentifiée, no-store et absence d’annuaire approximatif sont vérifiés.');
