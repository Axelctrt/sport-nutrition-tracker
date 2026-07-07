import { describe, expect, it } from 'vitest';

import {
  handleSocialActivityFeedRequest,
  handleSocialActivitySnapshotDetailRequest,
  handleSocialActivitySnapshotReadinessRequest,
  handleSocialActivitySnapshotSyncRequest,
  socialActivitySnapshotsInternals,
} from './socialActivitySnapshots.js';

function base64Url(value) {
  return Buffer.from(JSON.stringify(value))
    .toString('base64url');
}

function tokenFor(subject) {
  return `${base64Url({ alg: 'none', typ: 'JWT' })}.${base64Url({ sub: subject })}.signature`;
}

function activeSnapshot(overrides = {}) {
  const ownerUserId = overrides.ownerUserId ?? 'user-owner@example.com';
  const recipientUserId = overrides.recipientUserId ?? 'user-friend@example.com';
  const sourceKind = overrides.sourceKind ?? 'activity';
  const sourceActivityId = overrides.sourceActivityId ?? 'activity-1';
  const visibility = overrides.visibility ?? 'summary';
  const allowedFields = overrides.allowedFields ?? {
    common: visibility === 'summary'
      ? ['activityType', 'title', 'date', 'duration']
      : ['activityType', 'title', 'date', 'time', 'duration'],
    cardio: visibility === 'summary' ? ['distance'] : ['distance', 'terrain'],
    strength: [],
  };
  return {
    contractVersion: '0.29.0-a3',
    snapshotId: [
      'social-activity-snapshot-v2',
      encodeURIComponent(ownerUserId),
      sourceKind,
      encodeURIComponent(sourceActivityId),
      encodeURIComponent(recipientUserId),
    ].join(':'),
    ownerUserId,
    recipientUserId,
    sourceKind,
    sourceActivityId,
    sourceRevision: overrides.sourceRevision ?? 'revision-1',
    createdAt: overrides.createdAt ?? '2026-07-07T10:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-07-07T10:00:00.000Z',
    state: 'active',
    visibility,
    family: overrides.family ?? 'cardio',
    activityType: overrides.activityType ?? 'running',
    title: 'Course du matin',
    occurredOn: overrides.occurredOn ?? '2026-07-07',
    ...(visibility === 'summary'
      ? {}
      : { occurredAt: overrides.occurredAt ?? '2026-07-07T08:00:00.000Z' }),
    allowedFields,
    summary: { durationMinutes: 42, distanceKm: 8 },
    ...(visibility === 'summary' ? {} : { detail: { family: 'cardio', terrainType: 'road' } }),
    ...overrides,
  };
}

