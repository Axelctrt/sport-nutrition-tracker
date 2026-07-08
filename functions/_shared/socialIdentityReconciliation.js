import { socialActivitySnapshotsInternals } from './socialActivitySnapshots.js';

class SocialIdentityReconciliationError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SocialIdentityReconciliationError';
    this.status = status;
    this.code = code;
  }
}

const REQUIRED_TABLES = Object.freeze([
  'social_directory_handles',
  'social_friend_requests',
  'social_friendships',
  'social_friend_permissions',
  'social_activity_snapshots',
]);

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
    },
  });
}

function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
    },
  });
}

function assertMethod(request) {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') {
    throw new SocialIdentityReconciliationError(
      405,
      'SOCIAL_IDENTITY_RECONCILIATION_METHOD_NOT_ALLOWED',
      'Méthode non autorisée.',
    );
  }
  return undefined;
}

function readDatabase(env = {}) {
  const database = env.SOCIAL_DIRECTORY_DB;
  if (!database || typeof database.prepare !== 'function') {
    throw new SocialIdentityReconciliationError(
      503,
      'SOCIAL_IDENTITY_RECONCILIATION_DATABASE_NOT_CONFIGURED',
      'Stockage social serveur non configuré.',
    );
  }
  return database;
}

function sanitizeUserId(value, fieldName = 'userId') {
  const userId = typeof value === 'string' ? value.trim() : '';
  if (userId.length < 3 || userId.length > 160) {
    throw new SocialIdentityReconciliationError(
      400,
      'SOCIAL_IDENTITY_RECONCILIATION_INVALID_USER',
      `Compte SportPilot invalide pour ${fieldName}.`,
    );
  }
  return userId;
}

function normalizeHandle(value) {
  const raw = typeof value === 'string' ? value.trim().replace(/^@/u, '') : '';
  if (raw !== raw.toLowerCase() || !/^[a-z0-9._-]{3,24}$/u.test(raw)) {
    throw new SocialIdentityReconciliationError(
      400,
      'SOCIAL_IDENTITY_RECONCILIATION_INVALID_HANDLE',
      'Identifiant social invalide.',
    );
  }
  return raw;
}

function sanitizeDisplayName(value) {
  const displayName = typeof value === 'string'
    ? value.trim().replace(/\s+/gu, ' ')
    : '';
  return (displayName || 'SportPilot').slice(0, 80);
}

function sanitizeIsoDateTime(value, fallback) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    ? value
    : fallback;
}

function socialIdentityRecordId(userId) {
  return `social-identity:${userId.replace(/[^a-z0-9._:-]/gu, '').toLowerCase()}`;
}

function socialHandleReservationId(handle) {
  return `social-handle:${handle}`;
}

function canonicalFriendshipId(userAId, userBId) {
  const [first, second] = userAId < userBId
    ? [userAId, userBId]
    : [userBId, userAId];
  return `cloud-friendship:${first}<->${second}`;
}

function canonicalPermissionId(ownerUserId, friendUserId) {
  return `cloud-friend-permission:${ownerUserId}->${friendUserId}`;
}

function canonicalRequestId(requesterUserId, recipientUserId) {
  return `friend-request:${requesterUserId}->${recipientUserId}`;
}

function canonicalSnapshotId(ownerUserId, sourceKind, sourceActivityId, recipientUserId) {
  return [
    'social-activity-snapshot-v2',
    encodeURIComponent(ownerUserId),
    sourceKind,
    encodeURIComponent(sourceActivityId),
    encodeURIComponent(recipientUserId),
  ].join(':');
}

function canonicalizeUserId(userId, canonicalUserId, legacyIds) {
  return legacyIds.has(userId) ? canonicalUserId : userId;
}

function canonicalizeFriendshipRow(row, canonicalUserId, legacyIds) {
  const userAId = canonicalizeUserId(row.user_a_id, canonicalUserId, legacyIds);
  const userBId = canonicalizeUserId(row.user_b_id, canonicalUserId, legacyIds);
  if (userAId === userBId) return undefined;
  const [first, second] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  return {
    ...row,
    id: canonicalFriendshipId(first, second),
    user_a_id: first,
    user_b_id: second,
  };
}

