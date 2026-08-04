import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const expectFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const expectToken = (source, token, label) => { if (!source.includes(token)) failures.push(`${label} : ${token}`); };
const rejectToken = (source, token, label) => { if (source.includes(token)) failures.push(`${label} : ${token}`); };

for (const file of [
  'src/domain/friends/socialIdentity.ts',
  'src/application/friends/socialIdentityService.ts',
  'src/infrastructure/repositories/dexie/DexieSocialIdentityRepository.ts',
  'src/infrastructure/sync-prototype/socialDirectoryGateway.ts',
  'src/infrastructure/sync-prototype/realSocialCloudIdentityService.ts',
  'functions/_shared/socialDirectory.js',
  'functions/_shared/socialIdentityReconciliation.js',
  'src/app/friends/FriendsSectionNavigation.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/app/socialIdentityCanonicalReconciliationReadiness.test.ts',
]) expectFile(file);

const domain = read('src/domain/friends/socialIdentity.ts');
const service = read('src/application/friends/socialIdentityService.ts');
const repository = read('src/infrastructure/repositories/dexie/DexieSocialIdentityRepository.ts');
const gateway = read('src/infrastructure/sync-prototype/socialDirectoryGateway.ts');
const directory = read('functions/_shared/socialDirectory.js');
const reconciliation = read('functions/_shared/socialIdentityReconciliation.js');
const navigation = read('src/app/friends/FriendsSectionNavigation.tsx');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const backup = read('src/infrastructure/backup/backupSchemas.ts');

for (const token of [
  'SocialIdentity',
  'PublicUserProfile',
  'validateSocialHandle',
  'RESERVED_SOCIAL_HANDLES',
  'createDefaultSocialIdentity',
  'publicProfileFromIdentity',
]) expectToken(domain, token, 'domaine identité incomplet');
expectToken(service, 'lookupByHandle', 'service de recherche exacte absent');
expectToken(repository, 'socialIdentity', 'persistance locale de l’identité absente');
expectToken(backup, 'socialIdentitySchema', 'sauvegarde de l’identité absente');

for (const token of [
  'aria-label="Profil social"',
  'copyIdentity',
  'SOCIAL_HANDLE_AVAILABILITY_DEBOUNCE_MS = 350',
  'aria-describedby="social-handle-status"',
  'canSaveIdentity',
  'Enregistrer',
]) expectToken(page, token, 'interface identité incomplète');
rejectToken(page, 'Vérifier disponibilité', 'ancien contrôle manuel encore présent');

for (const token of [
  "label: 'Mon profil social'",
  "shortLabel: 'Profil'",
]) expectToken(navigation, token, 'navigation identité incomplète');

for (const token of [
  'socialCloudApiHeaders(credentials',
  "cache: 'no-store'",
  'reserveIdentity',
  'lookupByHandle',
]) expectToken(gateway, token, 'gateway identité non sécurisé');
for (const token of [
  'authenticateRequest',
  'SOCIAL_DIRECTORY_ACTOR_MISMATCH',
  'reserveSocialHandle',
]) expectToken(directory, token, 'route annuaire incomplète');
for (const token of [
  'authenticateRequest',
  'const legacyIds = new Set();',
  'existingHandle.owner_user_id !== canonicalUserId',
  'SOCIAL_IDENTITY_RECONCILIATION_HANDLE_CONFLICT',
]) expectToken(reconciliation, token, 'réconciliation canonique incomplète');

for (const token of [
  'privateIdentity.userId === previousUserId',
  'existingHandle?.owner_user_id === previousUserId',
]) rejectToken(reconciliation, token, 'reconciliation canonique accepte encore une preuve privee non fiable');

if (failures.length) {
  console.error('Audit identité sociale échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit identité sociale réussi : validation automatique temporisée, persistance, annuaire authentifié et réconciliation canonique sont présents.');
