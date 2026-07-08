import { validateSocialActivitySnapshotPayload } from './socialActivitySnapshotValidation.js';

class SocialActivitySnapshotsError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SocialActivitySnapshotsError';
    this.status = status;
    this.code = code;
  }
}

const CONTRACT_VERSION = '0.29.0-a3';
const SOURCE_KINDS = new Set(['activity', 'strengthSession']);
const ACTIVE_VISIBILITIES = new Set(['summary', 'detailed', 'custom']);
const DELETION_REASONS = new Set(['sourceDeleted', 'sharingDisabled', 'friendRevoked']);
const FORBIDDEN_KEYS = new Set([
  'note',
  'notes',
  'comment',
  'comments',
  'privateComment',
  'privateComments',
  'personalNote',
  'personalNotes',
]);
const SUMMARY_ALLOWED_FIELDS = Object.freeze({
  common: new Set(['activityType', 'title', 'date', 'duration']),
  cardio: new Set(['distance']),
  strength: new Set(['sessionName', 'muscleGroups', 'exerciseCount']),
});
const SUMMARY_FIELD_BY_KEY = Object.freeze({
  durationMinutes: 'duration',
  intensity: 'intensity',
  caloriesKcal: 'calories',
  distanceKm: 'distance',
  distanceMeters: 'distance',
  paceMinutesPerKm: 'pace',
  paceSecondsPer100Meters: 'pace',
  speedKph: 'speed',
  elevationGainMeters: 'elevation',
  averageHeartRateBpm: 'heartRate',
  averageCadencePerMinute: 'cadence',
  exerciseCount: 'exerciseCount',
  muscleGroups: 'muscleGroups',
  volumeKg: 'volume',
});
const MAX_PAYLOAD_BYTES = 196_608;
const DEFAULT_FEED_LIMIT = 20;
const MAX_FEED_LIMIT = 50;
const AUTH_PROBE_KEY = '__sportpilot_social_auth_probe__';
const SOCIAL_ACTIVITY_REQUIRED_MIGRATION = '0001_social_activity_snapshots_0_29_0.sql';
const SOCIAL_ACTIVITY_PREREQUISITE_TABLES = Object.freeze([
  'social_directory_handles',
  'social_friendships',
  'social_friend_permissions',
]);
const SOCIAL_ACTIVITY_SCHEMA_OBJECTS = Object.freeze([
  'social_activity_snapshots',
  'idx_social_activity_snapshot_source_recipient',
  'idx_social_activity_snapshot_feed',
  'idx_social_activity_snapshot_owner',
]);

function isSocialActivitySnapshotsError(error) {
  return Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error);
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
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
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
    },
  });
}

function assertMethod(request, expected) {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== expected) {
    throw new SocialActivitySnapshotsError(405, 'SOCIAL_ACTIVITY_METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
  }
  return undefined;
}

function readDatabase(env = {}) {
  const database = env.SOCIAL_DIRECTORY_DB;
  if (!database || typeof database.prepare !== 'function') {
    throw new SocialActivitySnapshotsError(503, 'SOCIAL_ACTIVITY_DATABASE_NOT_CONFIGURED', 'Stockage social serveur non configuré.');
  }
  return database;
}

function readDexieCloudDatabaseUrl(env = {}) {
  const raw = typeof env.DEXIE_CLOUD_DATABASE_URL === 'string'
    ? env.DEXIE_CLOUD_DATABASE_URL.trim()
    : '';
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SocialActivitySnapshotsError(503, 'SOCIAL_ACTIVITY_AUTH_NOT_CONFIGURED', 'Validation du compte cloud non configurée.');
  }

  if (
    parsed.protocol !== 'https:'
    || !parsed.hostname.endsWith('.dexie.cloud')
    || parsed.hostname === 'dexie.cloud'
    || parsed.pathname !== '/'
    || parsed.search
    || parsed.hash
    || parsed.username
    || parsed.password
  ) {
    throw new SocialActivitySnapshotsError(503, 'SOCIAL_ACTIVITY_AUTH_NOT_CONFIGURED', 'Validation du compte cloud non configurée.');
  }

  return parsed.origin;
}

function readBearerToken(request) {
  const authorization = request.headers.get('authorization')?.trim() ?? '';
  const match = /^Bearer\s+([^\s]+)$/iu.exec(authorization);
  if (!match) {
    throw new SocialActivitySnapshotsError(401, 'SOCIAL_ACTIVITY_AUTH_REQUIRED', 'Connexion SportPilot requise.');
  }
  return match[1];
}

