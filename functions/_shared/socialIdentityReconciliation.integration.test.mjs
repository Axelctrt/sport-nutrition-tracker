import { describe, expect, it } from 'vitest';

import { handleSocialIdentityReconciliationRequest } from './socialIdentityReconciliation.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/gu, ' ').trim().toLowerCase();
}

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = normalizeSql(sql);
    this.args = [];
  }

  bind(...args) {
    this.args = args;
    return this;
  }

  all() {
    return this.database.all(this.sql, this.args);
  }

  first() {
    return this.database.first(this.sql, this.args);
  }

  run() {
    return this.database.run(this.sql, this.args);
  }
}

class FakeD1Database {
  constructor() {
    this.directory = new Map([
      ['test', {
        handle: 'test',
        owner_user_id: 'sp-old',
        owner_display_name: 'TEST',
        reserved_at: '2026-07-01T10:00:00.000Z',
        updated_at: '2026-07-07T10:00:00.000Z',
      }],
      ['friend', {
        handle: 'friend',
        owner_user_id: 'friend-user',
        owner_display_name: 'Friend',
        reserved_at: '2026-07-01T10:00:00.000Z',
        updated_at: '2026-07-07T10:00:00.000Z',
      }],
    ]);
    this.friendships = new Map([
      ['cloud-friendship:friend-user<->social-user:browser', {
        id: 'cloud-friendship:friend-user<->social-user:browser',
        user_a_id: 'friend-user',
        user_b_id: 'social-user:browser',
        status: 'active',
        created_at: '2026-07-08T10:00:00.000Z',
        updated_at: '2026-07-08T10:00:00.000Z',
      }],
    ]);
    this.permissions = new Map([
      ['cloud-friend-permission:sp-old->friend-user', {
        id: 'cloud-friend-permission:sp-old->friend-user',
        owner_user_id: 'sp-old',
        friend_user_id: 'friend-user',
        friend_handle: 'friend',
        sharing_level: 'detailed',
        detailed_consent: 'granted',
        detailed_consent_granted_at: '2026-07-08T10:00:00.000Z',
        field_selection_json: JSON.stringify({
          common: ['activityType', 'title', 'date', 'duration'],
          cardio: ['distance'],
          strength: [],
        }),
        created_at: '2026-07-08T10:00:00.000Z',
        updated_at: '2026-07-08T10:00:00.000Z',
      }],
    ]);
    this.requests = new Map([
      ['friend-request:social-user:browser->friend-user', {
        id: 'friend-request:social-user:browser->friend-user',
        requester_user_id: 'social-user:browser',
        recipient_user_id: 'friend-user',
        status: 'accepted',
        requested_at: '2026-07-08T09:00:00.000Z',
        responded_at: '2026-07-08T10:00:00.000Z',
        created_at: '2026-07-08T09:00:00.000Z',
        updated_at: '2026-07-08T10:00:00.000Z',
      }],
    ]);
    const snapshot = {
      contractVersion: '0.29.0-a3',
      snapshotId: 'old-snapshot',
      ownerUserId: 'social-user:browser',
      recipientUserId: 'friend-user',
    };
    this.snapshots = new Map([
      ['old-snapshot', {
        snapshot_id: 'old-snapshot',
        owner_user_id: 'social-user:browser',
        recipient_user_id: 'friend-user',
        source_kind: 'activity',
        source_activity_id: 'activity-1',
        source_revision: 'rev-1',
        contract_version: '0.29.0-a3',
        state: 'active',
        visibility: 'summary',
        family: 'cardio',
        activity_type: 'running',
        occurred_on: '2026-07-08',
        occurred_at: '2026-07-08T10:00:00.000Z',
        created_at: '2026-07-08T10:00:00.000Z',
        updated_at: '2026-07-08T10:00:00.000Z',
        deleted_at: null,
        deletion_reason: null,
        mutation_sequence: 1,
        snapshot_json: JSON.stringify(snapshot),
      }],
    ]);
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }

  async all(sql, args) {
    if (sql.includes('from sqlite_master')) {
      return {
        results: [
          'social_directory_handles',
          'social_friend_requests',
          'social_friendships',
          'social_friend_permissions',
          'social_activity_snapshots',
        ].map((name) => ({ name })),
      };
    }
    if (sql.includes('from social_friendships')) {
      return { results: [...this.friendships.values()].filter((row) => row.user_a_id === args[0] || row.user_b_id === args[0]) };
    }
    if (sql.includes('from social_friend_permissions')) {
      return { results: [...this.permissions.values()].filter((row) => row.owner_user_id === args[0] || row.friend_user_id === args[0]) };
    }
    if (sql.includes('from social_friend_requests')) {
      return { results: [...this.requests.values()].filter((row) => row.requester_user_id === args[0] || row.recipient_user_id === args[0]) };
    }
    if (sql.includes('from social_activity_snapshots')) {
      return { results: [...this.snapshots.values()].filter((row) => row.owner_user_id === args[0] || row.recipient_user_id === args[0]) };
    }
    throw new Error(`Unsupported all SQL: ${sql}`);
  }

  async first(sql, args) {
    if (sql.includes('from social_directory_handles') && sql.includes('where handle = ?1')) {
      return this.directory.get(args[0]);
    }
    if (sql.includes('from social_directory_handles') && sql.includes('where owner_user_id = ?1')) {
      return [...this.directory.values()]
        .filter((row) => row.owner_user_id === args[0])
        .sort((left, right) => right.updated_at.localeCompare(left.updated_at))[0];
    }
    throw new Error(`Unsupported first SQL: ${sql}`);
  }

