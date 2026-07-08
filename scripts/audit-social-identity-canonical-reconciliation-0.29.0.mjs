import { readFileSync } from 'node:fs';

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function requireText(source, text, label) {
  if (!source.includes(text)) {
    throw new Error(`Audit A14 incomplet : ${label}`);
  }
}

const server = read('functions/_shared/socialIdentityReconciliation.js');
const route = read('functions/api/social-identity/reconcile.js');
const page = read('src/features/friends/pages/FriendsPrivacyPage.tsx');
const observer = read('src/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotObserver.ts');
const gateway = read('src/infrastructure/sync-prototype/socialIdentityReconciliationGateway.ts');
const service = read('src/application/friends/socialIdentityReconciliationService.ts');

requireText(route, 'handleSocialIdentityReconciliationRequest', 'route Pages Function');
requireText(server, 'authenticateRequest', 'authentification Dexie Cloud');
requireText(server, 'socialHandleReservations', 'preuve privée du handle');
requireText(server, 'socialIdentities', 'preuve privée de l’identité');
requireText(server, 'migrateFriendships', 'migration des amitiés');
requireText(server, 'migratePermissions', 'migration des permissions');
requireText(server, 'migrateRequests', 'migration des demandes');
requireText(server, 'migrateSnapshots', 'migration des snapshots');
requireText(gateway, 'authorization: `Bearer ${credentials.accessToken}`', 'jeton côté client');
requireText(service, 'result.identity.userId !== credentials.userId', 'contrôle du sujet canonique');
requireText(page, 'activeIdentityReconciliation(loadedIdentity)', 'réconciliation avant lecture des amis');
requireText(observer, 'reconcileRuntimeSocialIdentity', 'réconciliation avant outbox');
if (server.includes('CREATE TABLE')) {
  throw new Error('Audit A14 incomplet : DDL runtime interdit');
}

console.log('Audit social identity canonical reconciliation 0.29.0 A14 : OK');