function decodeBase64UrlJson(value) {
  try {
    const normalized = value.replace(/-/gu, '+').replace(/_/gu, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const decoded = atob(padded);
    const bytes = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new SocialActivitySnapshotsError(401, 'SOCIAL_ACTIVITY_AUTH_INVALID', 'Session SportPilot invalide.');
  }
}

function decodeTokenSubject(token) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new SocialActivitySnapshotsError(401, 'SOCIAL_ACTIVITY_AUTH_INVALID', 'Session SportPilot invalide.');
  }
  const payload = decodeBase64UrlJson(parts[1]);
  const subject = payload && typeof payload === 'object' && typeof payload.sub === 'string'
    ? payload.sub.trim()
    : '';
  if (subject.length < 3 || subject.length > 160) {
    throw new SocialActivitySnapshotsError(401, 'SOCIAL_ACTIVITY_AUTH_INVALID', 'Session SportPilot invalide.');
  }
  return subject;
}

async function authenticateRequest(request, env = {}, fetcher = fetch) {
  const token = readBearerToken(request);
  const subject = decodeTokenSubject(token);
  const databaseUrl = readDexieCloudDatabaseUrl(env);
  let response;
  try {
    response = await fetcher(
      `${databaseUrl}/my/realActivities/${encodeURIComponent(AUTH_PROBE_KEY)}`,
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          authorization: `Bearer ${token}`,
        },
      },
    );
  } catch {
    throw new SocialActivitySnapshotsError(503, 'SOCIAL_ACTIVITY_AUTH_UNAVAILABLE', 'Validation du compte cloud indisponible.');
  }

  if (response.status === 401 || response.status === 403) {
    throw new SocialActivitySnapshotsError(401, 'SOCIAL_ACTIVITY_AUTH_INVALID', 'Session SportPilot invalide ou expirée.');
  }
  if (response.status >= 500 || (response.status !== 200 && response.status !== 404)) {
    throw new SocialActivitySnapshotsError(503, 'SOCIAL_ACTIVITY_AUTH_UNAVAILABLE', 'Validation du compte cloud indisponible.');
  }

  return { subject, token };
}

function sanitizeUserId(value, fieldName) {
  const userId = typeof value === 'string' ? value.trim() : '';
  if (userId.length < 3 || userId.length > 160) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_USER', `Compte SportPilot invalide pour ${fieldName}.`);
  }
  return userId;
}

function sanitizeIdentifier(value, fieldName, maxLength = 512) {
  const identifier = typeof value === 'string' ? value.trim() : '';
  if (!identifier || identifier.length > maxLength) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', `Identifiant invalide pour ${fieldName}.`);
  }
  return identifier;
}

function sanitizeIsoDateTime(value, fieldName) {
  const dateTime = typeof value === 'string' ? value.trim() : '';
  if (!dateTime || Number.isNaN(Date.parse(dateTime))) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', `Date invalide pour ${fieldName}.`);
  }
  return dateTime;
}

function assertNoForbiddenKeys(value, path = '$') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoForbiddenKeys(entry, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;

  Object.entries(value).forEach(([key, entry]) => {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_PRIVATE_FIELD', `Champ privé interdit dans le snapshot : ${path}.${key}.`);
    }
    assertNoForbiddenKeys(entry, `${path}.${key}`);
  });
}

function expectedSnapshotId(snapshot) {
  return [
    'social-activity-snapshot-v2',
    encodeURIComponent(snapshot.ownerUserId),
    snapshot.sourceKind,
    encodeURIComponent(snapshot.sourceActivityId),
    encodeURIComponent(snapshot.recipientUserId),
  ].join(':');
}

