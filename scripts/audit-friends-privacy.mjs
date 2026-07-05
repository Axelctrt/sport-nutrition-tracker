import { readFileSync, existsSync } from 'node:fs';

const requiredFiles = [
  'src/domain/friends/friendship.ts',
  'src/domain/friends/friendship.test.ts',
  'src/application/friends/friendsPrivacyService.ts',
  'src/application/friends/friendsPrivacyService.test.ts',
  'src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts',
  'src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.test.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.test.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.persistence.test.tsx',
  'src/infrastructure/database/migrations/version9.ts',
  'src/infrastructure/database/migrations/version10.ts',
  'src/infrastructure/backup/friendsPrivacyBackup.test.ts',
  'docs/architecture/friends-privacy-0.26.0-f1.md',
  'docs/architecture/friends-privacy-0.26.0-f2.md',
  'docs/architecture/friends-privacy-0.26.0-f3.md',
  'docs/architecture/friends-privacy-0.26.0-f4.md',
  'src/app/friendsPrivacyReleaseReadiness.test.ts',
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
const repository = existsSync('src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts')
  ? read('src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts')
  : '';
const schema = read('src/infrastructure/database/schema.ts');
const versions = read('src/infrastructure/database/migrations/versions.ts');
const appDatabase = read('src/infrastructure/database/AppDatabase.ts');
const backupModels = read('src/domain/models/backup.ts');
const backupService = read('src/infrastructure/backup/backupService.ts');
const backupMigrations = read('src/infrastructure/backup/backupMigrations.ts');
const packageJson = read('package.json');
const visibleSources = `${page}
${domain}`;

const requiredPagePhrases = [
  'Amis et confidentialité',
  'Partage contrôlé par défaut',
  'Les données détaillées restent privées',
  'Envoyer une invitation',
  'Partage désactivé',
  'recherche réelle est indisponible',
  'Garde-fou social actif',
  'Aucun export social détaillé n’est disponible en 0.27.0 F3',
];

for (const phrase of requiredPagePhrases) {
  if (!visibleSources.includes(phrase)) {
    failures.push(`texte visible manquant : ${phrase}`);
  }
}

for (const symbol of [
  'DEFAULT_FRIENDS_PRIVACY_SETTINGS',
  'FRIENDS_PRIVACY_SETTINGS_ID',
  'StoredFriendProfile',
  'StoredFriendRequest',
  'StoredFriendsPrivacySettings',
  'acceptFriendRequest',
  'declineFriendRequest',
  'addOutgoingFriendRequest',
  'summarizeFriendsPrivacy',
  'evaluateFriendActivitySharingGuard',
  'canExposeFriendActivityDetails',
  'FriendActivitySharingGuard',
]) {
  if (!domain.includes(symbol)) {
    failures.push(`contrat domaine manquant : ${symbol}`);
  }
}

for (const tableName of [
  'friendProfiles',
  'friendRequests',
  'friendsPrivacySettings',
  'friendActivityPermissions',
]) {
  if (!schema.includes(tableName)) {
    failures.push(`table Dexie absente du schéma : ${tableName}`);
  }
  if (!appDatabase.includes(`declare ${tableName}`)) {
    failures.push(`table Dexie absente de AppDatabase : ${tableName}`);
  }
  if (!backupModels.includes(tableName) || !backupService.includes(tableName)) {
    failures.push(`table amis absente de la sauvegarde : ${tableName}`);
  }
}

if (!/DATABASE_VERSION_9\s*=\s*9\s+as\s+const/.test(versions)) {
  failures.push('DATABASE_VERSION_9 absent');
}

if (!/CURRENT_DATABASE_VERSION\s*=\s*DATABASE_VERSION_10/.test(versions)) {
  failures.push('CURRENT_DATABASE_VERSION ne pointe pas vers DATABASE_VERSION_10');
}

if (!/CURRENT_BACKUP_SCHEMA_VERSION\s*=\s*9/.test(backupMigrations)) {
  failures.push('CURRENT_BACKUP_SCHEMA_VERSION ne pointe pas vers 9');
}

if (!repository.includes('DexieFriendsPrivacyRepository')) {
  failures.push('repository Dexie amis manquant');
}

if (!page.includes('persistFriendsPrivacySnapshot') || !page.includes('loadFriendsPrivacySnapshot')) {
  failures.push('page amis non branchée à la persistance locale');
}

if (!domain.includes('canShareDetailed: false') || !domain.includes('detailedSharingBlocked: true')) {
  failures.push('garde-fou de partage détaillé absent ou permissif');
}

if (!page.includes('sharingGuard.reason')) {
  failures.push('page amis ne rend pas le garde-fou social');
}

if (!packageJson.includes('audit:friends-privacy')) {
  failures.push('script audit:friends-privacy absent de package.json');
}

if (!packageJson.includes('npm run audit:friends-privacy')) {
  failures.push('audit:friends-privacy absent du check/ci');
}

if (/real.*cloud|dexieCloud|syncPrototypeClient/u.test(repository)) {
  failures.push('la persistance F2 ne doit pas activer de cloud réel');
}

if (/prochainement|MVP|TODO/u.test(page)) {
  failures.push('texte de production interdit dans la page amis');
}

if (failures.length > 0) {
  console.error('Audit amis/confidentialité échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit amis/confidentialité réussi : route, Dexie v10, sauvegarde JSON v9, page persistée, garde-fou social et blocage du détail sont présents.');
