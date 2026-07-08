import fs from 'node:fs';

const checks = [
  ['authentification activité', 'functions/_shared/socialActivitySnapshots.js', 'async function authenticateRequest'],
  ['authentification annuaire', 'functions/_shared/socialDirectory.js', 'authenticateRequest'],
  ['authentification demandes', 'functions/_shared/socialFriendRequests.js', 'authenticateRequest'],
  ['authentification amitiés', 'functions/_shared/socialFriends.js', 'authenticateRequest'],
  ['liaison acteur annuaire', 'functions/_shared/socialDirectory.js', 'SOCIAL_DIRECTORY_ACTOR_MISMATCH'],
  ['liaison acteur demandes', 'functions/_shared/socialFriendRequests.js', 'SOCIAL_FRIEND_REQUESTS_ACTOR_MISMATCH'],
  ['rôles demande ami', 'functions/_shared/socialFriendRequests.js', 'SOCIAL_FRIEND_REQUESTS_ACTION_FORBIDDEN'],
  ['liaison acteur permissions', 'functions/_shared/socialFriends.js', 'SOCIAL_FRIENDS_ACTOR_MISMATCH'],
  ['identifiant permission canonique', 'functions/_shared/socialFriends.js', 'SOCIAL_FRIENDS_PERMISSION_ID_MISMATCH'],
  ['identifiant amitié canonique', 'functions/_shared/socialFriends.js', 'SOCIAL_FRIENDS_FRIENDSHIP_ID_MISMATCH'],
  ['preuve privée identité legacy', 'functions/_shared/socialIdentityReconciliation.js', 'privateIdentity.userId === previousUserId'],
  ['limite corps annuaire', 'functions/_shared/socialDirectory.js', 'MAX_JSON_BYTES'],
  ['limite corps demandes', 'functions/_shared/socialFriendRequests.js', 'MAX_JSON_BYTES'],
  ['limite corps amitiés', 'functions/_shared/socialFriends.js', 'MAX_JSON_BYTES'],
  ['en-tête nosniff', 'functions/_shared/socialActivitySnapshots.js', "'x-content-type-options': 'nosniff'"],
  ['erreurs serveur génériques', 'functions/_shared/socialFriends.js', "message: 'Permissions sociales serveur indisponibles.'"],
  ['credentials runtime', 'src/infrastructure/sync-prototype/socialCloudApiCredentials.ts', 'resolveSocialCloudApiCredentials'],
  ['bearer annuaire client', 'src/infrastructure/sync-prototype/socialDirectoryGateway.ts', 'socialCloudApiHeaders(credentials'],
  ['bearer demandes client', 'src/infrastructure/sync-prototype/socialFriendRequestsGateway.ts', 'socialCloudApiHeaders(credentials'],
  ['bearer amitiés client', 'src/infrastructure/sync-prototype/socialFriendsGateway.ts', 'socialCloudApiHeaders(credentials'],
  ['tests attaques A24', 'functions/_shared/socialSecurityHardening.a24.test.mjs', 'social security hardening A24'],
  ['readiness A24', 'src/app/socialSecurityHardeningReadiness.test.ts', 'social security hardening readiness 0.29.0 A24'],
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
  console.log(`A24 social security hardening audit: ${passed}/${checks.length} OK`);
}
