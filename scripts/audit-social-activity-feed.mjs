import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const requiredFiles = [
  'src/domain/friends/socialActivityFeed.ts',
  'src/domain/friends/socialActivityFeed.test.ts',
  'src/application/friends/socialActivityFeedService.ts',
  'src/application/friends/socialActivityFeedService.test.ts',
  'src/app/socialActivityFeedReadiness.test.ts',
  'src/features/friends/pages/FriendsPrivacyPage.tsx',
  'docs/architecture/social-activity-feed-0.27.0-f5.md',
];

for (const file of requiredFiles) {
  if (!existsSync(file)) failures.push(`fichier manquant : ${file}`);
}

function read(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}

const domain = read('src/domain/friends/socialActivityFeed.ts');
const service = read('src/application/friends/socialActivityFeedService.ts');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const readiness = read('src/app/socialActivityFeedReadiness.test.ts');
const docs = read('docs/architecture/social-activity-feed-0.27.0-f5.md');
const packageJson = read('package.json');

for (const symbol of [
  'SocialActivityFeedItem',
  'SocialActivityFeedState',
  'buildSocialActivityFeed',
  'permissionLimited',
  'rawActivityShared: false',
]) {
  if (!domain.includes(symbol)) failures.push(`contrat feed social manquant : ${symbol}`);
}

for (const symbol of [
  'prepareSocialActivityFeed',
  "source: 'filtered-snapshots'",
]) {
  if (!service.includes(symbol)) failures.push(`service feed social incomplet : ${symbol}`);
}

for (const phrase of [
  'Fil d’activité amis F5 actif',
  'Fil d’activité amis',
  'Snapshots filtrés uniquement',
  'Aucun champ brut d’activité n’est affiché',
  'Détail limité par permission actuelle',
]) {
  if (!page.includes(phrase)) failures.push(`texte F5 manquant dans la page amis : ${phrase}`);
}

for (const forbidden of [
  'sourceActivityId,',
  'notes:',
  'time:',
  'rpe:',
  'manualCaloriesKcal:',
  'calculation:',
  'averageCadenceSpm:',
  'intervalDetails:',
]) {
  if (domain.includes(forbidden)) failures.push(`champ brut transporté dans le feed : ${forbidden}`);
}

for (const forbidden of ['fetch(', 'axios', 'supabase', 'firebase']) {
  if (domain.includes(forbidden) || service.includes(forbidden) || page.includes(forbidden)) {
    failures.push(`F5 ne doit pas inventer de backend concret : ${forbidden}`);
  }
}

for (const forbidden of ['like', 'commentaire', 'messagerie', 'classement', 'groupe']) {
  if (domain.includes(forbidden)) failures.push(`interaction sociale hors périmètre dans le domaine feed : ${forbidden}`);
}

if (!readiness.includes('filtered-snapshots') || !readiness.includes('permissionLimited')) {
  failures.push('readiness F5 incomplet sur snapshots filtrés et dégradation permission');
}

if (!docs.includes('Pas de likes') || !docs.includes('Dexie reste en v10')) {
  failures.push('documentation F5 incomplète sur limites et absence de migration');
}

if (!packageJson.includes('audit:social-activity-feed')) {
  failures.push('script audit:social-activity-feed absent de package.json');
}

if (!packageJson.includes('npm run audit:social-activity-feed')) {
  failures.push('audit:social-activity-feed absent du check/ci');
}

if (failures.length > 0) {
  console.error('Audit fil d’activité amis 0.27.0 F5 échoué :');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Audit fil d’activité amis 0.27.0 F5 réussi : feed minimal basé sur snapshots filtrés, sans activité brute, sans backend et sans interactions sociales.');