function normalizeSnapshot(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Snapshot social invalide.');
  }

  const snapshot = structuredClone(value);
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > MAX_PAYLOAD_BYTES) {
    throw new SocialActivitySnapshotsError(413, 'SOCIAL_ACTIVITY_PAYLOAD_TOO_LARGE', 'Snapshot social trop volumineux.');
  }

  assertNoForbiddenKeys(snapshot);
  if (snapshot.contractVersion !== CONTRACT_VERSION) {
    throw new SocialActivitySnapshotsError(409, 'SOCIAL_ACTIVITY_CONTRACT_UNSUPPORTED', 'Version de snapshot social non prise en charge.');
  }

  snapshot.ownerUserId = sanitizeUserId(snapshot.ownerUserId, 'ownerUserId');
  snapshot.recipientUserId = sanitizeUserId(snapshot.recipientUserId, 'recipientUserId');
  snapshot.snapshotId = sanitizeIdentifier(snapshot.snapshotId, 'snapshotId');
  snapshot.sourceActivityId = sanitizeIdentifier(snapshot.sourceActivityId, 'sourceActivityId');
  snapshot.sourceRevision = sanitizeIdentifier(snapshot.sourceRevision, 'sourceRevision');
  snapshot.createdAt = sanitizeIsoDateTime(snapshot.createdAt, 'createdAt');
  snapshot.updatedAt = sanitizeIsoDateTime(snapshot.updatedAt, 'updatedAt');

  if (!SOURCE_KINDS.has(snapshot.sourceKind)) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Type de source sociale invalide.');
  }
  const deterministicSnapshotId = expectedSnapshotId(snapshot);
  if (snapshot.snapshotId !== deterministicSnapshotId) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Clé de snapshot social incohérente.');
  }

  const validation = validateSocialActivitySnapshotPayload(snapshot, {
    contractVersion: CONTRACT_VERSION,
    expectedSnapshotId: deterministicSnapshotId,
  });
  if (!validation.valid) {
    const firstIssue = validation.issues[0];
    const detail = firstIssue ? `${firstIssue.path} : ${firstIssue.message}` : 'Contrat social invalide.';
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', detail);
  }

  if (snapshot.state === 'active') {
    if (!ACTIVE_VISIBILITIES.has(snapshot.visibility)) {
      throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Visibilité sociale invalide.');
    }
    if (typeof snapshot.family !== 'string' || typeof snapshot.activityType !== 'string') {
      throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Famille ou type d’activité invalide.');
    }
    if (typeof snapshot.occurredOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(snapshot.occurredOn)) {
      throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Date d’activité invalide.');
    }
    if (!snapshot.allowedFields || typeof snapshot.allowedFields !== 'object' || !snapshot.summary || typeof snapshot.summary !== 'object') {
      throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Projection sociale incomplète.');
    }
    return snapshot;
  }

  if (snapshot.state === 'deleted') {
    snapshot.deletedAt = sanitizeIsoDateTime(snapshot.deletedAt, 'deletedAt');
    if (!DELETION_REASONS.has(snapshot.deletionReason)) {
      throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'Motif de suppression sociale invalide.');
    }
    return snapshot;
  }

  throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SNAPSHOT', 'État de snapshot social invalide.');
}

function sanitizeMutationSequence(value) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_SEQUENCE', 'Séquence de mutation sociale invalide.');
  }
  return value;
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_PAYLOAD_BYTES) {
    throw new SocialActivitySnapshotsError(413, 'SOCIAL_ACTIVITY_PAYLOAD_TOO_LARGE', 'Snapshot social trop volumineux.');
  }
  try {
    return await request.json();
  } catch {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_JSON', 'Corps JSON invalide.');
  }
}

async function inspectSocialActivitySchema(database) {
  const result = await database.prepare(`
    SELECT type, name
    FROM sqlite_master
    WHERE name LIKE 'social_%'
       OR name LIKE 'idx_social_activity_snapshot_%'
  `).all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  const availableNames = new Set(
    rows
      .map((row) => (typeof row?.name === 'string' ? row.name : ''))
      .filter(Boolean),
  );
  const missingPrerequisites = SOCIAL_ACTIVITY_PREREQUISITE_TABLES.filter(
    (name) => !availableNames.has(name),
  );
  const missingActivitySchema = SOCIAL_ACTIVITY_SCHEMA_OBJECTS.filter(
    (name) => !availableNames.has(name),
  );
  const status = missingPrerequisites.length > 0
    ? 'prerequisiteMissing'
    : (missingActivitySchema.length > 0 ? 'migrationRequired' : 'ready');

  return {
    status,
    contractVersion: CONTRACT_VERSION,
    authVerified: true,
    databaseBound: true,
    requiredMigration: SOCIAL_ACTIVITY_REQUIRED_MIGRATION,
    missingPrerequisites,
    missingActivitySchema,
    checkedAt: new Date().toISOString(),
  };
}