  async run(sql, args) {
    if (sql.startsWith('delete from social_friendships')) {
      this.friendships.delete(args[0]);
      return {};
    }
    if (sql.startsWith('insert into social_friendships')) {
      const [id, userAId, userBId, status, createdAt, updatedAt] = args;
      const existing = this.friendships.get(id);
      this.friendships.set(id, {
        id,
        user_a_id: userAId,
        user_b_id: userBId,
        status: existing?.status === 'active' || status === 'active' ? 'active' : status,
        created_at: existing ? [existing.created_at, createdAt].sort()[0] : createdAt,
        updated_at: existing ? [existing.updated_at, updatedAt].sort().at(-1) : updatedAt,
      });
      return {};
    }
    if (sql.startsWith('delete from social_friend_permissions')) {
      this.permissions.delete(args[0]);
      return {};
    }
    if (sql.startsWith('insert into social_friend_permissions')) {
      const [
        id,
        ownerUserId,
        friendUserId,
        friendHandle,
        sharingLevel,
        detailedConsent,
        consentAt,
        fieldSelectionJson,
        createdAt,
        updatedAt,
      ] = args;
      const existing = [...this.permissions.values()].find((row) => row.owner_user_id === ownerUserId && row.friend_user_id === friendUserId);
      if (existing) this.permissions.delete(existing.id);
      this.permissions.set(id, {
        id,
        owner_user_id: ownerUserId,
        friend_user_id: friendUserId,
        friend_handle: friendHandle,
        sharing_level: sharingLevel,
        detailed_consent: detailedConsent,
        detailed_consent_granted_at: consentAt,
        field_selection_json: fieldSelectionJson,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return {};
    }
    if (sql.startsWith('delete from social_friend_requests')) {
      this.requests.delete(args[0]);
      return {};
    }
    if (sql.startsWith('insert into social_friend_requests')) {
      const [id, requesterUserId, recipientUserId, status, requestedAt, respondedAt, createdAt, updatedAt] = args;
      const existing = [...this.requests.values()].find((row) => row.requester_user_id === requesterUserId && row.recipient_user_id === recipientUserId);
      if (existing) this.requests.delete(existing.id);
      this.requests.set(id, {
        id,
        requester_user_id: requesterUserId,
        recipient_user_id: recipientUserId,
        status,
        requested_at: requestedAt,
        responded_at: respondedAt,
        created_at: createdAt,
        updated_at: updatedAt,
      });
      return {};
    }
    if (sql.startsWith('delete from social_activity_snapshots')) {
      this.snapshots.delete(args[0]);
      return {};
    }
    if (sql.startsWith('insert into social_activity_snapshots')) {
      const [snapshotId, ownerUserId, recipientUserId, sourceKind, sourceActivityId, sourceRevision, contractVersion, state, visibility, family, activityType, occurredOn, occurredAt, createdAt, updatedAt, deletedAt, deletionReason, mutationSequence, snapshotJson] = args;
      this.snapshots.set(snapshotId, {
        snapshot_id: snapshotId,
        owner_user_id: ownerUserId,
        recipient_user_id: recipientUserId,
        source_kind: sourceKind,
        source_activity_id: sourceActivityId,
        source_revision: sourceRevision,
        contract_version: contractVersion,
        state,
        visibility,
        family,
        activity_type: activityType,
        occurred_on: occurredOn,
        occurred_at: occurredAt,
        created_at: createdAt,
        updated_at: updatedAt,
        deleted_at: deletedAt,
        deletion_reason: deletionReason,
        mutation_sequence: mutationSequence,
        snapshot_json: snapshotJson,
      });
      return {};
    }
    if (sql.startsWith('delete from social_directory_handles')) {
      const [ownerUserId, handle] = args;
      for (const [key, row] of this.directory) {
        if (row.owner_user_id === ownerUserId && row.handle !== handle) this.directory.delete(key);
      }
      return {};
    }
    if (sql.startsWith('insert into social_directory_handles')) {
      const [handle, ownerUserId, displayName, reservedAt, updatedAt] = args;
      this.directory.set(handle, {
        handle,
        owner_user_id: ownerUserId,
        owner_display_name: displayName,
        reserved_at: reservedAt,
        updated_at: updatedAt,
      });
      return {};
    }
    throw new Error(`Unsupported run SQL: ${sql}`);
  }
}

function tokenForSubject(subject) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'none' })}.${encode({ sub: subject })}.signature`;
}

describe('social identity reconciliation endpoint', () => {
  it('migre le graphe social vers le sujet Dexie Cloud authentifié', async () => {
    const database = new FakeD1Database();
    const subject = 'dexie-user-123';
    const token = tokenForSubject(subject);
    const fetcher = async (url) => {
      const target = String(url);
      if (target.includes('/my/realActivities/')) return new Response(null, { status: 404 });
      if (target.includes('/my/socialHandleReservations/')) {
        return new Response(JSON.stringify({
          id: 'social-handle:test',
          handle: 'test',
          ownerUserId: 'sp-old',
          ownerDisplayName: 'TEST',
        }), { status: 200 });
      }
      if (target.includes('/my/socialIdentities/')) {
        return new Response(JSON.stringify({
          userId: 'social-user:browser',
          handle: 'test',
          displayName: 'TEST',
        }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      throw new Error(`Unexpected fetch: ${target}`);
    };
    const request = new Request('https://example.test/api/social-identity/reconcile', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        previousUserId: 'social-user:browser',
        handle: 'test',
        displayName: 'TEST',
        createdAt: '2026-07-01T10:00:00.000Z',
        updatedAt: '2026-07-08T10:00:00.000Z',
      }),
    });

    const response = await handleSocialIdentityReconciliationRequest(request, {
      SOCIAL_DIRECTORY_DB: database,
      DEXIE_CLOUD_DATABASE_URL: 'https://example.dexie.cloud',
    }, { fetcher });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.identity).toEqual(expect.objectContaining({
      userId: subject,
      handle: 'test',
      displayName: 'TEST',
    }));
    expect(payload.migratedUserIds.sort()).toEqual(['social-user:browser', 'sp-old']);
    expect(database.directory.get('test').owner_user_id).toBe(subject);
    expect([...database.friendships.values()][0]).toEqual(expect.objectContaining({
      user_a_id: subject,
      user_b_id: 'friend-user',
      status: 'active',
    }));
    expect([...database.permissions.values()][0]).toEqual(expect.objectContaining({
      owner_user_id: subject,
      friend_user_id: 'friend-user',
    }));
    expect([...database.requests.values()][0]).toEqual(expect.objectContaining({
      requester_user_id: subject,
      recipient_user_id: 'friend-user',
    }));
    const migratedSnapshot = [...database.snapshots.values()][0];
    expect(migratedSnapshot.owner_user_id).toBe(subject);
    expect(JSON.parse(migratedSnapshot.snapshot_json).ownerUserId).toBe(subject);
  });
});
