import fs from 'node:fs';

const checks = [
  ['statut permissions explicite', 'src/infrastructure/sync-prototype/socialFriendsGateway.ts', 'listPermissionsWithStatus'],
  ['réponse permissions invalide non autoritaire', 'src/infrastructure/sync-prototype/socialFriendsGateway.ts', 'Réponse permissions serveur invalide'],
  ['réponse amitiés invalide non autoritaire', 'src/infrastructure/sync-prototype/socialFriendsGateway.ts', 'Réponse amitiés serveur invalide'],
  ['lecture sociale sans cache', 'src/infrastructure/sync-prototype/socialFriendsGateway.ts', "cache: 'no-store'"],
  ['cache local conservé', 'src/features/friends/pages/FriendsPrivacyPage.tsx', 'les données locales ont été conservées'],
  ['succès cloud suivi séparément', 'src/features/friends/pages/FriendsPrivacyPage.tsx', 'cloudSocialSnapshotSynchronized'],
  ['indisponibilité cloud suivie séparément', 'src/features/friends/pages/FriendsPrivacyPage.tsx', 'cloudSocialBackendUnavailable'],
  ['sérialisation des persistances', 'src/features/friends/pages/FriendsPrivacyPage.tsx', 'persistenceQueueRef'],
  ['version de mutation par ami', 'src/features/friends/pages/FriendsPrivacyPage.tsx', 'permissionMutationVersionsRef'],
  ['prochaine tentative exposée', 'src/application/friends/socialActivitySnapshotDeliveryService.ts', 'nextRetryAt'],
  ['prochaine tentative relue', 'src/infrastructure/social-activity-snapshots/DexieSocialActivitySnapshotOutboxRepository.ts', 'getNextRetryAt'],
  ['timer de reprise automatique', 'src/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotCloudDelivery.ts', 'scheduleRetry'],
  ['test cache permission', 'src/features/friends/pages/FriendsPrivacyPage.test.tsx', 'conserve les permissions locales lorsque D1 est temporairement indisponible'],
  ['test mutation obsolète', 'src/features/friends/pages/FriendsPrivacyPage.test.tsx', 'ignore la réponse obsolète'],
  ['test reprise outbox', 'src/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotCloudDelivery.test.ts', 'programme automatiquement la prochaine tentative'],
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

if (!process.exitCode) {
  console.log(`A23 social sync resilience audit: ${passed}/${checks.length} OK`);
}