async function assertSocialActivitySchemaReady(database) {
  const readiness = await inspectSocialActivitySchema(database);
  if (readiness.status === 'prerequisiteMissing') {
    throw new SocialActivitySnapshotsError(
      503,
      'SOCIAL_ACTIVITY_PREREQUISITE_MISSING',
      'Socle social serveur incomplet.',
    );
  }
  if (readiness.status === 'migrationRequired') {
    throw new SocialActivitySnapshotsError(
      503,
      'SOCIAL_ACTIVITY_MIGRATION_REQUIRED',
      `Migration D1 requise : ${SOCIAL_ACTIVITY_REQUIRED_MIGRATION}.`,
    );
  }
  return readiness;
}

async function hasActiveFriendship(database, ownerUserId, recipientUserId) {
  const row = await database.prepare(`
    SELECT id
    FROM social_friendships
    WHERE status = 'active'
      AND ((user_a_id = ?1 AND user_b_id = ?2) OR (user_a_id = ?2 AND user_b_id = ?1))
    LIMIT 1
  `).bind(ownerUserId, recipientUserId).first();
  return Boolean(row);
}

async function readPermission(database, ownerUserId, recipientUserId) {
  return database.prepare(`
    SELECT sharing_level, detailed_consent
    FROM social_friend_permissions
    WHERE owner_user_id = ?1 AND friend_user_id = ?2
    LIMIT 1
  `).bind(ownerUserId, recipientUserId).first();
}

async function authorizeActiveSnapshot(database, snapshot) {
  if (!(await hasActiveFriendship(database, snapshot.ownerUserId, snapshot.recipientUserId))) {
    throw new SocialActivitySnapshotsError(403, 'SOCIAL_ACTIVITY_NOT_FRIENDS', 'Publication refusée : amitié inactive.');
  }
  const permission = await readPermission(database, snapshot.ownerUserId, snapshot.recipientUserId);
  if (!permission) {
    throw new SocialActivitySnapshotsError(403, 'SOCIAL_ACTIVITY_PERMISSION_MISSING', 'Publication refusée : permission ami absente.');
  }
  if (permission.sharing_level === 'summary' && snapshot.visibility !== 'summary') {
    throw new SocialActivitySnapshotsError(403, 'SOCIAL_ACTIVITY_SCOPE_EXCEEDED', 'Publication refusée : niveau de détail supérieur à la permission ami.');
  }
  if (
    snapshot.visibility !== 'summary'
    && (permission.sharing_level !== 'detailed' || permission.detailed_consent !== 'granted')
  ) {
    throw new SocialActivitySnapshotsError(403, 'SOCIAL_ACTIVITY_SCOPE_EXCEEDED', 'Publication détaillée refusée sans consentement ami.');
  }
}

async function readExistingSnapshot(database, snapshotId) {
  return database.prepare(`
    SELECT snapshot_id, owner_user_id, mutation_sequence, snapshot_json
    FROM social_activity_snapshots
    WHERE snapshot_id = ?1
    LIMIT 1
  `).bind(snapshotId).first();
}

function snapshotColumns(snapshot) {
  return {
    visibility: snapshot.state === 'active' ? snapshot.visibility : null,
    family: snapshot.state === 'active' ? snapshot.family : null,
    activityType: snapshot.state === 'active' ? snapshot.activityType : null,
    occurredOn: snapshot.state === 'active' ? snapshot.occurredOn : null,
    occurredAt: snapshot.state === 'active'
      ? (snapshot.occurredAt ?? (snapshot.occurredTime ? `${snapshot.occurredOn}T${snapshot.occurredTime}:00.000` : null))
      : null,
    deletedAt: snapshot.state === 'deleted' ? snapshot.deletedAt : null,
    deletionReason: snapshot.state === 'deleted' ? snapshot.deletionReason : null,
  };
}

