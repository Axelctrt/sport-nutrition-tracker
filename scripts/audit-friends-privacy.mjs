import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'src/domain/friends/friendship.ts',
  'src/domain/friends/friendship.test.ts',
  'src/application/friends/friendsPrivacyService.ts',
  'src/application/friends/friendsPrivacyService.test.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.test.tsx',
  'docs/architecture/friends-privacy-0.26.0-f1.md',
];

const missingFiles = requiredFiles.filter((file) => !existsSync(file));
const failures = [];

if (missingFiles.length > 0) {
  failures.push(`fichiers manquants : ${missingFiles.join(', ')}`);
}

function read(path) {
  return readFileSync(path, 'utf8');
}

if (!read('src/app/routePaths.ts').includes("friends: '/friends'")) {
  failures.push('route /friends absente de routePaths');
}

if (!read('src/app/router.tsx').includes('LazyFriendsPrivacyPage')) {
  failures.push('page amis non enregistrée dans le router');
}

if (!read('src/app/navigation.tsx').includes("label: 'Amis'")) {
  failures.push('navigation principale amis absente');
}

const page = existsSync('src/features/friends/pages/FriendsPrivacyPage.tsx')
  ? read('src/features/friends/pages/FriendsPrivacyPage.tsx')
  : '';
const domain = existsSync('src/domain/friends/friendship.ts')
  ? read('src/domain/friends/friendship.ts')
  : '';
const visibleSources = `${page}
${domain}`;

const requiredPagePhrases = [
  'Amis et confidentialité',
  'Partage contrôlé par défaut',
  'Les données détaillées restent privées',
  'Envoyer une invitation',
  'Partage désactivé',
];

for (const phrase of requiredPagePhrases) {
  if (!visibleSources.includes(phrase)) {
    failures.push(`texte visible manquant : ${phrase}`);
  }
}

for (const symbol of [
  'DEFAULT_FRIENDS_PRIVACY_SETTINGS',
  'acceptFriendRequest',
  'declineFriendRequest',
  'addOutgoingFriendRequest',
  'summarizeFriendsPrivacy',
]) {
  if (!domain.includes(symbol)) {
    failures.push(`contrat domaine manquant : ${symbol}`);
  }
}

if (/prochainement|\bMVP\b|\bTODO\b/u.test(page)) {
  failures.push('texte de production interdit dans la page amis');
}

if (failures.length > 0) {
  console.error('Audit amis/confidentialité échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit amis/confidentialité réussi : route, domaine, service, page, tests et garde-fous de partage sont présents.');
