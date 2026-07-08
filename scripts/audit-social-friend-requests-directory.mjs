import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const needFile = (path) => { if (!existsSync(path)) failures.push(`fichier manquant : ${path}`); };
const need = (source, value, label) => { if (!source.includes(value)) failures.push(`${label} : ${value}`); };

for (const path of [
  'src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts',
  'functions/_shared/socialFriendRequests.js',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/infrastructure/sync-prototype/socialFriendRequestsGateway.test.ts',
]) needFile(path);

const gateway = read('src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts');
const server = read('functions/_shared/socialFriendRequests.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

for (const value of [
  'listIncomingRequestsWithProfiles',
  'listOutgoingRequestsWithProfiles',
  'supportsProfiledSocialFriendRequestsPort',
  'socialCloudApiHeaders(credentials',
]) need(gateway, value, 'gateway profilé incomplet');
for (const value of [
  'handleSocialFriendRequestIncomingRequest',
  'handleSocialFriendRequestOutgoingRequest',
  'owner_display_name',
  'handle',
  'readProfilesForRequests',
]) {
  need(server, value, 'annuaire des demandes incomplet');
}
for (const value of [
  'listIncomingRequestsWithProfiles(effectiveIdentity.userId)',
  'listOutgoingRequestsWithProfiles(effectiveIdentity.userId)',
]) need(page, value, 'intégration UI des demandes profilées absente');

if (failures.length) {
  console.error('Audit annuaire des demandes d’amis échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Audit annuaire des demandes d’amis réussi : profils publics, listes entrantes/sortantes et UI sont alignés.');