async function persistSnapshotMutation(database, actorUserId, payload) {
  const snapshot = normalizeSnapshot(payload?.snapshot);
  const mutationSequence = sanitizeMutationSequence(payload?.mutationSequence);
  if (snapshot.ownerUserId !== actorUserId) {
    throw new SocialActivitySnapshotsError(403, 'SOCIAL_ACTIVITY_OWNER_MISMATCH', 'Publication refusée : propriétaire non authentifié.');
  }

  await assertSocialActivitySchemaReady(database);
  const existing = await readExistingSnapshot(database, snapshot.snapshotId);
  if (existing && existing.owner_user_id !== actorUserId) {
    throw new SocialActivitySnapshotsError(403, 'SOCIAL_ACTIVITY_OWNER_MISMATCH', 'Publication refusée : snapshot appartenant à un autre compte.');
  }

  if (existing && mutationSequence < existing.mutation_sequence) {
    return { status: 200, payload: { status: 'stale', mutationSequence: existing.mutation_sequence } };
  }
  const snapshotJson = JSON.stringify(snapshot);
  if (existing && mutationSequence === existing.mutation_sequence) {
    if (existing.snapshot_json !== snapshotJson) {
      throw new SocialActivitySnapshotsError(409, 'SOCIAL_ACTIVITY_SEQUENCE_CONFLICT', 'Conflit de séquence sur le snapshot social.');
    }
    return { status: 200, payload: { status: 'alreadyExists', mutationSequence } };
  }

  if (!existing && snapshot.state === 'deleted') {
    return {
      status: 200,
      payload: {
        status: 'alreadyExists',
        mutationSequence,
        snapshotId: snapshot.snapshotId,
      },
    };
  }

  if (snapshot.state === 'active') await authorizeActiveSnapshot(database, snapshot);
  const columns = snapshotColumns(snapshot);
  const timestamp = new Date().toISOString();

  await database.prepare(`
    INSERT INTO social_activity_snapshots(
      snapshot_id, owner_user_id, recipient_user_id, source_kind, source_activity_id,
      source_revision, contract_version, state, visibility, family, activity_type,
      occurred_on, occurred_at, created_at, updated_at, deleted_at, deletion_reason,
      mutation_sequence, snapshot_json
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)
    ON CONFLICT(snapshot_id) DO UPDATE SET
      source_revision = excluded.source_revision,
      contract_version = excluded.contract_version,
      state = excluded.state,
      visibility = excluded.visibility,
      family = excluded.family,
      activity_type = excluded.activity_type,
      occurred_on = excluded.occurred_on,
      occurred_at = excluded.occurred_at,
      updated_at = excluded.updated_at,
      deleted_at = excluded.deleted_at,
      deletion_reason = excluded.deletion_reason,
      mutation_sequence = excluded.mutation_sequence,
      snapshot_json = excluded.snapshot_json
    WHERE excluded.mutation_sequence > social_activity_snapshots.mutation_sequence
  `).bind(
    snapshot.snapshotId,
    snapshot.ownerUserId,
    snapshot.recipientUserId,
    snapshot.sourceKind,
    snapshot.sourceActivityId,
    snapshot.sourceRevision,
    snapshot.contractVersion,
    snapshot.state,
    columns.visibility,
    columns.family,
    columns.activityType,
    columns.occurredOn,
    columns.occurredAt,
    snapshot.createdAt,
    timestamp,
    columns.deletedAt,
    columns.deletionReason,
    mutationSequence,
    snapshotJson,
  ).run();

  return {
    status: existing ? 200 : 201,
    payload: {
      status: existing ? 'updated' : 'created',
      mutationSequence,
      snapshotId: snapshot.snapshotId,
      serverUpdatedAt: timestamp,
    },
  };
}

function encodeCursor(value) {
  const json = JSON.stringify(value);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

function decodeCursor(value) {
  if (!value) return undefined;
  const decoded = decodeBase64UrlJson(value);
  if (
    !decoded
    || typeof decoded !== 'object'
    || typeof decoded.sortTime !== 'string'
    || typeof decoded.updatedAt !== 'string'
    || typeof decoded.snapshotId !== 'string'
  ) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_CURSOR', 'Curseur de fil invalide.');
  }
  return decoded;
}

function normalizeFeedLimit(raw) {
  if (raw === null || raw === '') return DEFAULT_FEED_LIMIT;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new SocialActivitySnapshotsError(400, 'SOCIAL_ACTIVITY_INVALID_LIMIT', 'Limite de fil invalide.');
  }
  return Math.min(MAX_FEED_LIMIT, value);
}

