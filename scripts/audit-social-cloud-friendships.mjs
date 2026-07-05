import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit amitiés cloud 0.28.0 F5 échoué : ${message}`);
};

const requiredFiles = [
  'src/domain/friends/socialCloudFriendship.ts',
  'src/domain/friends/socialCloudFriendship.test.ts',
  'src/application/friends/socialCloudFriendshipService.ts',
  'src/application/friends/socialCloudFriendshipService.test.ts',
  'src/infrastructure/sync-prototype/realSocialCloudFriendshipService.ts',
  'src/infrastructure/sync-prototype/realSocialCloudFriendshipService.test.ts',
  'src/app/socialCloudFriendshipsReadiness.test.ts',
  'docs/architecture/social-cloud-friendships-0.28.0-f5.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const domain = read('src/domain/friends/socialCloudFriendship.ts');
for (const token of [
  'SOCIAL_CLOUD_FRIENDSHIP_CONTRACT_VERSION',
  '0.28.0-f5',
  'buildCloudFriendshipFromAcceptedRequest',
  'createCloudFriendshipId',
  'relationshipKey: \'userId\'',
  'defaultPermissionLevel: \'summary\'',
  'detailedRequiresConsent: true',
  'exposesRawActivity: false',
  'automaticFriendshipWithoutAcceptedRequest',
  'handleBasedRelationship',
  'rawActivityExport',
  'mergeCloudFriendPermissionsIntoSnapshot',
]) {
  assert(domain.includes(token), `domaine amitiés cloud incomplet : ${token} absent.`);
}
assert(!domain.includes('socialRawActivities'), 'F5 ne doit pas manipuler d’activités brutes.');

const service = read('src/infrastructure/sync-prototype/realSocialCloudFriendshipService.ts');
for (const token of [
  'createRealSocialCloudFriendshipPort',
  'createRealSocialCloudFriendPermissionPort',
  'createRuntimeSocialCloudFriendshipPort',
  'createRuntimeSocialCloudFriendPermissionPort',
  'unavailableSocialCloudFriendshipPort',
  'unavailableSocialCloudFriendPermissionPort',
  'realSocialCloudEnabled',
  'socialFriendships',
  'socialFriendPermissions',
]) {
  assert(service.includes(token), `service amitiés cloud incomplet : ${token} absent.`);
}
assert(!service.includes('fetch('), 'F5 ne doit pas ajouter d’appel HTTP direct.');
assert(!service.includes('XMLHttpRequest'), 'F5 ne doit pas ajouter d’appel réseau direct.');
assert(!service.includes('rawActivity'), 'F5 ne doit pas manipuler d’activité brute.');

const runtime = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const token of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 13',
  "'socialFriendships'",
  "'socialFriendPermissions'",
  "socialFriendships: 'id, userAId, userBId, status, updatedAt",
  "socialFriendPermissions: 'id, ownerUserId, friendUserId, sharingLevel, updatedAt",
  '[ownerUserId+friendUserId]',
]) {
  assert(runtime.includes(token), `runtime Dexie Cloud F5 incomplet : ${token} absent.`);
}
assert(!runtime.includes('socialRawActivities'), 'le runtime ne doit pas créer de table socialRawActivities.');
assert(!runtime.includes('globalUserDirectory'), 'le runtime ne doit pas créer d’annuaire global.');

const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
for (const token of [
  'Cloud social 0.28.0 F5',
  'Amitiés cloud F5 prêtes',
  'permissions synchronisées',
  'Résumé par défaut',
  'détail uniquement après consentement explicite',
  'aucun snapshot distant',
  'aucun export brut',
]) {
  assert(page.includes(token), `page Amis F5 incomplète : ${token} absent.`);
}

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['audit:social-cloud-friendships'] === 'node scripts/audit-social-cloud-friendships.mjs', 'script npm audit:social-cloud-friendships manquant.');
assert(packageJson.scripts.check.includes('npm run audit:social-cloud-friendships'), 'npm run check doit inclure audit:social-cloud-friendships.');
assert(packageJson.scripts.ci.includes('npm run audit:social-cloud-friendships'), 'npm run ci doit inclure audit:social-cloud-friendships.');

const doc = read('docs/architecture/social-cloud-friendships-0.28.0-f5.md');
for (const token of [
  '0.28.0 F5',
  'Amitiés cloud',
  'permissions synchronisées',
  'userId',
  'résumé par défaut',
  'consentement explicite',
  'pas de relation basée sur handle',
  'pas de snapshot distant',
  'pas de feed distant réel',
  'd’export brut d’activité',
]) {
  assert(doc.includes(token), `documentation F5 incomplète : ${token} absent.`);
}

console.log('Audit amitiés cloud 0.28.0 F5 OK');