function deletedSnapshot(snapshot, overrides = {}) {
  return {
    contractVersion: snapshot.contractVersion,
    snapshotId: snapshot.snapshotId,
    ownerUserId: snapshot.ownerUserId,
    recipientUserId: snapshot.recipientUserId,
    sourceKind: snapshot.sourceKind,
    sourceActivityId: snapshot.sourceActivityId,
    sourceRevision: overrides.sourceRevision ?? 'deleted:revision-2',
    createdAt: snapshot.createdAt,
    updatedAt: overrides.deletedAt ?? '2026-07-07T11:00:00.000Z',
    state: 'deleted',
    deletedAt: overrides.deletedAt ?? '2026-07-07T11:00:00.000Z',
    deletionReason: overrides.deletionReason ?? 'sourceDeleted',
  };
}

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql.replace(/\s+/gu, ' ').trim();
    this.bindings = [];
  }

  bind(...bindings) {
    this.bindings = bindings;
    return this;
  }

  async run() {
    if (/^CREATE /u.test(this.sql)) return { success: true };
    if (this.sql.startsWith('INSERT INTO social_activity_snapshots')) {
      const [
        snapshotId,
        ownerUserId,
        recipientUserId,
        sourceKind,
        sourceActivityId,
        sourceRevision,
        contractVersion,
        state,
        visibility,
        family,
        activityType,
        occurredOn,
        occurredAt,
        createdAt,
        updatedAt,
        deletedAt,
        deletionReason,
        mutationSequence,
        snapshotJson,
      ] = this.bindings;
      const current = this.database.snapshots.get(snapshotId);
      if (!current || mutationSequence > current.mutation_sequence) {
        this.database.snapshots.set(snapshotId, {
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
          sort_time: occurredAt ?? `${occurredOn}T00:00:00.000`,
          owner_handle: this.database.profiles.get(ownerUserId)?.handle ?? null,
          owner_display_name: this.database.profiles.get(ownerUserId)?.displayName ?? null,
        });
      }
      return { success: true };
    }
    throw new Error(`SQL run non simulé: ${this.sql}`);
  }

  async first() {
    if (this.sql.includes('SELECT s.snapshot_json')) {
      const [snapshotId, recipient] = this.bindings;
      const row = this.database.snapshots.get(snapshotId);
      if (!row || row.recipient_user_id !== recipient || row.state !== 'active') return null;
      if (!this.database.friendships.has(this.database.pair(row.owner_user_id, recipient))) return null;
      const permission = this.database.permissions.get(`${row.owner_user_id}->${recipient}`);
      if (!permission) return null;
      if (
        row.visibility !== 'summary'
        && (permission.sharing_level !== 'detailed' || permission.detailed_consent !== 'granted')
      ) return null;
      return { snapshot_json: row.snapshot_json };
    }
    if (this.sql.includes('FROM social_friendships')) {
      const [owner, recipient] = this.bindings;
      return this.database.friendships.has(this.database.pair(owner, recipient)) ? { id: 'friendship-1' } : null;
    }
    if (this.sql.includes('FROM social_friend_permissions')) {
      const [owner, recipient] = this.bindings;
      return this.database.permissions.get(`${owner}->${recipient}`) ?? null;
    }
    if (this.sql.includes('FROM social_activity_snapshots') && this.sql.includes('owner_user_id, mutation_sequence')) {
      const row = this.database.snapshots.get(this.bindings[0]);
      return row
        ? {
            snapshot_id: row.snapshot_id,
            owner_user_id: row.owner_user_id,
            mutation_sequence: row.mutation_sequence,
            snapshot_json: row.snapshot_json,
          }
        : null;
    }
    throw new Error(`SQL first non simulé: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes('FROM sqlite_master')) {
      return {
        results: [...this.database.schemaObjects.entries()].map(([name, type]) => ({ name, type })),
      };
    }
    if (this.sql.includes('FROM social_activity_snapshots s')) {
      const recipient = this.bindings[0];
      const limit = this.bindings.at(-1);
      let rows = [...this.database.snapshots.values()]
        .filter((row) => row.recipient_user_id === recipient && row.state === 'active')
        .filter((row) => this.database.friendships.has(this.database.pair(row.owner_user_id, recipient)))
        .filter((row) => {
          const permission = this.database.permissions.get(`${row.owner_user_id}->${recipient}`);
          return Boolean(permission && (
            row.visibility === 'summary'
            || (permission.sharing_level === 'detailed' && permission.detailed_consent === 'granted')
          ));
        })
        .sort((left, right) => (
          right.sort_time.localeCompare(left.sort_time)
          || right.updated_at.localeCompare(left.updated_at)
          || right.snapshot_id.localeCompare(left.snapshot_id)
        ));

      if (this.bindings.length === 5) {
        const [, sortTime, updatedAt, snapshotId] = this.bindings;
        rows = rows.filter((row) => (
          row.sort_time < sortTime
          || (row.sort_time === sortTime && row.updated_at < updatedAt)
          || (row.sort_time === sortTime && row.updated_at === updatedAt && row.snapshot_id < snapshotId)
        ));
      }
      return { results: rows.slice(0, limit) };
    }
    throw new Error(`SQL all non simulé: ${this.sql}`);
  }
}

class FakeD1Database {
  constructor() {
    this.snapshots = new Map();
    this.friendships = new Set();
    this.permissions = new Map();
    this.profiles = new Map();
    this.schemaObjects = new Map([
      ['social_directory_handles', 'table'],
      ['social_friendships', 'table'],
      ['social_friend_permissions', 'table'],
      ['social_activity_snapshots', 'table'],
      ['idx_social_activity_snapshot_source_recipient', 'index'],
      ['idx_social_activity_snapshot_feed', 'index'],
      ['idx_social_activity_snapshot_owner', 'index'],
    ]);
  }

  pair(left, right) {
    return [left, right].sort().join('<->');
  }

  addFriendship(left, right) {
    this.friendships.add(this.pair(left, right));
  }

  addProfile(userId, handle, displayName) {
    this.profiles.set(userId, { handle, displayName });
  }

  addPermission(owner, friend, sharingLevel = 'detailed', detailedConsent = 'granted') {
    this.permissions.set(`${owner}->${friend}`, {
      sharing_level: sharingLevel,
      detailed_consent: detailedConsent,
    });
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

function env(database) {
  return {
    SOCIAL_DIRECTORY_DB: database,
    DEXIE_CLOUD_DATABASE_URL: 'https://sportpilot-test.dexie.cloud',
  };
}

function request(path, options = {}) {
  return new Request(`https://sportpilot.pages.dev${path}`, options);
}

function authorizedHeaders(subject, extra = {}) {
  return {
    authorization: `Bearer ${tokenFor(subject)}`,
    ...extra,
  };
}

const validAuthFetch = async () => new Response(null, { status: 404 });

async function responseJson(response) {
  return response.json();
}

describe('social activity snapshots Pages Functions', () => {
  it('vérifie l’activation D1 sans créer le schéma automatiquement', async () => {
    const database = new FakeD1Database();
    const response = await handleSocialActivitySnapshotReadinessRequest(
      request('/api/social-activity-snapshots/readiness', {
        headers: authorizedHeaders('user-owner@example.com'),
      }),
      env(database),
      { fetcher: validAuthFetch },
    );

    expect(response.status).toBe(200);
    expect(await responseJson(response)).toMatchObject({
      status: 'ready',
      contractVersion: '0.29.0-a3',
      authVerified: true,
      databaseBound: true,
      requiredMigration: '0001_social_activity_snapshots_0_29_0.sql',
      missingPrerequisites: [],
      missingActivitySchema: [],
    });
  });

  it('distingue une migration manquante d’un prérequis social absent', async () => {
    const migrationMissing = new FakeD1Database();
    migrationMissing.schemaObjects.delete('social_activity_snapshots');
    migrationMissing.schemaObjects.delete('idx_social_activity_snapshot_feed');
    await expect(socialActivitySnapshotsInternals.inspectSocialActivitySchema(migrationMissing)).resolves.toMatchObject({
      status: 'migrationRequired',
      missingPrerequisites: [],
      missingActivitySchema: expect.arrayContaining([
        'social_activity_snapshots',
        'idx_social_activity_snapshot_feed',
      ]),
    });

    const prerequisiteMissing = new FakeD1Database();
    prerequisiteMissing.schemaObjects.delete('social_friendships');
    await expect(socialActivitySnapshotsInternals.inspectSocialActivitySchema(prerequisiteMissing)).resolves.toMatchObject({
      status: 'prerequisiteMissing',
      missingPrerequisites: ['social_friendships'],
    });
  });
  it('refuse toute lecture ou écriture avant la migration versionnée', async () => {
    const database = new FakeD1Database();
    database.schemaObjects.delete('social_activity_snapshots');
    database.schemaObjects.delete('idx_social_activity_snapshot_feed');
    const snapshot = activeSnapshot();
    database.addFriendship(snapshot.ownerUserId, snapshot.recipientUserId);
    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'summary', 'notRequested');

    const response = await handleSocialActivitySnapshotSyncRequest(
      request('/api/social-activity-snapshots/sync', {
        method: 'POST',
        headers: authorizedHeaders(snapshot.ownerUserId, { 'content-type': 'application/json' }),
        body: JSON.stringify({ mutationSequence: 1, snapshot }),
      }),
      env(database),
      { fetcher: validAuthFetch },
    );

    expect(response.status).toBe(503);
    expect(await responseJson(response)).toMatchObject({ code: 'SOCIAL_ACTIVITY_MIGRATION_REQUIRED' });
    expect(database.snapshots.size).toBe(0);
  });

  it('refuse une publication sans jeton Dexie Cloud', async () => {
    const response = await handleSocialActivitySnapshotSyncRequest(
      request('/api/social-activity-snapshots/sync', { method: 'POST', body: '{}' }),
      env(new FakeD1Database()),
      { fetcher: validAuthFetch },
    );
    expect(response.status).toBe(401);
    expect(await responseJson(response)).toMatchObject({ code: 'SOCIAL_ACTIVITY_AUTH_REQUIRED' });
  });

  it('refuse un jeton rejeté par Dexie Cloud', async () => {
    const response = await handleSocialActivitySnapshotSyncRequest(
      request('/api/social-activity-snapshots/sync', {
        method: 'POST',
        headers: authorizedHeaders('user-owner@example.com', { 'content-type': 'application/json' }),
        body: JSON.stringify({ mutationSequence: 1, snapshot: activeSnapshot() }),
      }),
      env(new FakeD1Database()),
      { fetcher: async () => new Response(null, { status: 401 }) },
    );
    expect(response.status).toBe(401);
    expect(await responseJson(response)).toMatchObject({ code: 'SOCIAL_ACTIVITY_AUTH_INVALID' });
  });

  it('refuse un propriétaire différent du sujet authentifié', async () => {
    const database = new FakeD1Database();
    database.addFriendship('user-owner@example.com', 'user-friend@example.com');
    database.addPermission('user-owner@example.com', 'user-friend@example.com');
    const response = await handleSocialActivitySnapshotSyncRequest(
      request('/api/social-activity-snapshots/sync', {
        method: 'POST',
        headers: authorizedHeaders('attacker@example.com', { 'content-type': 'application/json' }),
        body: JSON.stringify({ mutationSequence: 1, snapshot: activeSnapshot() }),
      }),
      env(database),
      { fetcher: validAuthFetch },
    );
    expect(response.status).toBe(403);
    expect(await responseJson(response)).toMatchObject({ code: 'SOCIAL_ACTIVITY_OWNER_MISMATCH' });
  });

  it('impose une amitié active et une permission compatible au snapshot actif', async () => {
    const database = new FakeD1Database();
    const snapshot = activeSnapshot({ visibility: 'detailed' });
    let result = await socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      snapshot.ownerUserId,
      { mutationSequence: 1, snapshot },
    ).catch((error) => error);
    expect(result).toMatchObject({ code: 'SOCIAL_ACTIVITY_NOT_FRIENDS' });

    database.addFriendship(snapshot.ownerUserId, snapshot.recipientUserId);
    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'summary', 'notRequested');
    result = await socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      snapshot.ownerUserId,
      { mutationSequence: 1, snapshot },
    ).catch((error) => error);
    expect(result).toMatchObject({ code: 'SOCIAL_ACTIVITY_SCOPE_EXCEEDED' });
  });

  it('gère create, idempotence, stale et conflit de séquence', async () => {
    const database = new FakeD1Database();
    const snapshot = activeSnapshot();
    database.addFriendship(snapshot.ownerUserId, snapshot.recipientUserId);
    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'summary', 'notRequested');

    await expect(socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      snapshot.ownerUserId,
      { mutationSequence: 1, snapshot },
    )).resolves.toMatchObject({ status: 201, payload: { status: 'created' } });

    await expect(socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      snapshot.ownerUserId,
      { mutationSequence: 1, snapshot },
    )).resolves.toMatchObject({ status: 200, payload: { status: 'alreadyExists' } });

    await expect(socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      snapshot.ownerUserId,
      { mutationSequence: 0, snapshot },
    )).rejects.toMatchObject({ code: 'SOCIAL_ACTIVITY_INVALID_SEQUENCE' });

    await expect(socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      snapshot.ownerUserId,
      { mutationSequence: 1, snapshot: { ...snapshot, sourceRevision: 'other' } },
    )).rejects.toMatchObject({ code: 'SOCIAL_ACTIVITY_SEQUENCE_CONFLICT' });
  });

  it('autorise un tombstone signé par le propriétaire après révocation de l’amitié', async () => {
    const database = new FakeD1Database();
    const snapshot = activeSnapshot();
    database.addFriendship(snapshot.ownerUserId, snapshot.recipientUserId);
    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'summary', 'notRequested');
    await socialActivitySnapshotsInternals.persistSnapshotMutation(database, snapshot.ownerUserId, {
      mutationSequence: 1,
      snapshot,
    });
    database.friendships.clear();
    database.permissions.clear();

    await expect(socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      snapshot.ownerUserId,
      { mutationSequence: 2, snapshot: deletedSnapshot(snapshot) },
    )).resolves.toMatchObject({ status: 200, payload: { status: 'updated' } });
  });

  it('rejette récursivement les notes personnelles', () => {
    expect(() => socialActivitySnapshotsInternals.normalizeSnapshot(activeSnapshot({
      detail: { family: 'cardio', nested: { notes: 'privé' } },
    }))).toThrowError(/Champ privé interdit/u);
  });

  it('retire le détail des cartes du fil et conserve le détail sur la route dédiée', async () => {
    const database = new FakeD1Database();
    const snapshot = activeSnapshot({ visibility: 'detailed' });
    database.addFriendship(snapshot.ownerUserId, snapshot.recipientUserId);
    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'detailed', 'granted');
    database.addProfile(snapshot.ownerUserId, 'alex.run', 'Alex Run');
    await socialActivitySnapshotsInternals.persistSnapshotMutation(database, snapshot.ownerUserId, {
      mutationSequence: 1,
      snapshot,
    });

    const feedResponse = await handleSocialActivityFeedRequest(
      request('/api/social-activity-feed', { headers: authorizedHeaders(snapshot.recipientUserId) }),
      env(database),
      { fetcher: validAuthFetch },
    );
    expect(feedResponse.status).toBe(200);
    const feed = await responseJson(feedResponse);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0]).not.toHaveProperty('detail');
    expect(feed.items[0]).toMatchObject({
      detailAvailable: true,
      snapshotId: snapshot.snapshotId,
      ownerProfile: {
        userId: snapshot.ownerUserId,
        handle: 'alex.run',
        displayName: 'Alex Run',
      },
    });

    const detailResponse = await handleSocialActivitySnapshotDetailRequest(
      request(`/api/social-activity-snapshots/detail?snapshotId=${encodeURIComponent(snapshot.snapshotId)}`, {
        headers: authorizedHeaders(snapshot.recipientUserId),
      }),
      env(database),
      { fetcher: validAuthFetch },
    );
    expect(detailResponse.status).toBe(200);
    expect(await responseJson(detailResponse)).toMatchObject({ snapshot: { detail: { family: 'cardio' } } });
  });

  it('révoque immédiatement la lecture dès que l’amitié disparaît', async () => {
    const database = new FakeD1Database();
    const snapshot = activeSnapshot();
    database.addFriendship(snapshot.ownerUserId, snapshot.recipientUserId);
    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'summary', 'notRequested');
    await socialActivitySnapshotsInternals.persistSnapshotMutation(database, snapshot.ownerUserId, {
      mutationSequence: 1,
      snapshot,
    });
    database.friendships.clear();

    const response = await handleSocialActivitySnapshotDetailRequest(
      request(`/api/social-activity-snapshots/detail?snapshotId=${encodeURIComponent(snapshot.snapshotId)}`, {
        headers: authorizedHeaders(snapshot.recipientUserId),
      }),
      env(database),
      { fetcher: validAuthFetch },
    );
    expect(response.status).toBe(404);
  });

  it('révoque le détail dès que la permission est abaissée au résumé', async () => {
    const database = new FakeD1Database();
    const snapshot = activeSnapshot({ visibility: 'detailed' });
    database.addFriendship(snapshot.ownerUserId, snapshot.recipientUserId);
    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'detailed', 'granted');
    await socialActivitySnapshotsInternals.persistSnapshotMutation(database, snapshot.ownerUserId, {
      mutationSequence: 1,
      snapshot,
    });

    database.addPermission(snapshot.ownerUserId, snapshot.recipientUserId, 'summary', 'notRequested');
    const feed = await socialActivitySnapshotsInternals.listFeed(
      database,
      snapshot.recipientUserId,
      new URL('https://sportpilot.pages.dev/api/social-activity-feed'),
    );
    expect(feed.items).toHaveLength(0);

    await expect(socialActivitySnapshotsInternals.readSnapshotDetail(
      database,
      snapshot.recipientUserId,
      snapshot.snapshotId,
    )).rejects.toMatchObject({ code: 'SOCIAL_ACTIVITY_NOT_FOUND' });
  });

  it('rejette les champs inconnus et les métriques absentes des permissions du snapshot', () => {
    expect(() => socialActivitySnapshotsInternals.normalizeSnapshot(activeSnapshot({
      allowedFields: {
        common: ['activityType', 'title', 'date', 'time', 'duration', 'unknown'],
        cardio: ['distance'],
        strength: [],
      },
    }))).toThrowError(/Champ de partage inconnu/u);

    expect(() => socialActivitySnapshotsInternals.normalizeSnapshot(activeSnapshot({
      allowedFields: {
        common: ['activityType', 'title', 'date', 'time', 'duration', 'calories'],
        cardio: ['distance'],
        strength: [],
      },
      summary: { durationMinutes: 42, distanceKm: 8, caloriesKcal: 500 },
    }))).toThrowError(/trop détaillé/u);
  });

  it('acquitte sans écrire un tombstone sans snapshot serveur existant', async () => {
    const database = new FakeD1Database();
    const active = activeSnapshot();
    const deleted = deletedSnapshot(active);
    await expect(socialActivitySnapshotsInternals.persistSnapshotMutation(
      database,
      deleted.ownerUserId,
      { mutationSequence: 1, snapshot: deleted },
    )).resolves.toMatchObject({
      status: 200,
      payload: { status: 'alreadyExists', mutationSequence: 1 },
    });
    expect(database.snapshots.size).toBe(0);
  });

  it('ne divulgue pas les erreurs serveur inattendues', async () => {
    const database = {
      prepare() {
        throw new Error('secret sql detail');
      },
    };
    const response = await handleSocialActivityFeedRequest(
      request('/api/social-activity-feed', {
        headers: authorizedHeaders('user-friend@example.com'),
      }),
      env(database),
      { fetcher: validAuthFetch },
    );
    expect(response.status).toBe(503);
    const payload = await responseJson(response);
    expect(payload).toMatchObject({
      code: 'SOCIAL_ACTIVITY_SERVER_ERROR',
      message: 'Service social indisponible.',
    });
    expect(JSON.stringify(payload)).not.toContain('secret sql detail');
  });

  it('pagine le fil avec un curseur déterministe', async () => {
    const database = new FakeD1Database();
    const owner = 'user-owner@example.com';
    const recipient = 'user-friend@example.com';
    database.addFriendship(owner, recipient);
    database.addPermission(owner, recipient, 'summary', 'notRequested');
    for (let index = 1; index <= 3; index += 1) {
      const snapshot = activeSnapshot({
        sourceActivityId: `activity-${index}`,
        occurredOn: `2026-07-0${index}`,
      });
      await socialActivitySnapshotsInternals.persistSnapshotMutation(database, owner, {
        mutationSequence: 1,
        snapshot,
      });
    }

    const first = await socialActivitySnapshotsInternals.listFeed(
      database,
      recipient,
      new URL('https://sportpilot.pages.dev/api/social-activity-feed?limit=2'),
    );
    expect(first.items).toHaveLength(2);
    expect(first.nextCursor).toBeTruthy();

    const second = await socialActivitySnapshotsInternals.listFeed(
      database,
      recipient,
      new URL(`https://sportpilot.pages.dev/api/social-activity-feed?limit=2&cursor=${encodeURIComponent(first.nextCursor)}`),
    );
    expect(second.items).toHaveLength(1);
    expect(second.items[0].sourceActivityId).toBe('activity-1');
  });
});
