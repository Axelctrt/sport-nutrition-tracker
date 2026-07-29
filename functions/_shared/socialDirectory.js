import { socialActivitySnapshotsInternals } from './socialActivitySnapshots.js';

class SocialDirectoryError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SocialDirectoryError';
    this.status = status;
    this.code = code;
  }
}

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,23}$/u;
const MAX_JSON_BYTES = 32_768;

const RESERVED_HANDLES = new Set([
  'admin',
  'administrator',
  'api',
  'me',
  'moderator',
  'null',
  'root',
  'security',
  'sportpilot',
  'support',
  'system',
  'undefined',
]);

function isDirectoryError(error) {
  return Boolean(error && typeof error === 'object' && 'status' in error && 'code' in error);
}

function jsonResponse(status, payload, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
      ...extraHeaders,
    },
  });
}

function nowIso() {
  return new Date().toISOString();
}

function assertMethod(request, expected) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      },
    });
  }

  if (request.method !== expected) {
    throw new SocialDirectoryError(405, 'SOCIAL_DIRECTORY_METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
  }

  return undefined;
}

function normalizeHandle(rawHandle) {
  const raw = typeof rawHandle === 'string' ? rawHandle.trim() : '';
  const withoutPrefix = raw.startsWith('@') ? raw.slice(1) : raw;

  if (withoutPrefix !== withoutPrefix.toLowerCase()) {
    throw new SocialDirectoryError(400, 'SOCIAL_DIRECTORY_INVALID_HANDLE', 'Identifiant invalide : utilise uniquement des minuscules, chiffres, points, tirets ou underscores.');
  }

  const handle = withoutPrefix.toLowerCase();
  if (!HANDLE_PATTERN.test(handle) || RESERVED_HANDLES.has(handle)) {
    throw new SocialDirectoryError(400, 'SOCIAL_DIRECTORY_INVALID_HANDLE', 'Identifiant invalide : vérifie le format avant la recherche.');
  }

  return handle;
}

function sanitizeDisplayName(value) {
  const displayName = typeof value === 'string'
    ? value.normalize('NFKC').replace(/[\p{Cc}\p{Cf}]/gu, '').trim().replace(/\s+/gu, ' ')
    : '';
  return displayName.length > 0 ? displayName.slice(0, 80) : 'SportPilot';
}

function sanitizeUserId(value) {
  const userId = typeof value === 'string' ? value.trim() : '';
  if (userId.length < 3 || userId.length > 160) {
    throw new SocialDirectoryError(400, 'SOCIAL_DIRECTORY_INVALID_USER', 'Compte SportPilot invalide pour la réservation.');
  }

  return userId;
}

function readDirectoryDatabase(env = {}) {
  const database = env.SOCIAL_DIRECTORY_DB;
  if (!database || typeof database.prepare !== 'function') {
    throw new SocialDirectoryError(503, 'SOCIAL_DIRECTORY_NOT_CONFIGURED', 'Annuaire social serveur non configuré : binding D1 SOCIAL_DIRECTORY_DB manquant.');
  }

  return database;
}

function profileFromRow(row) {
  return {
    userId: row.owner_user_id,
    handle: row.handle,
    displayName: row.owner_display_name,
    createdAt: row.reserved_at,
    updatedAt: row.updated_at,
  };
}

async function readReservation(database, handle) {
  return database.prepare(`
    SELECT handle, owner_user_id, owner_display_name, reserved_at, updated_at
    FROM social_directory_handles
    WHERE handle = ?1
    LIMIT 1
  `).bind(handle).first();
}

async function deletePreviousReservations(database, ownerUserId, nextHandle) {
  await database.prepare(`
    DELETE FROM social_directory_handles
    WHERE owner_user_id = ?1 AND handle <> ?2
  `).bind(ownerUserId, nextHandle).run();
}

