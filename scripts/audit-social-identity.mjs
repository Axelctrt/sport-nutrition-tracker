import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const requiredFiles = [
  'src/domain/friends/socialIdentity.ts',
  'src/domain/friends/socialIdentity.test.ts',
  'src/application/friends/socialIdentityService.ts',
  'src/application/friends/socialIdentityService.test.ts',
  'src/infrastructure/repositories/dexie/DexieSocialIdentityRepository.ts',
  'src/infrastructure/repositories/dexie/DexieSocialIdentityRepository.test.ts',
  'src/app/socialIdentityReadiness.test.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'docs/architecture/social-identity-0.27.0-f1.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`fichier manquant : ${file}`);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const domain = read('src/domain/friends/socialIdentity.ts');
const service = read('src/application/friends/socialIdentityService.ts');
const repository = read('src/infrastructure/repositories/dexie/DexieSocialIdentityRepository.ts');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const friendship = read('src/domain/friends/friendship.ts');
const backupSchemas = read('src/infrastructure/backup/backupSchemas.ts');
const packageJson = read('package.json');

for (const symbol of [
  'SocialIdentity',
  'PublicUserProfile',
  'SocialUserLookupResult',
  'CloudFriendRequest',
  'CloudFriendship',
  'validateSocialHandle',
  'RESERVED_SOCIAL_HANDLES',
]) {
  if (!domain.includes(symbol)) failures.push(`contrat identité sociale manquant : ${symbol}`);
}

for (const phrase of [
  'Mon identifiant SportPilot',
  'Copier mon identifiant',
  'Vérifier disponibilité',
  'Enregistrer',
  'Identifiant valide',
  'Identifiant invalide',
  'Compte cloud indisponible',
  'Utilisateur non connecté au cloud social',
  'Aucun export social détaillé n’est disponible en 0.27.0 F2',
]) {
  if (!page.includes(phrase)) failures.push(`texte F1 manquant dans la page amis : ${phrase}`);
}

for (const reserved of [
  'admin',
  'support',
  'sportpilot',
  'root',
  'api',
  'system',
  'moderator',
  'null',
  'undefined',
  'me',
]) {
  if (!domain.includes(`'${reserved}'`)) failures.push(`mot réservé non bloqué : ${reserved}`);
}

if (!/\^\[a-z0-9\._-\]\+\$/.test(domain)) {
  failures.push('validation stricte du handle absente');
}

if (!domain.includes('withoutPrefix.length < 3 || withoutPrefix.length > 24')) {
  failures.push('limite 3 à 24 caractères absente');
}

if (!service.includes('unavailableSocialUserLookupGateway')) {
  failures.push('gateway cloud indisponible par défaut absent');
}

if (!service.includes('lookupByHandle')) {
  failures.push('port de recherche exacte absent');
}

if (!repository.includes('friendsPrivacySettings') || !repository.includes('socialIdentity')) {
  failures.push('persistance locale de l’identité sociale non branchée');
}

if (!friendship.includes('readonly socialIdentity?: SocialIdentity')) {
  failures.push('identité sociale non préservée dans les réglages amis persistés');
}

if (!backupSchemas.includes('socialIdentitySchema') || !backupSchemas.includes('socialIdentity: socialIdentitySchema.optional()')) {
  failures.push('sauvegarde JSON v8 ne préserve pas l’identité sociale optionnelle');
}

if (!packageJson.includes('audit:social-identity')) {
  failures.push('script audit:social-identity absent de package.json');
}

if (/activitySnapshot|socialFeed|like|commentaire|messagerie/u.test(domain + service + repository)) {
  failures.push('F1 ne doit pas introduire de fil, likes, commentaires, messagerie ou snapshots sociaux');
}

if (failures.length > 0) {
  console.error('Audit identité sociale 0.27.0 F1 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit identité sociale 0.27.0 F1 réussi : handle public, userId privé, recherche exacte préparée, cloud indisponible par défaut et garde-fou social conservé.');
