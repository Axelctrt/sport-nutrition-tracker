import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const requiredFiles = [
  'src/domain/friends/friendship.ts',
  'src/domain/friends/friendship.test.ts',
  'src/application/friends/friendsPrivacyService.ts',
  'src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts',
  'src/infrastructure/database/migrations/version10.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.test.tsx',
  'src/infrastructure/backup/friendsPrivacyBackup.test.ts',
  'src/app/socialFriendPermissionsReadiness.test.ts',
  'docs/architecture/social-friend-permissions-0.27.0-f3.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`fichier manquant : ${file}`);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const domain = read('src/domain/friends/friendship.ts');
const service = read('src/application/friends/friendsPrivacyService.ts');
const repository = read('src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts');
const schema = read('src/infrastructure/database/schema.ts');
const versions = read('src/infrastructure/database/migrations/versions.ts');
const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
const backupSchemas = read('src/infrastructure/backup/backupSchemas.ts');
const backupModels = read('src/domain/models/backup.ts');
const backupService = read('src/infrastructure/backup/backupService.ts');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const packageJson = read('package.json');
const docs = read('docs/architecture/social-friend-permissions-0.27.0-f3.md');

for (const symbol of [
  'FriendActivityPermission',
  'StoredFriendActivityPermission',
  'createDefaultFriendActivityPermission',
  'ensureFriendActivityPermissions',
  'updateFriendActivityPermission',
  'evaluateFriendScopedActivitySharingGuard',
  'canExposeFriendActivityDetailsToFriend',
]) {
  if (!domain.includes(symbol)) failures.push(`contrat permissions F3 manquant : ${symbol}`);
}

for (const phrase of [
  'Résumé uniquement',
  'Autoriser le détail',
  'Permission :',
  'Consentement détaillé enregistré pour cet ami',
  'Snapshots sociaux F4 actifs',
]) {
  if (!page.includes(phrase) && !service.includes(phrase)) failures.push(`texte/feedback F3 manquant : ${phrase}`);
}

if (!repository.includes('friendActivityPermissions')) failures.push('repository Dexie non branché aux permissions par ami');
if (!schema.includes('friendActivityPermissions')) failures.push('table friendActivityPermissions absente du schéma Dexie');
if (!/DATABASE_VERSION_10\s*=\s*10\s+as\s+const/u.test(versions)) failures.push('DATABASE_VERSION_10 absent');
if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_10/u.test(versions)) failures.push('CURRENT_DATABASE_VERSION ne pointe pas vers DATABASE_VERSION_10');
if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*9/u.test(backupMigrations)) failures.push('CURRENT_BACKUP_SCHEMA_VERSION ne pointe pas vers 9');

for (const source of [backupSchemas, backupModels, backupService]) {
  if (!source.includes('friendActivityPermissions')) failures.push('sauvegarde JSON v9 ne couvre pas friendActivityPermissions');
}

if (!packageJson.includes('audit:social-friend-permissions')) failures.push('script audit:social-friend-permissions absent');
if (!docs.includes('Résumé par défaut') || !docs.includes('Détail uniquement après consentement explicite')) {
  failures.push('documentation F3 incomplète sur résumé/détail');
}

if (/socialFeed|messagerie|classement/u.test(domain + service + repository + page)) {
  failures.push('F3/F4 ne doit pas introduire de fil, messagerie ou classement');
}

if (/fetch\(|axios|supabase|firebase/u.test(service + repository)) {
  failures.push('F3 ne doit pas inventer de backend concret');
}

if (failures.length > 0) {
  console.error('Audit permissions de partage par ami 0.27.0 F3 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit permissions de partage par ami 0.27.0 F3 réussi : résumé par défaut, détail sur consentement local, Dexie v10, sauvegarde JSON v9 et garde-fou social sont couverts.');