async function reserveSocialHandle(database, payload, actorUserId) {
  const handle = normalizeHandle(payload?.handle);
  const claimedUserId = sanitizeUserId(payload?.userId);
  const ownerUserId = sanitizeUserId(actorUserId);
  if (claimedUserId !== ownerUserId) {
    throw new SocialDirectoryError(403, 'SOCIAL_DIRECTORY_ACTOR_MISMATCH', 'Réservation refusée pour ce compte.');
  }
  const ownerDisplayName = sanitizeDisplayName(payload?.displayName);
  const timestamp = nowIso();

  const existing = await readReservation(database, handle);

  if (existing && existing.owner_user_id !== ownerUserId) {
    return {
      status: 409,
      payload: {
        status: 'conflict',
        code: 'SOCIAL_DIRECTORY_HANDLE_TAKEN',
        message: 'Identifiant déjà réservé par un autre compte SportPilot.',
      },
    };
  }

  const wasAlreadyOwned = Boolean(existing);

  if (!existing) {
    await database.prepare(`
      INSERT OR IGNORE INTO social_directory_handles(
        handle, owner_user_id, owner_display_name, reserved_at, updated_at
      )
      VALUES (?1, ?2, ?3, ?4, ?4)
    `).bind(handle, ownerUserId, ownerDisplayName, timestamp).run();

    const claimed = await readReservation(database, handle);
    if (!claimed || claimed.owner_user_id !== ownerUserId) {
      return {
        status: 409,
        payload: {
          status: 'conflict',
          code: 'SOCIAL_DIRECTORY_HANDLE_TAKEN',
          message: 'Identifiant déjà réservé par un autre compte SportPilot.',
        },
      };
    }
  }

  await database.prepare(`
    UPDATE social_directory_handles
    SET owner_display_name = ?2, updated_at = ?3
    WHERE handle = ?1 AND owner_user_id = ?4
  `).bind(handle, ownerDisplayName, timestamp, ownerUserId).run();

  // L’ancien handle n’est libéré qu’après confirmation de la nouvelle réservation.
  await deletePreviousReservations(database, ownerUserId, handle);

  const reserved = await readReservation(database, handle);
  return {
    status: wasAlreadyOwned ? 200 : 201,
    payload: {
      status: wasAlreadyOwned ? 'alreadyExists' : 'created',
      message: wasAlreadyOwned
        ? 'Identifiant déjà réservé par ce compte SportPilot.'
        : 'Identifiant social réservé dans l’annuaire serveur.',
      profile: profileFromRow(reserved),
    },
  };
}

async function lookupSocialHandle(database, rawHandle) {
  const handle = normalizeHandle(rawHandle);
  const row = await readReservation(database, handle);
  if (!row) {
    return {
      status: 404,
      payload: {
        status: 'notFound',
        message: 'Identifiant inexistant.',
      },
    };
  }

  return {
    status: 200,
    payload: {
      status: 'found',
      message: `Identifiant trouvé : ${row.owner_display_name}.`,
      profile: profileFromRow(row),
    },
  };
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    throw new SocialDirectoryError(413, 'SOCIAL_DIRECTORY_PAYLOAD_TOO_LARGE', 'Corps JSON trop volumineux.');
  }
  let raw;
  try {
    raw = await request.text();
  } catch {
    throw new SocialDirectoryError(400, 'SOCIAL_DIRECTORY_INVALID_JSON', 'Corps JSON invalide.');
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) {
    throw new SocialDirectoryError(413, 'SOCIAL_DIRECTORY_PAYLOAD_TOO_LARGE', 'Corps JSON trop volumineux.');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new SocialDirectoryError(400, 'SOCIAL_DIRECTORY_INVALID_JSON', 'Corps JSON invalide.');
  }
}

function directoryErrorResponse(error) {
  if (isDirectoryError(error)) {
    const status = error.status === 400
      ? 'invalidHandle'
      : error.status === 403
        ? 'forbidden'
        : 'unavailable';
    return jsonResponse(error.status, { status, code: error.code, message: error.message });
  }
  return jsonResponse(503, {
    status: 'unavailable',
    code: 'SOCIAL_DIRECTORY_ERROR',
    message: 'Annuaire social serveur indisponible.',
  });
}

export async function handleSocialDirectoryReserveRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;

    const actor = await socialActivitySnapshotsInternals.authenticateRequest(
      request,
      env,
      context.fetcher ?? fetch,
    );
    const database = readDirectoryDatabase(env);
    const payload = await readJsonBody(request);
    const result = await reserveSocialHandle(database, payload, actor.subject);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return directoryErrorResponse(error);
  }
}

export async function handleSocialDirectoryLookupRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;

    await socialActivitySnapshotsInternals.authenticateRequest(
      request,
      env,
      context.fetcher ?? fetch,
    );
    const database = readDirectoryDatabase(env);
    const url = new URL(request.url);
    const result = await lookupSocialHandle(database, url.searchParams.get('handle'));
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return directoryErrorResponse(error);
  }
}

export const socialDirectoryInternals = {
  normalizeHandle,
  reserveSocialHandle,
  lookupSocialHandle,
  profileFromRow,
};
