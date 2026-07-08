import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/u, '');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit social activity sharing settings 0.29.0 A20 R3 échoué : ${message}`);
};

const requiredFiles = [
  'src/features/friends/components/SocialActivitySharingSettings.tsx',
  'src/features/friends/components/SocialActivitySharingSettings.test.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/application/friends/socialActivityPublicationService.ts',
  'src/domain/friends/friendship.ts',
  'functions/_shared/socialActivitySnapshots.js',
  'functions/_shared/socialFriends.js',
  'src/app/socialActivitySharingSettingsReadiness.test.ts',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const settings = read('src/features/friends/components/SocialActivitySharingSettings.tsx');
const privacyPage = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const activityForm = read('src/features/activities/components/ActivityForm.tsx');
const workoutPage = read('src/features/strength-sessions/pages/WorkoutSessionPage.tsx');
const friendship = read('src/domain/friends/friendship.ts');
const publication = read('src/application/friends/socialActivityPublicationService.ts');
const snapshotsServer = read('functions/_shared/socialActivitySnapshots.js');
const friendsServer = read('functions/_shared/socialFriends.js');

for (const token of [
  "{ value: 'none', label: 'Aucun' }",
  "{ value: 'summary', label: 'Résumé' }",
  "{ value: 'detailed', label: 'Personnalisé' }",
  'Partage : {modeLabel}',
  'Musculation',
  'Cardio',
  'Visible uniquement lorsqu’il est renseigné.',
  'Visibles uniquement lorsqu’elles sont calculées.',
]) {
  assert(settings.includes(token), `éditeur par ami incomplet : ${token}`);
}

assert(!settings.includes("label: 'Graphique'"), 'le graphique est proposé sans série temporelle exploitable.');
assert(privacyPage.includes('SocialActivityFriendSharingSettings'), 'la page amis ne branche pas le réglage par ami.');
assert(!privacyPage.includes('SocialActivityGlobalSharingSettings'), 'un réglage global reste visible.');
assert(!activityForm.includes('SocialActivityOverrideSettings'), 'le formulaire d’activité contient encore un réglage social.');
assert(!activityForm.includes('Partage avec les amis'), 'le formulaire d’activité affiche encore le partage social.');
assert(!workoutPage.includes('SocialActivityOverrideSettings'), 'la séance de musculation contient encore un réglage social.');
assert(!workoutPage.includes('Enregistrer le partage'), 'la séance de musculation affiche encore une action de partage.');
assert(friendship.includes("FriendActivityPermissionLevel = 'none' | 'summary' | 'detailed'"), 'le niveau aucun partage manque au domaine.');
assert(publication.includes("override?.mode === 'private'"), 'la compatibilité avec les anciennes activités privées manque.');
assert(snapshotsServer.includes("p.sharing_level <> 'none'"), 'la lecture serveur ne filtre pas le niveau aucun partage.');
assert(friendsServer.includes("new Set(['none', 'summary', 'detailed'])"), 'le serveur de permissions ne valide pas les trois niveaux.');

console.log('Audit social activity sharing settings 0.29.0 A20 R3 OK');