function parseStoredSnapshot(row) {
  try {
    const snapshot = normalizeSnapshot(JSON.parse(row.snapshot_json));
    if (typeof row.snapshot_id === 'string' && snapshot.snapshotId !== row.snapshot_id) {
      throw new Error('Snapshot id mismatch.');
    }
    return snapshot;
  } catch {
    throw new SocialActivitySnapshotsError(503, 'SOCIAL_ACTIVITY_CORRUPTED_SNAPSHOT', 'Snapshot social serveur illisible.');
  }
}

function permissionAllowsDetailed(row) {
  return row.sharing_level === 'detailed' && row.detailed_consent === 'granted';
}

function fieldIsAllowed(selection, field) {
  return selection.common.includes(field)
    || selection.cardio.includes(field)
    || selection.strength.includes(field);
}

function redactSnapshotToSummary(snapshot) {
  const allowedFields = {
    common: snapshot.allowedFields.common.filter((field) => SUMMARY_ALLOWED_FIELDS.common.has(field)),
    cardio: snapshot.allowedFields.cardio.filter((field) => SUMMARY_ALLOWED_FIELDS.cardio.has(field)),
    strength: snapshot.allowedFields.strength.filter((field) => SUMMARY_ALLOWED_FIELDS.strength.has(field)),
  };
  const summary = {};
  Object.entries(snapshot.summary).forEach(([key, value]) => {
    const field = SUMMARY_FIELD_BY_KEY[key];
    if (field && fieldIsAllowed(allowedFields, field)) summary[key] = value;
  });
  const {
    visibility: _visibility,
    allowedFields: _allowedFields,
    summary: _summary,
    detail: _detail,
    occurredTime: _occurredTime,
    occurredAt: _occurredAt,
    title,
    ...identity
  } = snapshot;

  return normalizeSnapshot({
    ...identity,
    visibility: 'summary',
    ...(title !== undefined && allowedFields.common.includes('title') ? { title } : {}),
    allowedFields,
    summary,
  });
}

function snapshotForCurrentPermission(row) {
  const snapshot = parseStoredSnapshot(row);
  if (snapshot.visibility === 'summary' || permissionAllowsDetailed(row)) return snapshot;
  return redactSnapshotToSummary(snapshot);
}

function toFeedCard(row) {
  const snapshot = snapshotForCurrentPermission(row);
  const { detail: _detail, ...cardSnapshot } = snapshot;
  return {
    ...cardSnapshot,
    detailAvailable: Boolean(snapshot.detail),
    ownerProfile: {
      userId: snapshot.ownerUserId,
      ...(typeof row.owner_handle === 'string' && row.owner_handle.trim()
        ? { handle: row.owner_handle }
        : {}),
      ...(typeof row.owner_display_name === 'string' && row.owner_display_name.trim()
        ? { displayName: row.owner_display_name }
        : {}),
    },
  };
}

async function listFeed(database, recipientUserId, url) {
  await assertSocialActivitySchemaReady(database);
  const limit = normalizeFeedLimit(url.searchParams.get('limit'));
  const cursor = decodeCursor(url.searchParams.get('cursor'));
  const pageLimit = limit + 1;
  const sortExpression = "COALESCE(s.occurred_at, s.occurred_on || 'T00:00:00.000')";

  const baseSql = `
    SELECT s.snapshot_id, s.updated_at, s.snapshot_json,
           p.sharing_level, p.detailed_consent,
           ${sortExpression} AS sort_time,
           (
             SELECT h.handle
             FROM social_directory_handles h
             WHERE h.owner_user_id = s.owner_user_id
             ORDER BY h.updated_at DESC
             LIMIT 1
           ) AS owner_handle,
           (
             SELECT h.owner_display_name
             FROM social_directory_handles h
             WHERE h.owner_user_id = s.owner_user_id
             ORDER BY h.updated_at DESC
             LIMIT 1
           ) AS owner_display_name
    FROM social_activity_snapshots s
    INNER JOIN social_friend_permissions p
      ON p.owner_user_id = s.owner_user_id
     AND p.friend_user_id = s.recipient_user_id
    WHERE s.recipient_user_id = ?1
      AND s.state = 'active'
      AND EXISTS (
        SELECT 1 FROM social_friendships f
        WHERE f.status = 'active'
          AND ((f.user_a_id = s.owner_user_id AND f.user_b_id = ?1)
            OR (f.user_b_id = s.owner_user_id AND f.user_a_id = ?1))
      )
  `;

  const statement = cursor
    ? database.prepare(`${baseSql}
        AND (
          ${sortExpression} < ?2
          OR (${sortExpression} = ?2 AND s.updated_at < ?3)
          OR (${sortExpression} = ?2 AND s.updated_at = ?3 AND s.snapshot_id < ?4)
        )
        ORDER BY sort_time DESC, s.updated_at DESC, s.snapshot_id DESC
        LIMIT ?5
      `).bind(recipientUserId, cursor.sortTime, cursor.updatedAt, cursor.snapshotId, pageLimit)
    : database.prepare(`${baseSql}
        ORDER BY sort_time DESC, s.updated_at DESC, s.snapshot_id DESC
        LIMIT ?2
      `).bind(recipientUserId, pageLimit);

  const result = await statement.all();
  const rows = Array.isArray(result?.results) ? result.results : [];
  const hasMore = rows.length > limit;
  const visibleRows = hasMore ? rows.slice(0, limit) : rows;
  const last = visibleRows.at(-1);

  return {
    items: visibleRows.map(toFeedCard),
    ...(hasMore && last
      ? { nextCursor: encodeCursor({ sortTime: last.sort_time, updatedAt: last.updated_at, snapshotId: last.snapshot_id }) }
      : {}),
  };
}

