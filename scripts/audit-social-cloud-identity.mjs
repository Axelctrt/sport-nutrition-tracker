import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit identités cloud sociales 0.28.0 F2 échoué : ${message}`);
};

const requiredFiles = [
  'src/domain/friends/socialCloudIdentity.ts',
  'src/domain/friends/socialCloudIdentity.test.ts',
  'src/infrastructure/sync-prototype/realSocialCloudIdentityService.ts',
  'src/infrastructure/sync-prototype/realSocialCloudIdentityService.test.ts',
  'src/app/socialCloudIdentityReadiness.test.ts',
  'docs/architecture/social-cloud-identity-0.28.0-f2.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const domain = read('src/domain/friends/socialCloudIdentity.ts');
for (const token of [
  'SOCIAL_CLOUD_IDENTITY_CONTRACT_VERSION',
  '0.28.0-f2',
  'SocialHandleReservation',
  'SocialCloudIdentityRecord',
  'createSocialHandleReservationId',
  'social-handle:',
  'ownerUserId',
  'alreadyTaken',
  'ownedByCurrentUser',
]) {
  assert(domain.includes(token), `domaine identité cloud incomplet : ${token} absent.`);
}

const runtime = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const token of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 11',
  "'socialIdentities'",
  "'socialHandleReservations'",
  "socialIdentities: 'id, &userId, &handle, updatedAt'",
  "socialHandleReservations: 'id, &handle, ownerUserId, updatedAt'",
]) {
  assert(runtime.includes(token), `runtime Dexie Cloud incomplet : ${token} absent.`);
}
assert(!runtime.includes('socialRawActivities'), 'le runtime ne doit pas créer de table socialRawActivities.');
assert(!runtime.includes('globalUserDirectory'), 'le runtime ne doit pas créer d’annuaire global.');

const service = read('src/infrastructure/sync-prototype/realSocialCloudIdentityService.ts');
for (const token of [
  'createRealSocialCloudIdentityPort',
  'lookupByHandle',
  'reserveHandle',
  'publishIdentity',
  'Identifiant déjà réservé par un autre compte SportPilot',
  'cleanupPreviousHandleReservations',
]) {
  assert(service.includes(token), `service identité cloud incomplet : ${token} absent.`);
}
assert(!service.includes('fetch('), 'F2 ne doit pas ajouter d’appel HTTP direct.');
assert(!service.includes('XMLHttpRequest'), 'F2 ne doit pas ajouter d’appel réseau direct.');
assert(!service.includes('rawActivity'), 'le service identité cloud ne doit pas manipuler d’activité brute.');

const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
assert(page.includes('Cloud social 0.28.0 F3'), 'la page Amis doit afficher la readiness cloud sociale courante.');
assert(page.includes('réservations cloud'), 'la page doit mentionner les réservations cloud de handles.');
assert(page.includes('aucun annuaire'), 'la page doit rappeler l’absence d’annuaire.');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['audit:social-cloud-identity'] === 'node scripts/audit-social-cloud-identity.mjs', 'script npm audit:social-cloud-identity manquant.');
assert(packageJson.scripts.check.includes('npm run audit:social-cloud-identity'), 'npm run check doit inclure audit:social-cloud-identity.');
assert(packageJson.scripts.ci.includes('npm run audit:social-cloud-identity'), 'npm run ci doit inclure audit:social-cloud-identity.');

const doc = read('docs/architecture/social-cloud-identity-0.28.0-f2.md');
for (const token of [
  '0.28.0 F2',
  'socialIdentities',
  'socialHandleReservations',
  'handle exact',
  'userId',
  'pas d’annuaire public',
  'aucun snapshot distant',
]) {
  assert(doc.includes(token), `documentation F2 incomplète : ${token} absent.`);
}

console.log('Audit identités cloud sociales 0.28.0 F2 OK');
