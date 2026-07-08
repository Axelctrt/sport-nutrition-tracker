import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/u, '');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit A20 R3 échoué : ${message}`);
};

const requiredFiles = [
  'src/domain/friends/friendship.ts',
  'src/application/friends/socialActivityPublicationService.ts',
  'src/features/friends/components/SocialActivitySharingSettings.tsx',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'src/features/activities/components/ActivityForm.tsx',
  'src/features/strength-sessions/pages/WorkoutSessionPage.tsx',
  'functions/_shared/socialFriends.js',
  'functions/_shared/socialActivitySnapshots.js',
  'docs/architecture/social-sharing-single-source-0.29.0-a20-r3.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const friendship = read(requiredFiles[0]);
const publication = read(requiredFiles[1]);
const settings = read(requiredFiles[2]);
const privacyPage = read(requiredFiles[3]);
const activityForm = read(requiredFiles[4]);
const workoutPage = read(requiredFiles[5]);
const friendsServer = read(requiredFiles[6]);
const snapshotsServer = read(requiredFiles[7]);

assert(friendship.includes("FriendActivityPermissionLevel = 'none' | 'summary' | 'detailed'"), 'les trois niveaux par ami ne sont pas définis.');
assert(friendship.includes("permission.sharingLevel === 'none'"), 'le domaine ne bloque pas aucun partage.');
assert(settings.includes("{ value: 'none', label: 'Aucun' }"), 'le choix Aucun manque.');
assert(settings.includes("{ value: 'summary', label: 'Résumé' }"), 'le choix Résumé manque.');
assert(settings.includes("{ value: 'detailed', label: 'Personnalisé' }"), 'le choix Personnalisé manque.');
assert(settings.includes('title="Musculation"'), 'le groupe Musculation manque.');
assert(settings.includes('title="Cardio"'), 'le groupe Cardio manque.');
assert(settings.includes('Visible uniquement lorsqu’il est renseigné.'), 'le RPE conditionnel n’est pas expliqué.');
assert(settings.includes('Visibles uniquement lorsqu’elles sont calculées.'), 'les calories conditionnelles ne sont pas expliquées.');
assert(!settings.includes("label: 'Graphique'"), 'le graphique est encore proposé sans données temporelles.');
assert(privacyPage.includes('SocialActivityFriendSharingSettings'), 'la page amis ne branche pas le réglage par ami.');
assert(!privacyPage.includes('SocialActivityGlobalSharingSettings'), 'le réglage global est encore affiché.');
assert(!activityForm.includes('SocialActivityOverrideSettings'), 'le formulaire d’activité affiche encore un réglage social.');
assert(!workoutPage.includes('SocialActivityOverrideSettings'), 'la séance de musculation affiche encore un réglage social.');
assert(publication.includes("override?.mode === 'private'"), 'la compatibilité avec les activités historiquement privées manque.');
assert(friendsServer.includes("new Set(['none', 'summary', 'detailed'])"), 'le serveur de permissions refuse encore le niveau none.');
assert(snapshotsServer.includes("permission.sharing_level === 'none'"), 'la publication serveur ne bloque pas none.');
assert((snapshotsServer.match(/p\.sharing_level <> 'none'/gu) ?? []).length >= 2, 'le fil et le détail ne filtrent pas tous les deux none.');

console.log('Audit SportPilot 0.29.0 A20 R3 OK : partage configuré uniquement par ami.');
