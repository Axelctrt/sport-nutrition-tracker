import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOCIAL_RELEASE_VERSION = '0.29.0';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));

if (typeof packageJson.version !== 'string' || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(packageJson.version)) {
  fail(`package.json doit exposer une version sémantique, version reçue ${String(packageJson.version)}.`);
}
if (
  packageLock.version !== packageJson.version
  || packageLock.packages?.['']?.version !== packageJson.version
) {
  fail('package-lock.json ne correspond pas à package.json.');
}

const requiredDocs = [
  'README.md',
  'README-PATCH.md',
  'INSTALLATION.txt',
  'RELEASE-CHECKLIST.md',
  'RELEASE-NOTES-0.29.0.md',
  'ROLLBACK.md',
  'KNOWN-LIMITATIONS.md',
  'docs/architecture/social-complete-acceptance-0.29.0-a25.md',
  'docs/architecture/social-release-finalization-0.29.0-a26.md',
  'docs/architecture/social-security-hardening-0.29.0-a24.md',
  'docs/architecture/social-sync-resilience-0.29.0-a23.md',
  'docs/architecture/social-feed-finalization-0.29.0-a22.md',
  'docs/architecture/social-activity-detail-0.29.0-a21.md',
  'docs/architecture/social-sharing-single-source-0.29.0-a20-r3.md',
  'docs/architecture/social-friend-removal-0.29.0-a19.md',
  'docs/architecture/social-activity-sharing-enforcement-0.29.0-a18.md',
  'docs/architecture/social-friend-requests-0.29.0-a17.md',
  'docs/architecture/social-activity-feed-0.29.0-a14.md',
];
for (const path of requiredDocs) {
  if (!existsSync(join(root, path))) {
    fail(`${path} est absent.`);
  }
}

const packageText = read('package.json');
for (const command of [
  'audit:friends-privacy',
  'audit:social-identity',
  'audit:social-friend-requests',
  'audit:social-friend-permissions',
  'audit:social-activity-snapshots',
  'audit:social-activity-feed',
  'audit:social-cloud-contract',
  'audit:social-cloud-identity',
  'audit:social-cloud-lookup',
  'audit:social-cloud-friend-requests',
  'audit:social-cloud-friendships',
  'audit:social-cloud-activity-snapshots',
  'audit:social-complete-acceptance',
  'audit:social-release-finalization',
  'audit:social-release',
]) {
  if (!packageText.includes(command)) fail(`${command} est absent du pipeline package.json.`);
}

const releaseNotes = read('RELEASE-NOTES-0.29.0.md');
for (const expected of [
  'identité canonique',
  'recherche exacte',
  'demandes entrantes et sortantes',
  'Amitiés complètes',
  'Aucun',
  'Résumé',
  'Personnalisé',
  'fiche détaillée',
  'Résilience',
  'Sécurité et confidentialité',
  'aucune activité brute',
  'AppDatabase locale : Dexie v10',
  'Sauvegarde JSON : v9',
  'Runtime Dexie Cloud prototype : v14',
  'v0.29.0',
]) {
  if (!releaseNotes.includes(expected)) {
    fail(`RELEASE-NOTES-0.29.0.md ne couvre pas : ${expected}.`);
  }
}

const releaseReadiness = read('src/app/releaseReadiness.test.ts');
const currentVersionExpectation = `expect(__APP_VERSION__).toBe('${packageJson.version}')`;
if (!releaseReadiness.includes(currentVersionExpectation)) {
  fail(`releaseReadiness ne valide pas la version applicative ${packageJson.version}.`);
}
if (!existsSync(join(root, 'src/app/socialReleaseFinalizationReadiness.test.ts'))) {
  fail('socialReleaseFinalizationReadiness.test.ts est absent.');
}

const contract = read('src/domain/friends/socialCloudContract.ts');
for (const token of [
  'SOCIAL_CLOUD_CONTRACT_VERSION',
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
  'rawActivityExport',
  'globalUserDirectory',
  'publicSuggestions',
]) {
  if (!contract.includes(token)) fail(`contrat cloud social incomplet : ${token}.`);
}
if (contract.includes('socialRawActivities')) {
  fail('Le contrat cloud social ne doit pas définir de collection socialRawActivities.');
}

const runtime = read('src/infrastructure/sync-prototype/SyncPrototypeDatabase.ts');
for (const token of [
  'SYNC_PROTOTYPE_DATABASE_VERSION = 18',
  'socialIdentities',
  'socialHandleReservations',
  'socialFriendRequests',
  'socialFriendships',
  'socialFriendPermissions',
  'socialActivitySnapshots',
]) {
  if (!runtime.includes(token)) fail(`runtime Dexie Cloud incomplet : ${token}.`);
}
if (runtime.includes('socialRawActivities')) {
  fail('Le runtime Dexie Cloud ne doit pas créer de table socialRawActivities.');
}

const friendsPrivacyPage = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
for (const expected of [
  'SocialActivityFriendSharingSettings',
  'SocialActivityFeedPanel',
  'shouldUseCloudActivityFeed',
  "section === 'feed'",
  'activeActivityFeedCloudGateway',
  'defaultOpen',
]) {
  if (!friendsPrivacyPage.includes(expected)) {
    fail(`FriendsPrivacyPage ne contient pas le garde-fou attendu : ${expected}.`);
  }
}

const cloudSnapshotDomain = read('src/domain/friends/socialCloudActivitySnapshot.ts');
for (const forbidden of [
  'privateNotes',
  'internalScore',
  'rawActivity:',
  'rawPayload',
  'socialRawActivities',
]) {
  if (cloudSnapshotDomain.includes(forbidden)) {
    fail(`Le domaine cloud snapshot expose un champ brut interdit : ${forbidden}.`);
  }
}
if (!cloudSnapshotDomain.includes('rawActivityShared: false')) {
  fail('Le domaine cloud snapshot ne fige pas explicitement rawActivityShared à false.');
}
if (
  !cloudSnapshotDomain.includes('ownerUserId')
  || !cloudSnapshotDomain.includes('publishedForUserId')
) {
  fail('Le domaine cloud snapshot doit distinguer ownerUserId et publishedForUserId.');
}

for (const migration of [
  'migrations/0001_social_activity_snapshots_0_29_0.sql',
  'migrations/0002_social_friend_permission_fields_0_29_0.sql',
]) {
  if (!existsSync(join(root, migration))) fail(`la migration ${migration} est absente.`);
}

if (failures.length > 0) {
  console.error(`\nAudit release sociale ${SOCIAL_RELEASE_VERSION} échoué :`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Audit release sociale ${SOCIAL_RELEASE_VERSION} réussi : identité, amitiés, permissions par ami, `
    + 'fil filtré, détail sécurisé, résilience et garde-fous sont prêts pour publication.',
  );
}
