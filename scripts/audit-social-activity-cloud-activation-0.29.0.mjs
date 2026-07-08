import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireText(source, text, label) {
  if (!source.includes(text)) {
    throw new Error(`Audit A11 incomplet : ${label}`);
  }
}

const shared = read('functions/_shared/socialActivitySnapshots.js');
const route = read('functions/api/social-activity-snapshots/readiness.js');
const migration = read('migrations/0001_social_activity_snapshots_0_29_0.sql');
const gateway = read('src/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway.ts');
const panel = read('src/features/friends/components/SocialActivityCloudReadinessPanel.tsx');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');

requireText(route, 'handleSocialActivitySnapshotReadinessRequest', 'route readiness');
requireText(shared, 'FROM sqlite_master', 'inspection non mutative de D1');
requireText(shared, "'migrationRequired'", 'état migrationRequired');
requireText(shared, "'prerequisiteMissing'", 'état prerequisiteMissing');
requireText(shared, 'authenticateRequest', 'authentification Dexie Cloud');
requireText(shared, 'SOCIAL_ACTIVITY_MIGRATION_REQUIRED', 'blocage avant migration');
if (shared.includes('async function ensureSchema')) {
  throw new Error('Audit A11 incomplet : DDL runtime encore présent');
}
requireText(migration, 'CREATE TABLE IF NOT EXISTS social_activity_snapshots', 'table idempotente');
requireText(migration, 'idx_social_activity_snapshot_feed', 'index du fil');
requireText(gateway, '/api/social-activity-snapshots/readiness', 'gateway readiness');
requireText(panel, 'Cloud social prêt', 'état UI prêt');
requireText(panel, 'Migration D1 requise', 'état UI migration');
requireText(page, 'SocialActivityCloudReadinessPanel', 'branchement dans la page Amis');

console.log('Audit social activity cloud activation 0.29.0 A11 : OK');
