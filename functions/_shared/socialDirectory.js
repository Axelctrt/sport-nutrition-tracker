class SocialDirectoryError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SocialDirectoryError';
    this.status = status;
    this.code = code;
  }
}

const HANDLE_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/u;
const RESERVED_HANDLES = new Set([
  'admin',
  'administrator',
  'api',
  'root',
  'security',
  'sportpilot',
  'support',
  'system',
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
      'access-control-allow-headers': 'content-type',
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
        'access-control-allow-headers': 'content-type',
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
  const displayName = typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
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

async function ensureDirectorySchema(database) {
  await database.prepare(`
    CREATE TABLE IF NOT EXISTS social_directory_handles (
      handle TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      owner_display_name TEXT NOT NULL,
      reserved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_social_directory_handles_owner
    ON social_directory_handles(owner_user_id)
  `).run();
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

async function reserveSocialHandle(database, payload) {
  const handle = normalizeHandle(payload?.handle);
  const ownerUserId = sanitizeUserId(payload?.userId);
  const ownerDisplayName = sanitizeDisplayName(payload?.displayName);
  const timestamp = nowIso();

  await ensureDirectorySchema(database);
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

  await deletePreviousReservations(database, ownerUserId, handle);

  if (existing) {
    await database.prepare(`
      UPDATE social_directory_handles
      SET owner_display_name = ?2, updated_at = ?3
      WHERE handle = ?1
    `).bind(handle, ownerDisplayName, timestamp).run();

    const updated = await readReservation(database, handle);
    return {
      status: 200,
      payload: {
        status: 'alreadyExists',
        message: 'Identifiant déjà réservé par ce compte SportPilot.',
        profile: profileFromRow(updated),
      },
    };
  }

  await database.prepare(`
    INSERT INTO social_directory_handles(handle, owner_user_id, owner_display_name, reserved_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?4)
  `).bind(handle, ownerUserId, ownerDisplayName, timestamp).run();

  const created = await readReservation(database, handle);
  return {
    status: 201,
    payload: {
      status: 'created',
      message: 'Identifiant social réservé dans l’annuaire serveur.',
      profile: profileFromRow(created),
    },
  };
}

async function lookupSocialHandle(database, rawHandle) {
  const handle = normalizeHandle(rawHandle);
  await ensureDirectorySchema(database);

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
  try {
    return await request.json();
  } catch {
    throw new SocialDirectoryError(400, 'SOCIAL_DIRECTORY_INVALID_JSON', 'Corps JSON invalide.');
  }
}

export async function handleSocialDirectoryReserveRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;

    const database = readDirectoryDatabase(env);
    const payload = await readJsonBody(request);
    const result = await reserveSocialHandle(database, payload);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    if (isDirectoryError(error)) {
      return jsonResponse(error.status, { status: error.status === 400 ? 'invalidHandle' : 'unavailable', code: error.code, message: error.message });
    }

    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    return jsonResponse(503, { status: 'unavailable', code: 'SOCIAL_DIRECTORY_ERROR', message: `Annuaire social serveur indisponible : ${message}` });
  }
}

export async function handleSocialDirectoryLookupRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;

    const database = readDirectoryDatabase(env);
    const url = new URL(request.url);
    const result = await lookupSocialHandle(database, url.searchParams.get('handle'));
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    if (isDirectoryError(error)) {
      return jsonResponse(error.status, { status: error.status === 400 ? 'invalidHandle' : 'unavailable', code: error.code, message: error.message });
    }

    const message = error instanceof Error ? error.message : 'Erreur inconnue.';
    return jsonResponse(503, { status: 'unavailable', code: 'SOCIAL_DIRECTORY_ERROR', message: `Annuaire social serveur indisponible : ${message}` });
  }
}

export const socialDirectoryInternals = {
  normalizeHandle,
  reserveSocialHandle,
  lookupSocialHandle,
  profileFromRow,
};
