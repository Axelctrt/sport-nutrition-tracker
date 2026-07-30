import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const read = (path) => existsSync(path) ? readFileSync(path, 'utf8') : '';
const requireFile = (path) => {
  if (!existsSync(path)) failures.push(`fichier manquant : ${path}`);
};
const requireToken = (source, token, label) => {
  if (!source.includes(token)) failures.push(`${label} : ${token}`);
};

for (const file of [
  'src/domain/friends/friendship.ts',
  'src/domain/friends/friendship.test.ts',
  'src/application/friends/friendsPrivacyService.ts',
  'src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/features/friends/components/SocialActivitySharingSettings.tsx',
  'src/features/friends/hooks/useFriendsSection.ts',
  'src/app/friends/FriendsSectionNavigation.tsx',
  'src/infrastructure/database/migrations/version10.ts',
  'src/infrastructure/backup/friendsPrivacyBackup.test.ts',
  'src/app/socialCompleteAcceptanceReadiness.test.ts',
]) requireFile(file);

const routes = read('src/app/routePaths.ts');
const router = read('src/app/router.tsx');
const navigation = read('src/app/navigation.tsx');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const sharing = read('src/features/friends/components/SocialActivitySharingSettings.tsx');
const sectionNavigation = read('src/app/friends/FriendsSectionNavigation.tsx');
const sectionHook = read('src/features/friends/hooks/useFriendsSection.ts');
const domain = read('src/domain/friends/friendship.ts');
const repository = read('src/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository.ts');
const schema = read('src/infrastructure/database/schema.ts');
const backup = read('src/infrastructure/backup/backupService.ts');
const activityForm = read('src/features/activities/components/ActivityForm.tsx');
const workoutSession = read('src/features/strength-sessions/pages/WorkoutSessionPage.tsx');
const packageJson = read('package.json');

requireToken(routes, "friends: '/friends'", 'route amis absente');
requireToken(router, 'LazyFriendsPrivacyPage', 'page amis absente du router');
requireToken(navigation, "label: 'Amis et confidentialité'", 'navigation Amis et confidentialité absente');

for (const token of [
  'FriendsSectionNavigation',
  'friends-panel-feed',
  'friends-panel-friends',
  'friends-panel-requests',
  'friends-panel-profile',
  "section === 'feed'",
  'SocialActivityFriendSharingSettings',
  'loadFriendsPrivacySnapshot',
  'persistFriendsPrivacySnapshot',
  'listPermissionsWithStatus',
  'removeFriendship',
]) requireToken(page, token, 'page amis incomplète');

for (const token of [
  "export type FriendsSectionId = 'feed' | 'friends' | 'requests' | 'profile'",
  'aria-current',
  'aria-controls',
  'incomingRequestCount',
]) requireToken(sectionNavigation, token, 'navigation Amis incomplète');

for (const token of [
  "new Set<FriendsSectionId>(['feed', 'friends', 'requests', 'profile'])",
  "new URLSearchParams(query).get('section')",
  'window.history.pushState',
  "window.addEventListener('popstate'",
]) requireToken(sectionHook, token, 'navigation profonde Amis incomplète');

for (const token of [
  "{ value: 'none', label: 'Aucun' }",
  "{ value: 'summary', label: 'Résumé' }",
  "{ value: 'detailed', label: 'Personnalisé' }",
  'Ce que {friendDisplayName} peut voir',
]) requireToken(sharing, token, 'réglages de partage incomplets');

for (const token of [
  'DEFAULT_FRIENDS_PRIVACY_SETTINGS',
  'updateFriendActivityPermission',
  'updateFriendActivityFieldSelection',
  'evaluateFriendScopedActivitySharingGuard',
  'removeFriendFromSnapshot',
  'activityPermissions',
]) requireToken(domain, token, 'contrat domaine incomplet');

for (const table of [
  'friendProfiles',
  'friendRequests',
  'friendsPrivacySettings',
  'friendActivityPermissions',
]) {
  requireToken(schema, table, 'table Dexie absente');
  requireToken(backup, table, 'table absente de la sauvegarde');
}

requireToken(repository, 'DexieFriendsPrivacyRepository', 'repository Dexie absent');
if (activityForm.includes('SocialActivitySharingSettings')) {
  failures.push('le formulaire d’activité ne doit pas contenir de réglage social');
}
if (workoutSession.includes('SocialActivitySharingSettings')) {
  failures.push('la séance de musculation ne doit pas contenir de réglage social');
}
requireToken(packageJson, 'audit:friends-privacy', 'script npm absent');
requireToken(packageJson, 'npm run audit:friends-privacy', 'audit absent de check/ci');

if (failures.length) {
  console.error('Audit amis/confidentialité échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Audit amis/confidentialité réussi : route, persistance, permissions par ami, sauvegarde et source unique de partage sont cohérentes.');