function canonicalizePermissionRow(row, canonicalUserId, legacyIds) {
  const ownerUserId = canonicalizeUserId(row.owner_user_id, canonicalUserId, legacyIds);
  const friendUserId = canonicalizeUserId(row.friend_user_id, canonicalUserId, legacyIds);
  if (ownerUserId === friendUserId) return undefined;
  return {
    ...row,
    id: canonicalPermissionId(ownerUserId, friendUserId),
    owner_user_id: ownerUserId,
    friend_user_id: friendUserId,
  };
}

function canonicalizeRequestRow(row, canonicalUserId, legacyIds) {
  const requesterUserId = canonicalizeUserId(row.requester_user_id, canonicalUserId, legacyIds);
  const recipientUserId = canonicalizeUserId(row.recipient_user_id, canonicalUserId, legacyIds);
  if (requesterUserId === recipientUserId) return undefined;
  return {
    ...row,
    id: canonicalRequestId(requesterUserId, recipientUserId),
    requester_user_id: requesterUserId,
    recipient_user_id: recipientUserId,
  };
}

function canonicalizeSnapshotRow(row, canonicalUserId, legacyIds) {
  const ownerUserId = canonicalizeUserId(row.owner_user_id, canonicalUserId, legacyIds);
  const recipientUserId = canonicalizeUserId(row.recipient_user_id, canonicalUserId, legacyIds);
  if (ownerUserId === recipientUserId) return undefined;
  const snapshotId = canonicalSnapshotId(
    ownerUserId,
    row.source_kind,
    row.source_activity_id,
    recipientUserId,
  );
  let snapshot;
  try {
    snapshot = JSON.parse(row.snapshot_json);
  } catch {
    throw new SocialIdentityReconciliationError(
      409,
      'SOCIAL_IDENTITY_RECONCILIATION_INVALID_SNAPSHOT',
      'Un ancien snapshot social est illisible.',
    );
  }
  snapshot.ownerUserId = ownerUserId;
  snapshot.recipientUserId = recipientUserId;
  snapshot.snapshotId = snapshotId;
  return {
    ...row,
    snapshot_id: snapshotId,
    owner_user_id: ownerUserId,
    recipient_user_id: recipientUserId,
    snapshot_json: JSON.stringify(snapshot),
  };
}

function privateEntityValue(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return undefined;
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload.value && typeof payload.value === 'object' && !Array.isArray(payload.value)) {
    return payload.value;
  }
  return payload;
}