async function readSnapshotDetail(database, recipientUserId, snapshotId) {
  await assertSocialActivitySchemaReady(database);
  const normalizedSnapshotId = sanitizeIdentifier(snapshotId, 'snapshotId');
  const row = await database.prepare(`
    SELECT s.snapshot_id, s.snapshot_json, p.sharing_level, p.detailed_consent
    FROM social_activity_snapshots s
    INNER JOIN social_friend_permissions p
      ON p.owner_user_id = s.owner_user_id
     AND p.friend_user_id = s.recipient_user_id
    WHERE s.snapshot_id = ?1
      AND s.recipient_user_id = ?2
      AND s.state = 'active'
      AND EXISTS (
        SELECT 1 FROM social_friendships f
        WHERE f.status = 'active'
          AND ((f.user_a_id = s.owner_user_id AND f.user_b_id = ?2)
            OR (f.user_b_id = s.owner_user_id AND f.user_a_id = ?2))
      )
    LIMIT 1
  `).bind(normalizedSnapshotId, recipientUserId).first();

  if (!row) {
    throw new SocialActivitySnapshotsError(404, 'SOCIAL_ACTIVITY_NOT_FOUND', 'Activité partagée introuvable.');
  }
  return snapshotForCurrentPermission(row);
}

function errorResponse(error) {
  if (isSocialActivitySnapshotsError(error)) {
    return jsonResponse(error.status, { status: 'error', code: error.code, message: error.message });
  }
  return jsonResponse(503, {
    status: 'error',
    code: 'SOCIAL_ACTIVITY_SERVER_ERROR',
    message: 'Service social indisponible.',
  });
}

export async function handleSocialActivitySnapshotReadinessRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    await authenticateRequest(request, env, context.fetcher ?? fetch);
    const database = readDatabase(env);
    const readiness = await inspectSocialActivitySchema(database);
    return jsonResponse(200, readiness);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialActivitySnapshotSyncRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;
    const actor = await authenticateRequest(request, env, context.fetcher ?? fetch);
    const database = readDatabase(env);
    const body = await readJsonBody(request);
    const result = await persistSnapshotMutation(database, actor.subject, body);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialActivityFeedRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const actor = await authenticateRequest(request, env, context.fetcher ?? fetch);
    const database = readDatabase(env);
    const result = await listFeed(database, actor.subject, new URL(request.url));
    return jsonResponse(200, { status: 'found', ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialActivitySnapshotDetailRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const actor = await authenticateRequest(request, env, context.fetcher ?? fetch);
    const database = readDatabase(env);
    const url = new URL(request.url);
    const snapshot = await readSnapshotDetail(database, actor.subject, url.searchParams.get('snapshotId'));
    return jsonResponse(200, { status: 'found', snapshot });
  } catch (error) {
    return errorResponse(error);
  }
}

export const socialActivitySnapshotsInternals = {
  authenticateRequest,
  normalizeSnapshot,
  persistSnapshotMutation,
  listFeed,
  readSnapshotDetail,
  inspectSocialActivitySchema,
  assertSocialActivitySchemaReady,
  encodeCursor,
  decodeCursor,
  redactSnapshotToSummary,
  snapshotForCurrentPermission,
};
