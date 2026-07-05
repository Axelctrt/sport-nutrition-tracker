import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Audit cloud social 0.28.0 F1 échoué : ${message}`);
  }
}

const requiredFiles = [
  'src/domain/friends/socialCloudContract.ts',
  'src/domain/friends/socialCloudContract.test.ts',
  'src/application/friends/socialCloudReadinessService.ts',
  'src/application/friends/socialCloudReadinessService.test.ts',
  'src/infrastructure/sync-prototype/socialCloudReadinessAdapter.ts',
  'src/infrastructure/sync-prototype/socialCloudReadinessAdapter.test.ts',
  'src/app/socialCloudContractReadiness.test.ts',
  'docs/architecture/social-cloud-contract-0.28.0-f1.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const contract = read('src/domain/friends/socialCloudContract.ts');
for (const token of [
  'SOCIAL_CLOUD_CONTRACT_VERSION',
  '0.28.0-f1',
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
  'rawActivityExport',
  'globalUserDirectory',
  'publicSuggestions',
  'likes',
  'comments',
  'messaging',
  'groups',
  'leaderboards',
]) {
  assert(contract.includes(token), `contrat incomplet : ${token} absent.`);
}
assert(!contract.includes('socialRawActivities'), 'le contrat ne doit pas définir de collection socialRawActivities.');

const service = read('src/application/friends/socialCloudReadinessService.ts');
assert(service.includes('unavailableSocialCloudBackend'), 'fallback cloud indisponible manquant.');
assert(service.includes('Backend social cloud indisponible'), 'message indisponible explicite manquant.');
assert(!service.includes('fetch('), 'F1 ne doit pas appeler un backend HTTP réel.');
assert(!service.includes('XMLHttpRequest'), 'F1 ne doit pas ajouter d’appel réseau direct.');

const config = read('src/infrastructure/sync-prototype/syncPrototypeConfig.ts');
assert(config.includes('VITE_ENABLE_REAL_SOCIAL_CLOUD'), 'flag VITE_ENABLE_REAL_SOCIAL_CLOUD manquant.');
assert(config.includes('realSocialCloudEnabled'), 'config realSocialCloudEnabled manquante.');

const publicConfig = read('src/infrastructure/sync-prototype/syncPublicDeploymentConfig.ts');
assert(publicConfig.includes("VITE_ENABLE_REAL_SOCIAL_CLOUD: 'false'"), 'le cloud social réel doit rester désactivé en configuration publique.');

const envExample = read('.env.example');
assert(envExample.includes('VITE_ENABLE_REAL_SOCIAL_CLOUD=false'), '.env.example doit documenter le flag social.');

const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
assert(page.includes('Cloud social 0.28.0 F3'), 'la page Amis doit afficher la readiness cloud social courante.');
assert(page.includes('aucun annuaire'), 'la page doit rappeler qu’aucun annuaire public n’est ouvert.');

const packageJson = JSON.parse(read('package.json'));
assert(packageJson.scripts['audit:social-cloud-contract'] === 'node scripts/audit-social-cloud-contract.mjs', 'script npm audit:social-cloud-contract manquant.');
assert(packageJson.scripts['audit:social-cloud-identity'] === 'node scripts/audit-social-cloud-identity.mjs', 'script npm audit:social-cloud-identity manquant.');
assert(packageJson.scripts.check.includes('npm run audit:social-cloud-contract'), 'npm run check doit inclure audit:social-cloud-contract.');
assert(packageJson.scripts.ci.includes('npm run audit:social-cloud-contract'), 'npm run ci doit inclure audit:social-cloud-contract.');

const doc = read('docs/architecture/social-cloud-contract-0.28.0-f1.md');
for (const token of [
  '0.28.0 F1',
  'aucune demande cloud réelle',
  'aucun snapshot distant',
  'pas d’annuaire public',
  'userId',
  'handle',
  'snapshots filtrés',
]) {
  assert(doc.includes(token), `documentation F1 incomplète : ${token} absent.`);
}

console.log('Audit cloud social 0.28.0 F1 OK');
