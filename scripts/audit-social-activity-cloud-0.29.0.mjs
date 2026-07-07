import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8').replace(/^\uFEFF/u, '');
const assert = (condition, message) => {
  if (!condition) throw new Error(`Audit social activity cloud 0.29.0 A6 échoué : ${message}`);
};

const requiredFiles = [
  'functions/_shared/socialActivitySnapshotValidation.js',
  'functions/_shared/socialActivitySnapshots.js',
  'functions/_shared/socialActivitySnapshots.test.mjs',
  'functions/api/social-activity-snapshots/sync.js',
  'functions/api/social-activity-snapshots/detail.js',
  'functions/api/social-activity-feed/index.js',
  'migrations/0001_social_activity_snapshots_0_29_0.sql',
  'src/application/friends/socialActivitySnapshotDeliveryService.ts',
  'src/application/friends/socialActivitySnapshotDeliveryService.test.ts',
  'src/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway.ts',
  'src/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway.test.ts',
  'src/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotCloudDelivery.ts',
  'src/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotCloudDelivery.test.ts',
  'src/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotOutbox.ts',
  'src/infrastructure/social-activity-snapshots/socialActivitySnapshotOutboxEvents.ts',
  'src/app/socialActivitySnapshotCloudReadiness.test.ts',
  'docs/architecture/social-activity-feed-0.29.0-a6.md',
];

for (const file of requiredFiles) {
  assert(existsSync(join(root, file)), `${file} est manquant.`);
}

const server = read('functions/_shared/socialActivitySnapshots.js');
for (const token of [
  'DEXIE_CLOUD_DATABASE_URL',
  'SOCIAL_DIRECTORY_DB',
  'authenticateRequest',
  'SOCIAL_ACTIVITY_OWNER_MISMATCH',
  'SOCIAL_ACTIVITY_NOT_FRIENDS',
  'SOCIAL_ACTIVITY_SCOPE_EXCEEDED',
  'validateSocialActivitySnapshotPayload',
  "s.visibility = 'summary'",
  "p.sharing_level = 'detailed'",
  "p.detailed_consent = 'granted'",
  'mutation_sequence',
  'nextCursor',
]) {
  assert(server.includes(token), `contrôle serveur manquant : ${token}`);
}
assert(!server.includes('rawActivity'), 'le serveur ne doit pas accepter une activité brute.');
assert(!server.includes('sourceActivity:'), 'le serveur ne doit pas reconstruire une activité métier brute.');

const validation = read('functions/_shared/socialActivitySnapshotValidation.js');
for (const token of [
  'ACTIVE_TOP_LEVEL_KEYS',
  'COMMON_FIELDS',
  'CARDIO_FIELDS',
  'STRENGTH_FIELDS',
  'SUMMARY_FIELD_BY_KEY',
  'validateSocialActivitySnapshotPayload',
]) {
  assert(validation.includes(token), `validation stricte manquante : ${token}`);
}

const migration = read('migrations/0001_social_activity_snapshots_0_29_0.sql');
for (const token of [
  'CREATE TABLE IF NOT EXISTS social_activity_snapshots',
  'snapshot_id TEXT PRIMARY KEY',
  'recipient_user_id TEXT NOT NULL',
  'mutation_sequence INTEGER NOT NULL',
  'idx_social_activity_snapshot_source_recipient',
  'idx_social_activity_snapshot_feed',
]) {
  assert(migration.includes(token), `migration D1 incomplète : ${token}`);
}

const gateway = read('src/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway.ts');
for (const token of [
  '/api/social-activity-snapshots',
  'authorization: `Bearer ${credentials.accessToken}`',
  'social_activity_owner_mismatch',
  'SocialActivitySnapshotCloudError',
]) {
  assert(gateway.includes(token), `gateway cloud incomplet : ${token}`);
}
assert(!gateway.includes('ownerUserId:'), 'le gateway ne doit pas fournir une identité serveur indépendante du snapshot filtré.');

const coordinator = read('src/app/sync/AutomaticSyncCoordinator.tsx');
assert(coordinator.includes('attachRuntimeSocialActivitySnapshotCloudDelivery'), 'le coordinateur automatique ne branche pas A6.');

const wrangler = JSON.parse(read('wrangler.jsonc'));
assert(wrangler.d1_databases?.some((entry) => entry.binding === 'SOCIAL_DIRECTORY_DB'), 'binding D1 SOCIAL_DIRECTORY_DB absent.');
assert(wrangler.compatibility_flags?.includes('nodejs_compat'), 'nodejs_compat doit rester actif.');

console.log('Audit social activity cloud 0.29.0 A6 OK');
