import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/u, '');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit social activity details 0.29.0 A8 échoué : ${message}`);
};

const requiredFiles = [
  'src/features/friends/components/SocialActivityFeedCard.tsx',
  'src/features/friends/components/SocialActivityDetailDialog.tsx',
  'src/features/friends/components/SocialActivitySummaryMetrics.tsx',
  'src/features/friends/components/SocialCardioActivityDetail.tsx',
  'src/features/friends/components/SocialStrengthActivityDetail.tsx',
  'src/features/friends/components/SocialActivityDetailChart.tsx',
  'src/features/friends/components/socialActivityFeedPresentation.ts',
  'src/features/friends/components/socialActivityFeedPresentation.test.ts',
  'src/app/socialActivityDetailsReadiness.test.ts',
  'docs/architecture/social-activity-feed-0.29.0-a8.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const panel = read('src/features/friends/components/SocialActivityFeedPanel.tsx');
const card = read('src/features/friends/components/SocialActivityFeedCard.tsx');
const dialog = read('src/features/friends/components/SocialActivityDetailDialog.tsx');
const cardio = read('src/features/friends/components/SocialCardioActivityDetail.tsx');
const strength = read('src/features/friends/components/SocialStrengthActivityDetail.tsx');
const chart = read('src/features/friends/components/SocialActivityDetailChart.tsx');
const presentation = read('src/features/friends/components/socialActivityFeedPresentation.ts');

for (const token of [
  'SocialActivityFeedCard',
  'SocialActivityDetailDialog',
  'Afficher plus d’activités',
]) {
  assert(panel.includes(token), `orchestration du fil incomplète : ${token}`);
}

for (const token of [
  'min-h-11 w-full',
  'SocialActivitySummaryMetrics',
  'Résumé partagé',
]) {
  assert(card.includes(token), `carte mobile incomplète : ${token}`);
}

for (const token of [
  'sticky top-0',
  'max-h-[92dvh]',
  'closeButtonRef.current?.focus()',
  'previouslyFocusedElementRef.current?.focus()',
]) {
  assert(dialog.includes(token), `dialogue accessible incomplet : ${token}`);
}

assert(chart.includes('ResponsiveContainer'), 'le graphique Recharts réel est absent.');
assert(chart.includes("touchAction: 'pan-y'"), 'le graphique ne préserve pas le défilement tactile vertical.');
assert(cardio.includes('presentSocialActivityChart'), 'le détail cardio ne branche pas les séries autorisées.');
assert(!cardio.includes('sera finalisée'), 'un message de graphique simulé subsiste.');
assert(strength.includes('strengthTrackingModeLabel'), 'le mode de suivi musculation n’est pas présenté.');
assert(presentation.includes('Poids du corps ×'), 'le poids du corps n’est pas présenté explicitement.');
assert(presentation.includes('if (detail.chart?.points.length)'), 'le contrôle des points graphiques persistés est absent.');
assert(!panel.includes('{card.sourceActivityId}'), 'un identifiant source est exposé dans le fil.');
assert(!dialog.includes('{snapshot.ownerUserId}'), 'un identifiant propriétaire est exposé dans le détail.');

console.log('Audit social activity details 0.29.0 A8 OK');
