import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/u, '');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit social activity sharing settings 0.29.0 A9 échoué : ${message}`);
};

const requiredFiles = [
  'src/features/friends/components/SocialActivitySharingSettings.tsx',
  'src/features/friends/components/SocialActivitySharingSettings.test.tsx',
  'src/shared/validation/socialActivitySharingSchema.ts',
  'src/infrastructure/social-activity-snapshots/runtimeSocialActivityPrivacyReconciliation.ts',
  'src/infrastructure/social-activity-snapshots/runtimeSocialActivityPrivacyReconciliation.test.ts',
  'src/app/socialActivitySharingSettingsReadiness.test.ts',
  'docs/architecture/social-activity-feed-0.29.0-a9.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const settings = read('src/features/friends/components/SocialActivitySharingSettings.tsx');
const privacyPage = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const activityForm = read('src/features/activities/components/ActivityForm.tsx');
const workoutPage = read('src/features/strength-sessions/pages/WorkoutSessionPage.tsx');
const policy = read('src/domain/friends/socialActivitySharingPolicy.ts');
const publication = read('src/application/friends/socialActivityPublicationService.ts');
const reconciliation = read('src/infrastructure/social-activity-snapshots/runtimeSocialActivityPrivacyReconciliation.ts');
const activityModel = read('src/domain/models/activity.ts');
const strengthModel = read('src/domain/models/strength.ts');
const backupSchemas = read('src/infrastructure/backup/backupSchemas.ts');

for (const token of [
  'SocialActivityGlobalSharingSettings',
  'SocialActivityOverrideSettings',
  'min-h-11',
  'sm:grid-cols-2',
  'Les notes personnelles et les champs techniques restent toujours privés.',
]) {
  assert(settings.includes(token), `éditeur de partage incomplet : ${token}`);
}

for (const mode of ["'private'", "'summary'", "'detailed'", "'custom'"]) {
  assert(settings.includes(mode), `mode global manquant : ${mode}`);
}
assert(settings.includes("'inherit'"), 'héritage global absent des surcharges par activité.');

assert(privacyPage.includes('setSocialActivitySharingPolicy'), 'la page de confidentialité ne persiste pas la politique 0.29.');
assert(privacyPage.includes('reconcilePrivacy'), 'la page de confidentialité ne réconcilie pas les snapshots existants.');
assert(privacyPage.includes('reconcilePrivacy(persistSnapshot'), 'la réconciliation démarre avant la persistance des réglages.');
assert(privacyPage.includes("disabled={snapshot.privacy.profileVisibility === 'private'}"), 'le profil privé ne neutralise pas l’éditeur global.');
assert(activityForm.includes('SocialActivityOverrideSettings'), 'le formulaire d’activité ne propose pas de surcharge.');
assert(workoutPage.includes('saveSocialSharing'), 'la séance de musculation ne sauvegarde pas sa surcharge.');
assert(activityModel.includes('socialSharing?: SocialActivitySharingOverride'), 'le modèle Activity ne persiste pas la surcharge.');
assert(strengthModel.includes('socialSharing?: SocialActivitySharingOverride'), 'le modèle WorkoutSession ne persiste pas la surcharge.');
assert(publication.includes('activity.socialSharing'), 'la publication n’applique pas la surcharge de l’activité.');
assert(publication.includes('session.socialSharing'), 'la publication n’applique pas la surcharge de la séance.');
assert(reconciliation.includes('reconcileAllSocialActivityPrivacy'), 'le service de réconciliation globale est absent.');
assert(policy.includes('socialActivityGlobalPolicyFromLegacyPrivacy'), 'la compatibilité du réglage historique est absente.');
assert(backupSchemas.includes('socialActivitySharingOverrideSchema.optional()'), 'les sauvegardes ne valident pas les surcharges optionnelles.');
assert(!settings.includes('commentaire privé'), 'un champ privé est présenté comme partageable.');
assert(!settings.includes('notes personnelles:'), 'les notes personnelles sont proposées dans la sélection.');

console.log('Audit social activity sharing settings 0.29.0 A9 OK');
