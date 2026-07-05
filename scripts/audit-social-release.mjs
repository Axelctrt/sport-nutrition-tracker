import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));

if (packageJson.version !== '0.28.0') {
  fail(`package.json doit publier 0.28.0, version reçue ${String(packageJson.version)}.`);
}
if (packageLock.version !== packageJson.version || packageLock.packages?.['']?.version !== packageJson.version) {
  fail('package-lock.json ne correspond pas à package.json pour 0.28.0.');
}

const requiredDocs = [
  'README.md',
  'README-PATCH.md',
  'INSTALLATION.txt',
  'RELEASE-CHECKLIST.md',
  'RELEASE-NOTES-0.28.0.md',
  'ROLLBACK.md',
  'KNOWN-LIMITATIONS.md',
  'docs/architecture/social-cloud-release-0.28.0-f7.md',
  'docs/architecture/social-cloud-contract-0.28.0-f1.md',
  'docs/architecture/social-cloud-identity-0.28.0-f2.md',
  'docs/architecture/social-cloud-lookup-0.28.0-f3.md',
  'docs/architecture/social-cloud-friend-requests-0.28.0-f4.md',
  'docs/architecture/social-cloud-friendships-0.28.0-f5.md',
  'docs/architecture/social-cloud-activity-snapshots-0.28.0-f6.md',
];
for (const path of requiredDocs) {
  if (!existsSync(join(root, path))) {
    fail(`${path} est absent.`);
    continue;
  }
  const content = read(path);
  if (!content.includes('0.28.0')) fail(`${path} ne référence pas 0.28.0.`);
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
  'audit:social-release',
]) {
  if (!packageText.includes(command)) fail(`${command} est absent du pipeline package.json.`);
}

const releaseNotes = read('RELEASE-NOTES-0.28.0.md');
for (const expected of [
  'identités cloud',
  'réservation unique des handles',
  'recherche exacte',
  'demandes d’amis cloud',
  'amitiés cloud',
  'permissions synchronisées',
  'snapshots sociaux distants filtrés',
  'Aucun export d’activité brute',
  'AppDatabase locale : Dexie v10',
  'Sauvegarde JSON : v9',
  'Runtime Dexie Cloud prototype : v14',
  'v0.28.0',
]) {
  if (!releaseNotes.includes(expected)) fail(`RELEASE-NOTES-0.28.0.md ne couvre pas : ${expected}.`);
}

const releaseReadiness = read('src/app/releaseReadiness.test.ts');
if (!releaseReadiness.includes("expect(__APP_VERSION__).toBe('0.28.0')")) {
  fail('releaseReadiness ne valide pas la version 0.28.0.');
}
if (!existsSync(join(root, 'src/app/socialCloudReleaseReadiness.test.ts'))) {
  fail('socialCloudReleaseReadiness.test.ts est absent.');
}

const contract = read('src/domain/friends/socialCloudContract.ts');
for (const token of [
  'SOCIAL_CLOUD_CONTRACT_VERSION',
  '0.28.0-f1',
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
  'SYNC_PROTOTYPE_DATABASE_VERSION = 14',
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
  'Cloud social 0.28.0 F6',
  'Snapshots sociaux distants F6 prêts',
  'publication cloud de snapshots filtrés',
  'lecture des snapshots autorisés',
  'aucune activité brute',
  'aucun export brut',
  'aucun annuaire, aucune suggestion',
]) {
  if (!friendsPrivacyPage.includes(expected)) fail(`FriendsPrivacyPage ne contient pas le garde-fou attendu : ${expected}.`);
}

const cloudSnapshotDomain = read('src/domain/friends/socialCloudActivitySnapshot.ts');
for (const forbidden of ['privateNotes', 'internalScore', 'rawActivity:', 'rawPayload', 'socialRawActivities']) {
  if (cloudSnapshotDomain.includes(forbidden)) {
    fail(`Le domaine cloud snapshot expose un champ brut interdit : ${forbidden}.`);
  }
}
if (!cloudSnapshotDomain.includes('rawActivityShared: false')) {
  fail('Le domaine cloud snapshot ne fige pas explicitement rawActivityShared à false.');
}
if (!cloudSnapshotDomain.includes('ownerUserId') || !cloudSnapshotDomain.includes('publishedForUserId')) {
  fail('Le domaine cloud snapshot doit distinguer ownerUserId et publishedForUserId.');
}

if (failures.length > 0) {
  console.error('\nAudit release sociale 0.28.0 échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Audit release sociale 0.28.0 réussi : cloud social F1-F6, documentation, version, snapshots filtrés et garde-fous sont prêts pour publication.');
}
