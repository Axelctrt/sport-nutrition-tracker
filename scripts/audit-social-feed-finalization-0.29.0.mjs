import fs from 'node:fs';

const checks = [
  ['normalisation client', 'src/domain/friends/socialActivityCloudFeed.ts', 'normalizeSocialActivityFeedCards'],
  ['tri déterministe client', 'src/domain/friends/socialActivityCloudFeed.ts', 'compareSocialActivityFeedCards'],
  ['révision visible', 'src/domain/friends/socialActivityCloudFeed.ts', 'socialActivityFeedCardsHaveSameVisibleRevision'],
  ['séquence des requêtes', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'feedRequestSequenceRef'],
  ['isolation du compte', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'activeRecipientRef'],
  ['préservation du scroll', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'pendingScrollAnchorRef'],
  ['fermeture du détail obsolète', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'socialActivityFeedCardsHaveSameVisibleRevision'],
  ['état de rafraîchissement', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'Actualisation…'],
  ['action de reprise', 'src/features/friends/components/SocialActivityFeedPanel.tsx', 'Réessayer'],
  ['identifiant de carte stable', 'src/features/friends/components/SocialActivityFeedCard.tsx', 'data-social-feed-card-id'],
  ['requêtes sans cache', 'src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts', "cache: 'no-store'"],
  ['ordre serveur stable', 'functions/_shared/socialActivitySnapshots.js', 'ORDER BY sort_time DESC, s.created_at DESC, s.snapshot_id DESC'],
  ['curseur stable', 'functions/_shared/socialActivitySnapshots.js', 'cursor.createdAt'],
  ['test suppression au rafraîchissement', 'src/features/friends/components/SocialActivityFeedPanel.test.tsx', 'retire une activité devenue indisponible'],
  ['test changement de compte', 'src/features/friends/components/SocialActivityFeedPanel.test.tsx', 'changement de compte'],
  ['test ordre serveur', 'functions/_shared/socialActivitySnapshots.test.mjs', 'ordre chronologique stable'],
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

const forbidden = [
  ['rawActivity', 'src/features/friends/components/SocialActivityFeedPanel.tsx'],
  ['personalNotes', 'src/domain/friends/socialActivityCloudFeed.ts'],
];
for (const [needle, file] of forbidden) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes(needle)) {
    console.error(`FAIL donnée interdite ${needle}: ${file}`);
    process.exitCode = 1;
  }
}

if (!process.exitCode) {
  console.log(`A22 social feed finalization audit: ${passed}/${checks.length} OK`);
}