async function readPrivateEntity(databaseUrl, token, tableName, entityId, fetcher) {
  let response;
  try {
    response = await fetcher(
      `${databaseUrl}/my/${tableName}/${encodeURIComponent(entityId)}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    throw new SocialIdentityReconciliationError(
      503,
      'SOCIAL_IDENTITY_RECONCILIATION_AUTH_UNAVAILABLE',
      'Vérification de l’ancienne identité cloud indisponible.',
    );
  }

  if (response.status === 404) return undefined;
  if (response.status === 401 || response.status === 403) {
    throw new SocialIdentityReconciliationError(
      401,
      'SOCIAL_IDENTITY_RECONCILIATION_AUTH_INVALID',
      'Session SportPilot invalide ou expirée.',
    );
  }
  if (!response.ok) {
    throw new SocialIdentityReconciliationError(
      503,
      'SOCIAL_IDENTITY_RECONCILIATION_AUTH_UNAVAILABLE',
      'Vérification de l’ancienne identité cloud indisponible.',
    );
  }

  try {
    return privateEntityValue(await response.json());
  } catch {
    return undefined;
  }
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SocialIdentityReconciliationError(
      400,
      'SOCIAL_IDENTITY_RECONCILIATION_INVALID_JSON',
      'Corps JSON invalide.',
    );
  }
}

async function assertRequiredSchema(database) {
  const result = await database.prepare(`
    SELECT name
    FROM sqlite_master
    WHERE type = 'table' AND name LIKE 'social_%'
  `).all();
  const names = new Set(
    (Array.isArray(result?.results) ? result.results : [])
      .map((row) => row?.name)
      .filter((name) => typeof name === 'string'),
  );
  const missing = REQUIRED_TABLES.filter((name) => !names.has(name));
  if (missing.length > 0) {
    throw new SocialIdentityReconciliationError(
      503,
      'SOCIAL_IDENTITY_RECONCILIATION_SCHEMA_MISSING',
      'Socle social serveur incomplet.',
    );
  }
}

async function readDirectoryByHandle(database, handle) {
  return database.prepare(`
    SELECT handle, owner_user_id, owner_display_name, reserved_at, updated_at
    FROM social_directory_handles
    WHERE handle = ?1
    LIMIT 1
  `).bind(handle).first();
}

async function readDirectoryByOwner(database, ownerUserId) {
  return database.prepare(`
    SELECT handle, owner_user_id, owner_display_name, reserved_at, updated_at
    FROM social_directory_handles
    WHERE owner_user_id = ?1
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(ownerUserId).first();
}

async function discoverLegacyUserIds({
  database,
  canonicalUserId,
  previousUserId,
  handle,
  databaseUrl,
  token,
  fetcher,
}) {
  const legacyIds = new Set();
  const reservation = await readPrivateEntity(
    databaseUrl,
    token,
    'socialHandleReservations',
    socialHandleReservationId(handle),
    fetcher,
  );
  if (
    reservation
    && reservation.handle === handle
    && typeof reservation.ownerUserId === 'string'
    && reservation.ownerUserId !== canonicalUserId
  ) {
    legacyIds.add(reservation.ownerUserId);
  }

  const privateIdentity = await readPrivateEntity(
    databaseUrl,
    token,
    'socialIdentities',
    socialIdentityRecordId(previousUserId),
    fetcher,
  );
  if (
    privateIdentity
    && privateIdentity.userId === previousUserId
    && privateIdentity.handle === handle
    && previousUserId !== canonicalUserId
  ) {
    legacyIds.add(previousUserId);
  }

  const existingHandle = await readDirectoryByHandle(database, handle);
  if (
    existingHandle
    && existingHandle.owner_user_id !== canonicalUserId
    && !legacyIds.has(existingHandle.owner_user_id)
  ) {
    throw new SocialIdentityReconciliationError(
      409,
      'SOCIAL_IDENTITY_RECONCILIATION_HANDLE_CONFLICT',
      'Cet identifiant social appartient à un autre compte.',
    );
  }

  if (
    previousUserId !== canonicalUserId
    && /^(?:social-user:|sp-)/u.test(previousUserId)
    && (legacyIds.size > 0 || existingHandle?.owner_user_id === previousUserId)
  ) {
    legacyIds.add(previousUserId);
  }

  legacyIds.delete(canonicalUserId);
  return { legacyIds, existingHandle };
}

async function collectRowsForLegacyIds(database, tableName, columns, legacyIds) {
  const rowsById = new Map();
  for (const legacyId of legacyIds) {
    const result = await database.prepare(`
      SELECT ${columns}
      FROM ${tableName}
      WHERE owner_user_id = ?1 OR recipient_user_id = ?1
    `).bind(legacyId).all();
    for (const row of Array.isArray(result?.results) ? result.results : []) {
      rowsById.set(row.snapshot_id ?? row.id, row);
    }
  }
  return [...rowsById.values()];
}

async function migrateFriendships(database, canonicalUserId, legacyIds) {
  const rowsById = new Map();
  for (const legacyId of legacyIds) {
    const result = await database.prepare(`
      SELECT id, user_a_id, user_b_id, status, created_at, updated_at
      FROM social_friendships
      WHERE user_a_id = ?1 OR user_b_id = ?1
    `).bind(legacyId).all();
    for (const row of Array.isArray(result?.results) ? result.results : []) rowsById.set(row.id, row);
  }

  for (const row of rowsById.values()) {
    const next = canonicalizeFriendshipRow(row, canonicalUserId, legacyIds);
    await database.prepare('DELETE FROM social_friendships WHERE id = ?1').bind(row.id).run();
    if (!next) continue;
    await database.prepare(`
      INSERT INTO social_friendships(id, user_a_id, user_b_id, status, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6)
      ON CONFLICT(id) DO UPDATE SET
        status = CASE
          WHEN social_friendships.status = 'active' OR excluded.status = 'active' THEN 'active'
          ELSE excluded.status
        END,
        created_at = MIN(social_friendships.created_at, excluded.created_at),
        updated_at = MAX(social_friendships.updated_at, excluded.updated_at)
    `).bind(
      next.id,
      next.user_a_id,
      next.user_b_id,
      next.status,
      next.created_at,
      next.updated_at,
    ).run();
  }
  return rowsById.size;
}

async function migratePermissions(database, canonicalUserId, legacyIds) {
  const rowsById = new Map();
  for (const legacyId of legacyIds) {
    const result = await database.prepare(`
      SELECT id, owner_user_id, friend_user_id, friend_handle, sharing_level,
             detailed_consent, detailed_consent_granted_at, field_selection_json, created_at, updated_at
      FROM social_friend_permissions
      WHERE owner_user_id = ?1 OR friend_user_id = ?1
    `).bind(legacyId).all();
    for (const row of Array.isArray(result?.results) ? result.results : []) rowsById.set(row.id, row);
  }

  for (const row of rowsById.values()) {
    const next = canonicalizePermissionRow(row, canonicalUserId, legacyIds);
    await database.prepare('DELETE FROM social_friend_permissions WHERE id = ?1').bind(row.id).run();
    if (!next) continue;
    await database.prepare(`
      INSERT INTO social_friend_permissions(
        id, owner_user_id, friend_user_id, friend_handle, sharing_level,
        detailed_consent, detailed_consent_granted_at, field_selection_json,
        created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
      ON CONFLICT(owner_user_id, friend_user_id) DO UPDATE SET
        id = excluded.id,
        friend_handle = CASE
          WHEN excluded.updated_at >= social_friend_permissions.updated_at
          THEN excluded.friend_handle ELSE social_friend_permissions.friend_handle END,
        sharing_level = CASE
          WHEN excluded.updated_at >= social_friend_permissions.updated_at
          THEN excluded.sharing_level ELSE social_friend_permissions.sharing_level END,
        detailed_consent = CASE
          WHEN excluded.updated_at >= social_friend_permissions.updated_at
          THEN excluded.detailed_consent ELSE social_friend_permissions.detailed_consent END,
        detailed_consent_granted_at = CASE
          WHEN excluded.updated_at >= social_friend_permissions.updated_at
          THEN excluded.detailed_consent_granted_at
          ELSE social_friend_permissions.detailed_consent_granted_at END,
        field_selection_json = CASE
          WHEN excluded.updated_at >= social_friend_permissions.updated_at
          THEN excluded.field_selection_json
          ELSE social_friend_permissions.field_selection_json END,
        created_at = MIN(social_friend_permissions.created_at, excluded.created_at),
        updated_at = MAX(social_friend_permissions.updated_at, excluded.updated_at)
    `).bind(
      next.id,
      next.owner_user_id,
      next.friend_user_id,
      next.friend_handle,
      next.sharing_level,
      next.detailed_consent,
      next.detailed_consent_granted_at ?? null,
      next.field_selection_json ?? null,
      next.created_at,
      next.updated_at,
    ).run();
  }
  return rowsById.size;
}

async function migrateRequests(database, canonicalUserId, legacyIds) {
  const rowsById = new Map();
  for (const legacyId of legacyIds) {
    const result = await database.prepare(`
      SELECT id, requester_user_id, recipient_user_id, status, requested_at,
             responded_at, created_at, updated_at
      FROM social_friend_requests
      WHERE requester_user_id = ?1 OR recipient_user_id = ?1
    `).bind(legacyId).all();
    for (const row of Array.isArray(result?.results) ? result.results : []) rowsById.set(row.id, row);
  }

  for (const row of rowsById.values()) {
    const next = canonicalizeRequestRow(row, canonicalUserId, legacyIds);
    await database.prepare('DELETE FROM social_friend_requests WHERE id = ?1').bind(row.id).run();
    if (!next) continue;
    await database.prepare(`
      INSERT INTO social_friend_requests(
        id, requester_user_id, recipient_user_id, status, requested_at,
        responded_at, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      ON CONFLICT(requester_user_id, recipient_user_id) DO UPDATE SET
        id = excluded.id,
        status = CASE
          WHEN excluded.updated_at >= social_friend_requests.updated_at
          THEN excluded.status ELSE social_friend_requests.status END,
        requested_at = MIN(social_friend_requests.requested_at, excluded.requested_at),
        responded_at = CASE
          WHEN excluded.updated_at >= social_friend_requests.updated_at
          THEN excluded.responded_at ELSE social_friend_requests.responded_at END,
        created_at = MIN(social_friend_requests.created_at, excluded.created_at),
        updated_at = MAX(social_friend_requests.updated_at, excluded.updated_at)
    `).bind(
      next.id,
      next.requester_user_id,
      next.recipient_user_id,
      next.status,
      next.requested_at,
      next.responded_at ?? null,
      next.created_at,
      next.updated_at,
    ).run();
  }
  return rowsById.size;
}

async function migrateSnapshots(database, canonicalUserId, legacyIds) {
  const rows = await collectRowsForLegacyIds(
    database,
    'social_activity_snapshots',
    `snapshot_id, owner_user_id, recipient_user_id, source_kind, source_activity_id,
     source_revision, contract_version, state, visibility, family, activity_type,
     occurred_on, occurred_at, created_at, updated_at, deleted_at,
     deletion_reason, mutation_sequence, snapshot_json`,
    legacyIds,
  );

  for (const row of rows) {
    const next = canonicalizeSnapshotRow(row, canonicalUserId, legacyIds);
    await database.prepare('DELETE FROM social_activity_snapshots WHERE snapshot_id = ?1')
      .bind(row.snapshot_id)
      .run();
    if (!next) continue;
    await database.prepare(`
      INSERT INTO social_activity_snapshots(
        snapshot_id, owner_user_id, recipient_user_id, source_kind,
        source_activity_id, source_revision, contract_version, state,
        visibility, family, activity_type, occurred_on, occurred_at,
        created_at, updated_at, deleted_at, deletion_reason,
        mutation_sequence, snapshot_json
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13,
        ?14, ?15, ?16, ?17, ?18, ?19
      )
      ON CONFLICT(owner_user_id, source_kind, source_activity_id, recipient_user_id)
      DO UPDATE SET
        snapshot_id = excluded.snapshot_id,
        source_revision = excluded.source_revision,
        contract_version = excluded.contract_version,
        state = excluded.state,
        visibility = excluded.visibility,
        family = excluded.family,
        activity_type = excluded.activity_type,
        occurred_on = excluded.occurred_on,
        occurred_at = excluded.occurred_at,
        updated_at = MAX(social_activity_snapshots.updated_at, excluded.updated_at),
        deleted_at = excluded.deleted_at,
        deletion_reason = excluded.deletion_reason,
        mutation_sequence = MAX(social_activity_snapshots.mutation_sequence, excluded.mutation_sequence),
        snapshot_json = excluded.snapshot_json
    `).bind(
      next.snapshot_id,
      next.owner_user_id,
      next.recipient_user_id,
      next.source_kind,
      next.source_activity_id,
      next.source_revision,
      next.contract_version,
      next.state,
      next.visibility ?? null,
      next.family ?? null,
      next.activity_type ?? null,
      next.occurred_on ?? null,
      next.occurred_at ?? null,
      next.created_at,
      next.updated_at,
      next.deleted_at ?? null,
      next.deletion_reason ?? null,
      next.mutation_sequence,
      next.snapshot_json,
    ).run();
  }
  return rows.length;
}

async function migrateDirectory(database, canonicalUserId, legacyIds, profile, timestamp) {
  for (const legacyId of legacyIds) {
    await database.prepare(`
      DELETE FROM social_directory_handles
      WHERE owner_user_id = ?1 AND handle <> ?2
    `).bind(legacyId, profile.handle).run();
  }

  await database.prepare(`
    INSERT INTO social_directory_handles(
      handle, owner_user_id, owner_display_name, reserved_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5)
    ON CONFLICT(handle) DO UPDATE SET
      owner_user_id = excluded.owner_user_id,
      owner_display_name = excluded.owner_display_name,
      reserved_at = MIN(social_directory_handles.reserved_at, excluded.reserved_at),
      updated_at = excluded.updated_at
  `).bind(
    profile.handle,
    canonicalUserId,
    profile.displayName,
    profile.createdAt,
    timestamp,
  ).run();
}

async function reconcileIdentity(database, actor, input, env, fetcher) {
  await assertRequiredSchema(database);
  const canonicalUserId = sanitizeUserId(actor.subject, 'canonicalUserId');
  const previousUserId = sanitizeUserId(input?.previousUserId, 'previousUserId');
  const requestedHandle = normalizeHandle(input?.handle);
  const requestedDisplayName = sanitizeDisplayName(input?.displayName);
  const timestamp = new Date().toISOString();
  const databaseUrl = new URL(String(env.DEXIE_CLOUD_DATABASE_URL)).origin;

  const canonicalDirectory = await readDirectoryByOwner(database, canonicalUserId);
  const { legacyIds, existingHandle } = await discoverLegacyUserIds({
    database,
    canonicalUserId,
    previousUserId,
    handle: requestedHandle,
    databaseUrl,
    token: actor.token,
    fetcher,
  });

  const sourceProfile = canonicalDirectory ?? existingHandle;
  const profile = {
    handle: sourceProfile?.handle ?? requestedHandle,
    displayName: sourceProfile?.owner_display_name ?? requestedDisplayName,
    createdAt: sanitizeIsoDateTime(
      sourceProfile?.reserved_at ?? input?.createdAt,
      timestamp,
    ),
    handleUpdatedAt: sanitizeIsoDateTime(
      sourceProfile?.reserved_at ?? input?.handleUpdatedAt,
      timestamp,
    ),
  };

  const counts = {
    friendships: await migrateFriendships(database, canonicalUserId, legacyIds),
    permissions: await migratePermissions(database, canonicalUserId, legacyIds),
    requests: await migrateRequests(database, canonicalUserId, legacyIds),
    snapshots: await migrateSnapshots(database, canonicalUserId, legacyIds),
  };
  await migrateDirectory(database, canonicalUserId, legacyIds, profile, timestamp);

  return {
    status: legacyIds.size > 0 || previousUserId !== canonicalUserId
      ? 'reconciled'
      : 'alreadyCanonical',
    identity: {
      userId: canonicalUserId,
      handle: profile.handle,
      displayName: profile.displayName,
      createdAt: profile.createdAt,
      updatedAt: timestamp,
      handleUpdatedAt: profile.handleUpdatedAt,
    },
    migratedUserIds: [...legacyIds],
    migratedCounts: counts,
    message: legacyIds.size > 0
      ? 'Identité sociale réconciliée avec le compte Dexie Cloud.'
      : 'Identité sociale déjà alignée avec le compte Dexie Cloud.',
  };
}

function errorResponse(error) {
  if (
    error
    && typeof error === 'object'
    && typeof error.status === 'number'
    && typeof error.code === 'string'
  ) {
    return jsonResponse(error.status, {
      status: error.status === 409 ? 'conflict' : 'error',
      code: error.code,
      message: error.message,
    });
  }
  return jsonResponse(503, {
    status: 'error',
    code: 'SOCIAL_IDENTITY_RECONCILIATION_SERVER_ERROR',
    message: 'Réconciliation de l’identité sociale indisponible.',
  });
}

export async function handleSocialIdentityReconciliationRequest(
  request,
  env = {},
  context = {},
) {
  try {
    const methodResponse = assertMethod(request);
    if (methodResponse) return methodResponse;
    const actor = await socialActivitySnapshotsInternals.authenticateRequest(
      request,
      env,
      context.fetcher ?? fetch,
    );
    const database = readDatabase(env);
    const input = await readJsonBody(request);
    const result = await reconcileIdentity(
      database,
      actor,
      input,
      env,
      context.fetcher ?? fetch,
    );
    return jsonResponse(200, result);
  } catch (error) {
    return errorResponse(error);
  }
}

export const socialIdentityReconciliationInternals = {
  canonicalFriendshipId,
  canonicalPermissionId,
  canonicalRequestId,
  canonicalSnapshotId,
  canonicalizeFriendshipRow,
  canonicalizePermissionRow,
  canonicalizeRequestRow,
  canonicalizeSnapshotRow,
  discoverLegacyUserIds,
};
