import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };
const reject = (source, value, label) => { if (source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/infrastructure/sync-prototype/realSocialCloudIdentityService.ts',
  'src/infrastructure/sync-prototype/socialDirectoryGateway.ts',
  'src/infrastructure/sync-prototype/socialCloudApiCredentials.ts',
  'functions/_shared/socialDirectory.js',
  'functions/_shared/socialIdentityReconciliation.js',
  'src/app/socialIdentityCanonicalReconciliationReadiness.test.ts',
]) needFile(path);

const service = read('src/infrastructure/sync-prototype/realSocialCloudIdentityService.ts');
const gateway = read('src/infrastructure/sync-prototype/socialDirectoryGateway.ts');
const credentials = read('src/infrastructure/sync-prototype/socialCloudApiCredentials.ts');
const directory = read('functions/_shared/socialDirectory.js');
const reconciliation = read('functions/_shared/socialIdentityReconciliation.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

for (const value of [
  'createRuntimeSocialCloudIdentityPort',
  'realSocialCloudEnabled',
  'reserveIdentity',
]) need(service, value, 'service identité cloud incomplet');
for (const value of [
  'socialCloudApiHeaders(credentials',
  "cache: 'no-store'",
  '/lookup',
  '/reserve',
]) need(gateway, value, 'gateway identité cloud incomplet');
need(credentials, 'authorization: `Bearer ${credentials.accessToken}`', 'Bearer cloud absent');
for (const value of ['authenticateRequest', 'SOCIAL_DIRECTORY_ACTOR_MISMATCH', 'reserveSocialHandle']) {
  need(directory, value, 'serveur identité cloud incomplet');
}
for (const value of [
  'authenticateRequest',
  'const legacyIds = new Set();',
  'SOCIAL_IDENTITY_RECONCILIATION_HANDLE_CONFLICT',
]) {
  need(reconciliation, value, 'réconciliation d’identité incomplète');
}
for (const value of ['Mon profil', 'copyIdentity', 'Vérifier disponibilité', 'Enregistrer']) {
  need(page, value, 'interface identité cloud incomplète');
}

reject(
  reconciliation,
  'privateIdentity.userId === previousUserId',
  'reconciliation d identite accepte encore une preuve privee non fiable',
);

if (failures.length) {
  console.error('Audit identités cloud sociales échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit identités cloud sociales réussi : credentials, annuaire, réservation et réconciliation canonique sont sécurisés.');
