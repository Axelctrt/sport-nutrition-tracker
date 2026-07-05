import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit recherche cloud sociale 0.28.0 F3 échoué : ${message}`);
};

const requiredFiles = [
  'src/domain/friends/socialCloudUserLookup.ts',
  'src/domain/friends/socialCloudUserLookup.test.ts',
  'src/application/friends/socialCloudUserLookupService.ts',
  'src/application/friends/socialCloudUserLookupService.test.ts',
  'src/infrastructure/sync-prototype/realSocialCloudUserLookupGateway.ts',
  'src/infrastructure/sync-prototype/realSocialCloudUserLookupGateway.test.ts',
  'src/app/socialCloudLookupReadiness.test.ts',
  'docs/architecture/social-cloud-lookup-0.28.0-f3.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const domain = read('src/domain/friends/socialCloudUserLookup.ts');
for (const token of [
  'SOCIAL_CLOUD_USER_LOOKUP_CONTRACT_VERSION',
  '0.28.0-f3',
  'found',
  'notFound',
  'invalidHandle',
  'unavailable',
  'globalUserDirectory',
  'publicSuggestions',
  'partialHandleSearch',
  'fuzzyMatching',
  'automaticFriendship',
  'automaticFriendRequest',
  'rawActivityExport',
  'createsFriendship: false',
  'createsFriendRequest: false',
]) {
  assert(domain.includes(token), `domaine recherche exacte incomplet : ${token} absent.`);
}

const service = read('src/application/friends/socialCloudUserLookupService.ts');
for (const token of [
  'lookupExactSocialCloudUser',
  'validateSocialHandle',
  'normalizeExactSocialCloudUserLookupResult',
]) {
  assert(service.includes(token), `service recherche exacte incomplet : ${token} absent.`);
}
assert(!service.includes('fetch('), 'F3 ne doit pas ajouter d’appel HTTP direct.');
assert(!service.includes('XMLHttpRequest'), 'F3 ne doit pas ajouter d’appel réseau direct.');

const gateway = read('src/infrastructure/sync-prototype/realSocialCloudUserLookupGateway.ts');
for (const token of [
  'createRealSocialCloudUserLookupGateway',
  'createRuntimeSocialCloudUserLookupGateway',
  'realSocialCloudEnabled',
  'createRealSocialCloudIdentityPort',
  'lookupByHandle',
]) {
  assert(gateway.includes(token), `gateway recherche exacte incomplet : ${token} absent.`);
}
assert(!gateway.includes('globalUserDirectory'), 'le gateway ne doit pas créer d’annuaire global.');
assert(!gateway.includes('suggest'), 'le gateway ne doit pas exposer de suggestions.');
assert(!gateway.includes('rawActivity'), 'le gateway ne doit pas manipuler d’activité brute.');

const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
assert(page.includes('Cloud social 0.28.0 F3'), 'la page Amis doit afficher la readiness F3.');
assert(page.includes('Recherche exacte F3 prête'), 'la page doit mentionner la recherche exacte F3.');
assert(page.includes('aucun matching partiel'), 'la page doit rappeler l’absence de matching partiel.');
assert(page.includes('aucune demande cloud'), 'la page doit rappeler l’absence de demande cloud en F3.');


const friendRequestService = read('src/application/friends/socialFriendRequestService.ts');
assert(friendRequestService.includes('lookupExactSocialCloudUser'), 'les demandes locales doivent passer par la recherche exacte F3.');
assert(!friendRequestService.includes('lookupGateway.lookupByHandle'), 'les demandes ne doivent plus contourner la couche F3 de normalisation exacte.');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['audit:social-cloud-lookup'] === 'node scripts/audit-social-cloud-lookup.mjs', 'script npm audit:social-cloud-lookup manquant.');
assert(packageJson.scripts.check.includes('npm run audit:social-cloud-lookup'), 'npm run check doit inclure audit:social-cloud-lookup.');
assert(packageJson.scripts.ci.includes('npm run audit:social-cloud-lookup'), 'npm run ci doit inclure audit:social-cloud-lookup.');

const doc = read('docs/architecture/social-cloud-lookup-0.28.0-f3.md');
for (const token of [
  '0.28.0 F3',
  'recherche exacte',
  'found',
  'notFound',
  'invalidHandle',
  'unavailable',
  'pas d’annuaire public',
  'aucune suggestion',
  'aucun matching partiel',
  'userId',
]) {
  assert(doc.includes(token), `documentation F3 incomplète : ${token} absent.`);
}

console.log('Audit recherche cloud sociale 0.28.0 F3 OK');
