import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const requiredFiles = [
  'src/domain/friends/socialActivitySnapshot.ts',
  'src/domain/friends/socialActivitySnapshot.test.ts',
  'src/application/friends/socialActivitySnapshotService.ts',
  'src/application/friends/socialActivitySnapshotService.test.ts',
  'src/app/socialActivitySnapshotsReadiness.test.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'docs/architecture/social-activity-snapshots-0.27.0-f4.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`fichier manquant : ${file}`);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const domain = read('src/domain/friends/socialActivitySnapshot.ts');
const service = read('src/application/friends/socialActivitySnapshotService.ts');
const friendship = read('src/domain/friends/friendship.ts');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const readiness = read('src/app/socialActivitySnapshotsReadiness.test.ts');
const docs = read('docs/architecture/social-activity-snapshots-0.27.0-f4.md');
const packageJson = read('package.json');

for (const symbol of [
  'SocialActivitySnapshot',
  'SocialActivitySummarySnapshot',
  'SocialActivityDetailedSnapshot',
  'createSocialActivitySnapshotForFriend',
  'createSocialActivitySnapshotsForFriends',
  'downgradedToSummary',
]) {
  if (!domain.includes(symbol)) failures.push(`contrat snapshot social manquant : ${symbol}`);
}

for (const symbol of [
  'prepareSocialActivitySnapshots',
  'rawActivityShared: false',
  'summaryCount',
  'detailedCount',
]) {
  if (!service.includes(symbol)) failures.push(`service snapshots sociaux incomplet : ${symbol}`);
}

for (const phrase of [
  'Snapshots sociaux F4 actifs',
  'Fil d’activité amis F5 actif',
  'Aucun export brut d’activité',
  'ni likes, ni commentaires, ni discussions privées',
]) {
  if (!page.includes(phrase)) failures.push(`texte F4 manquant dans la page amis : ${phrase}`);
}

for (const forbidden of [
  'notes:',
  'time:',
  'rpe:',
  'manualCaloriesKcal:',
  'calculation:',
  'averageCadenceSpm:',
  'intervalDetails:',
]) {
  if (domain.includes(forbidden)) failures.push(`champ brut exposé dans le snapshot : ${forbidden}`);
}

for (const forbidden of ['fetch(', 'axios', 'supabase', 'firebase']) {
  if (domain.includes(forbidden) || service.includes(forbidden)) {
    failures.push(`F4 ne doit pas inventer de backend concret : ${forbidden}`);
  }
}

if (!friendship.includes('Snapshots sociaux filtrés disponibles')) {
  failures.push('garde-fou F4 non mis à jour pour les snapshots filtrés');
}

if (!readiness.includes('not.toContain') || !readiness.includes('rawActivityShared')) {
  failures.push('tests readiness F4 incomplets sur anti-fuite et absence d’export brut');
}

if (!docs.includes('Aucun export brut') || !docs.includes('pas un fil d’activité')) {
  failures.push('documentation F4 incomplète sur limites et anti-fuite');
}

if (!packageJson.includes('audit:social-activity-snapshots')) {
  failures.push('script audit:social-activity-snapshots absent de package.json');
}

if (/socialFeed|messagerie|classement/u.test(domain + service + page)) {
  failures.push('F4 ne doit pas introduire de fil concret, messagerie ou classement');
}

if (failures.length > 0) {
  console.error('Audit snapshots sociaux d’activité 0.27.0 F4 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit snapshots sociaux d’activité 0.27.0 F4 réussi : snapshots résumé/détail filtrés, anti-fuite, sans backend, sans fil social et sans export brut.');
