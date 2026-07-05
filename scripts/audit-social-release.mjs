import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = (path) => readFileSync(join(root, path), 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const packageJson = JSON.parse(read('package.json'));
const packageLock = JSON.parse(read('package-lock.json'));

if (packageJson.version !== '0.27.0') {
  fail(`package.json doit publier 0.27.0, version reçue ${String(packageJson.version)}.`);
}
if (packageLock.version !== packageJson.version || packageLock.packages?.['']?.version !== packageJson.version) {
  fail('package-lock.json ne correspond pas à package.json pour 0.27.0.');
}

const requiredDocs = [
  'README.md',
  'README-PATCH.md',
  'INSTALLATION.txt',
  'RELEASE-CHECKLIST.md',
  'RELEASE-NOTES-0.27.0.md',
  'ROLLBACK.md',
  'KNOWN-LIMITATIONS.md',
  'docs/architecture/social-release-0.27.0-f6.md',
];
for (const path of requiredDocs) {
  if (!existsSync(join(root, path))) {
    fail(`${path} est absent.`);
    continue;
  }
  const content = read(path);
  if (!content.includes('0.27.0')) fail(`${path} ne référence pas 0.27.0.`);
}

const packageText = read('package.json');
for (const command of [
  'audit:friends-privacy',
  'audit:social-identity',
  'audit:social-friend-requests',
  'audit:social-friend-permissions',
  'audit:social-activity-snapshots',
  'audit:social-activity-feed',
  'audit:social-release',
]) {
  if (!packageText.includes(command)) fail(`${command} est absent du pipeline package.json.`);
}

const releaseNotes = read('RELEASE-NOTES-0.27.0.md');
for (const expected of [
  'identité sociale',
  'demandes d’amis',
  'permissions de partage par ami',
  'snapshots sociaux',
  'fil d’activité amis',
  'Aucun export d’activité brute',
  'Base Dexie : v10',
  'Sauvegarde JSON : v9',
]) {
  if (!releaseNotes.includes(expected)) fail(`RELEASE-NOTES-0.27.0.md ne couvre pas : ${expected}.`);
}

const friendsPrivacyPage = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
for (const expected of [
  'Fil d’activité amis F5 actif',
  'Snapshots sociaux F4 actifs',
  'Aucun export brut d’activité',
]) {
  if (!friendsPrivacyPage.includes(expected)) fail(`FriendsPrivacyPage ne contient pas le garde-fou attendu : ${expected}.`);
}

const snapshotDomain = read('src/domain/friends/socialActivitySnapshot.ts');
const feedDomain = read('src/domain/friends/socialActivityFeed.ts');
for (const forbidden of ['privateNotes', 'internalScore', 'rawActivity', 'rawPayload']) {
  if (snapshotDomain.includes(`${forbidden}:`) || feedDomain.includes(`${forbidden}:`)) {
    fail(`Le domaine social expose un champ brut interdit : ${forbidden}.`);
  }
}
if (!feedDomain.includes('rawActivityShared: false')) {
  fail('Le feed social ne fige pas explicitement rawActivityShared à false.');
}
if (!snapshotDomain.includes('scope:') || !snapshotDomain.includes('summary') || !snapshotDomain.includes('detailed')) {
  fail('Le domaine snapshot ne distingue pas résumé et détail filtré.');
}

const releaseReadiness = read('src/app/releaseReadiness.test.ts');
if (!releaseReadiness.includes("expect(__APP_VERSION__).toBe('0.27.0')")) {
  fail('releaseReadiness ne valide pas la version 0.27.0.');
}

if (failures.length > 0) {
  console.error('\nAudit release sociale 0.27.0 échoué :');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Audit release sociale 0.27.0 réussi : identité, demandes, permissions, snapshots, feed filtré, documentation et garde-fous sont prêts pour publication.');
}
