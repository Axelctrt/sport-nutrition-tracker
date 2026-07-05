import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const requiredFiles = [
  'src/application/friends/socialFriendRequestService.ts',
  'src/application/friends/socialFriendRequestService.test.ts',
  'src/domain/friends/friendship.ts',
  'src/domain/friends/friendship.test.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.test.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.persistence.test.tsx',
  'src/app/socialFriendRequestsReadiness.test.ts',
  'docs/architecture/social-friend-requests-0.27.0-f2.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`fichier manquant : ${file}`);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const domain = read('src/domain/friends/friendship.ts');
const requestService = read('src/application/friends/socialFriendRequestService.ts');
const identityService = read('src/application/friends/socialIdentityService.ts');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const backupSchemas = read('src/infrastructure/backup/backupSchemas.ts');
const schema = read('src/infrastructure/database/schema.ts');
const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
const packageJson = read('package.json');
const docs = read('docs/architecture/social-friend-requests-0.27.0-f2.md');

for (const symbol of [
  'requesterUserId',
  'recipientUserId',
  'createOutgoingFriendRequestForProfile',
  'evaluateFriendRequestEligibility',
  'alreadySent',
  'alreadyReceived',
  'alreadyFriend',
]) {
  if (!domain.includes(symbol)) failures.push(`contrat domaine F2 manquant : ${symbol}`);
}

for (const symbol of [
  'sendExactFriendRequest',
  'Identifiant inexistant',
  'Service cloud indisponible',
  'alreadyFriend',
  'alreadySent',
  'alreadyReceived',
]) {
  if (!requestService.includes(symbol)) failures.push(`service demandes réelles incomplet : ${symbol}`);
}

if (!requestService.includes('lookupGateway.lookupByHandle')) {
  failures.push('la demande F2 doit passer par une recherche exacte lookupByHandle');
}

if (!identityService.includes('unavailableSocialUserLookupGateway')) {
  failures.push('adapter cloud indisponible par défaut absent');
}

for (const phrase of [
  'Identifiant SportPilot',
  'Recherche ami',
  'recherche exacte',
  'recherche réelle est indisponible',
  'Snapshots sociaux F4 actifs',
]) {
  if (!page.includes(phrase)) failures.push(`texte/page F2 manquant : ${phrase}`);
}

if (!page.includes('sendExactFriendRequest')) {
  failures.push('la page amis n’utilise pas le flux de demande réelle F2');
}

if (page.includes('actions.sendRequest(handle)')) {
  failures.push('la page amis utilise encore le flux local legacy pour envoyer une demande');
}

for (const field of ['userId: z.string().min(1).optional()', 'requesterUserId', 'recipientUserId']) {
  if (!backupSchemas.includes(field)) failures.push(`sauvegarde JSON v9 ne préserve pas le champ F2 : ${field}`);
}

if (!/databaseSchemaVersion\s*=\s*CURRENT_DATABASE_VERSION/u.test(schema) || !/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*9/u.test(backupMigrations)) {
  failures.push('versions Dexie/backup impossibles à vérifier');
}

if (!packageJson.includes('audit:social-friend-requests')) {
  failures.push('script audit:social-friend-requests absent de package.json');
}

if (!domain.includes('toi-même')) failures.push('blocage demande vers soi-même absent du domaine');

if (!docs.includes('notFound') || !docs.includes('self') || !docs.includes('alreadySent') || !docs.includes('unavailable')) {
  failures.push('documentation F2 incomplète sur les états métier');
}

if (/socialFeed|activitySnapshot|like|commentaire|messagerie|classement/u.test(domain + requestService + page)) {
  failures.push('F2 ne doit pas introduire de fil, snapshot activité, likes, commentaires, messagerie ou classement');
}

if (/fetch\(|axios|supabase|firebase/u.test(requestService)) {
  failures.push('F2 ne doit pas inventer de backend concret');
}

if (failures.length > 0) {
  console.error('Audit demandes amis réelles 0.27.0 F2 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit demandes amis réelles 0.27.0 F2 réussi : recherche exacte, notFound, self, doublons, userId et backend indisponible par défaut sont couverts sans partage d’activité.');
