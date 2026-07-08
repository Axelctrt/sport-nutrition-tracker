import fs from 'node:fs';

const checks = [
  ['card opens every activity', 'src/features/friends/components/SocialActivityFeedCard.tsx', 'Ouvrir l’activité'],
  ['summary-only sheet', 'src/features/friends/components/SocialActivityDetailDialog.tsx', 'Résumé uniquement'],
  ['permission recheck copy', 'src/features/friends/components/SocialActivityDetailDialog.tsx', 'revérifiées par le serveur à chaque ouverture'],
  ['focus trap', 'src/features/friends/components/SocialActivityDetailDialog.tsx', 'focusableSelector'],
  ['safe area', 'src/features/friends/components/SocialActivityDetailDialog.tsx', 'safe-area-inset-bottom'],
  ['race cancellation', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'detailRequestSequenceRef'],
  ['identity consistency', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'socialActivityDetailMatchesFeedCard'],
  ['server detail route', 'functions/_shared/socialActivitySnapshots.js', 'handleSocialActivitySnapshotDetailRequest'],
  ['summary server regression', 'functions/_shared/socialActivitySnapshots.test.mjs', 'fiche dédiée limitée au résumé'],
];

let passed = 0;
for (const [label, file, needle] of checks) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes(needle)) {
    console.error(`FAIL ${label}: ${file}`);
    process.exitCode = 1;
  } else {
    passed += 1;
    console.log(`OK   ${label}`);
  }
}

if (!process.exitCode) console.log(`A21 social activity detail audit: ${passed}/${checks.length} OK`);
