class SocialFriendsError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SocialFriendsError';
    this.status = status;
    this.code = code;
  }
}

const FRIENDSHIP_STATUSES = new Set(['active', 'removed']);
const SHARING_LEVELS = new Set(['summary', 'detailed']);
const DETAILED_CONSENT_STATUSES = new Set(['notRequested', 'granted']);

function isSocialFriendsError(error) {
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

function optionsResponse() {
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

function assertMethod(request, expected) {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== expected) {
    throw new SocialFriendsError(405, 'SOCIAL_FRIENDS_METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
  }
  return undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeUserId(value, fieldName = 'userId') {
  const userId = typeof value === 'string' ? value.trim() : '';
  if (userId.length < 3 || userId.length > 160) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_USER', `Compte SportPilot invalide pour ${fieldName}.`);
  }
  return userId;
}

function sanitizeFriendshipId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id.startsWith('cloud-friendship:') || id.length > 360) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_FRIENDSHIP', 'Amitié SportPilot invalide.');
  }
  return id;
}

function sanitizePermissionId(value) {
  const id = typeof value === 'string' ? value.trim() : '';
  if (!id.startsWith('cloud-friend-permission:') || id.length > 360) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_PERMISSION', 'Permission SportPilot invalide.');
  }
  return id;
}

function normalizeHandle(value) {
  const handle = typeof value === 'string' ? value.trim().replace(/^@/u, '').toLowerCase() : '';
  return handle.replace(/[^a-z0-9._-]/gu, '').slice(0, 32);
}

function sanitizeSharingLevel(value) {
  const sharingLevel = typeof value === 'string' ? value.trim() : '';
  if (!SHARING_LEVELS.has(sharingLevel)) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_SHARING', 'Niveau de partage ami invalide.');
  }
  return sharingLevel;
}

function sanitizeDetailedConsent(value, sharingLevel) {
  const detailedConsent = typeof value === 'string' ? value.trim() : '';
  if (!DETAILED_CONSENT_STATUSES.has(detailedConsent)) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_CONSENT', 'Consentement détaillé invalide.');
  }
  if (sharingLevel === 'detailed' && detailedConsent !== 'granted') {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_CONSENT', 'Le détail nécessite un consentement explicite accordé.');
  }
  return sharingLevel === 'summary' ? 'notRequested' : detailedConsent;
}

function readDatabase(env = {}) {
  const database = env.SOCIAL_DIRECTORY_DB;
  if (!database || typeof database.prepare !== 'function') {
    throw new SocialFriendsError(503, 'SOCIAL_FRIENDS_NOT_CONFIGURED', 'Permissions sociales serveur non configurées : binding D1 SOCIAL_DIRECTORY_DB manquant.');
  }
  return database;
}

async function ensureSocialFriendsSchema(database) {
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

  await database.prepare(`
    CREATE TABLE IF NOT EXISTS social_friendships (
      id TEXT PRIMARY KEY,
      user_a_id TEXT NOT NULL,
      user_b_id TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_social_friendships_user_a
    ON social_friendships(user_a_id, status)
  `).run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_social_friendships_user_b
    ON social_friendships(user_b_id, status)
  `).run();

  await database.prepare(`
    CREATE TABLE IF NOT EXISTS social_friend_permissions (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL,
      friend_user_id TEXT NOT NULL,
      friend_handle TEXT NOT NULL,
      sharing_level TEXT NOT NULL,
      detailed_consent TEXT NOT NULL,
      detailed_consent_granted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await database.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_social_friend_permissions_owner_friend
    ON social_friend_permissions(owner_user_id, friend_user_id)
  `).run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_social_friend_permissions_owner
    ON social_friend_permissions(owner_user_id)
  `).run();
}

function friendshipFromRow(row) {
  return {
    id: row.id,
    userAId: row.user_a_id,
    userBId: row.user_b_id,
    status: FRIENDSHIP_STATUSES.has(row.status) ? row.status : 'removed',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function permissionFromRow(row) {
  const permission = {
    id: row.id,
    friendUserId: row.friend_user_id,
    friendHandle: row.friend_handle,
    sharingLevel: row.sharing_level,
    detailedConsent: row.detailed_consent,
  };
  if (row.detailed_consent_granted_at) permission.detailedConsentGrantedAt = row.detailed_consent_granted_at;
  return permission;
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

function fallbackProfile(userId, now) {
  return {
    userId,
    handle: userId.toLowerCase().replace(/[^a-z0-9._-]/gu, '').slice(0, 32) || 'sportpilot-friend',
    displayName: 'Ami SportPilot',
    createdAt: now,
    updatedAt: now,
  };
}

function counterpartUserId(friendship, userId) {
  if (friendship.user_a_id === userId) return friendship.user_b_id;
  if (friendship.user_b_id === userId) return friendship.user_a_id;
  return undefined;
}

async function readProfilesForFriendships(database, friendships, currentUserId) {
  const timestamp = nowIso();
  const profiles = [];
  const seen = new Set();

  for (const row of friendships) {
    const friendUserId = counterpartUserId(row, currentUserId);
    if (!friendUserId || seen.has(friendUserId)) continue;
    seen.add(friendUserId);

    const profileRow = await database.prepare(`
      SELECT handle, owner_user_id, owner_display_name, reserved_at, updated_at
      FROM social_directory_handles
      WHERE owner_user_id = ?1
      ORDER BY updated_at DESC
      LIMIT 1
    `).bind(friendUserId).first();

    profiles.push(profileRow ? profileFromRow(profileRow) : fallbackProfile(friendUserId, timestamp));
  }

  return profiles;
}

async function listFriendships(database, userId) {
  const currentUserId = sanitizeUserId(userId, 'userId');
  await ensureSocialFriendsSchema(database);

  const result = await database.prepare(`
    SELECT id, user_a_id, user_b_id, status, created_at, updated_at
    FROM social_friendships
    WHERE status = 'active' AND (user_a_id = ?1 OR user_b_id = ?1)
    ORDER BY updated_at DESC
    LIMIT 200
  `).bind(currentUserId).all();

  const rows = Array.isArray(result?.results) ? result.results : [];
  const friendships = rows.map(friendshipFromRow);
  const profiles = await readProfilesForFriendships(database, rows, currentUserId);

  return { friendships, profiles };
}

async function listPermissions(database, userId) {
  const ownerUserId = sanitizeUserId(userId, 'userId');
  await ensureSocialFriendsSchema(database);

  const result = await database.prepare(`
    SELECT id, owner_user_id, friend_user_id, friend_handle, sharing_level, detailed_consent, detailed_consent_granted_at, created_at, updated_at
    FROM social_friend_permissions
    WHERE owner_user_id = ?1
    ORDER BY updated_at DESC
    LIMIT 200
  `).bind(ownerUserId).all();

  const rows = Array.isArray(result?.results) ? result.results : [];
  return rows.map(permissionFromRow);
}

async function savePermission(database, payload) {
  const permission = payload && typeof payload === 'object' && payload.permission && typeof payload.permission === 'object'
    ? payload.permission
    : (payload ?? {});
  const ownerUserId = sanitizeUserId(payload?.ownerUserId ?? payload?.userId, 'ownerUserId');
  const friendUserId = sanitizeUserId(permission.friendUserId ?? payload?.friendUserId, 'friendUserId');
  if (ownerUserId === friendUserId) {
    return {
      status: 403,
      payload: {
        status: 'forbidden',
        code: 'SOCIAL_FRIENDS_SELF_PERMISSION',
        message: 'Impossible de créer une permission ami vers soi-même.',
      },
    };
  }

  const id = sanitizePermissionId(permission.id ?? `cloud-friend-permission:${ownerUserId}->${friendUserId}`);
  const friendHandle = normalizeHandle(permission.friendHandle);
  const sharingLevel = sanitizeSharingLevel(permission.sharingLevel);
  const detailedConsent = sanitizeDetailedConsent(permission.detailedConsent, sharingLevel);
  const detailedConsentGrantedAt = sharingLevel === 'detailed'
    ? (typeof permission.detailedConsentGrantedAt === 'string' ? permission.detailedConsentGrantedAt : nowIso())
    : undefined;
  const timestamp = nowIso();

  await ensureSocialFriendsSchema(database);

  const friendship = await database.prepare(`
    SELECT id
    FROM social_friendships
    WHERE status = 'active'
      AND ((user_a_id = ?1 AND user_b_id = ?2) OR (user_a_id = ?2 AND user_b_id = ?1))
    LIMIT 1
  `).bind(ownerUserId, friendUserId).first();

  if (!friendship) {
    return {
      status: 403,
      payload: {
        status: 'forbidden',
        code: 'SOCIAL_FRIENDS_PERMISSION_NOT_FRIENDS',
        message: 'Permission refusée : ces deux comptes ne sont pas amis actifs.',
      },
    };
  }

  const existing = await database.prepare(`
    SELECT id, created_at
    FROM social_friend_permissions
    WHERE owner_user_id = ?1 AND friend_user_id = ?2
    LIMIT 1
  `).bind(ownerUserId, friendUserId).first();

  if (existing) {
    await database.prepare(`
      UPDATE social_friend_permissions
      SET id = ?3,
          friend_handle = ?4,
          sharing_level = ?5,
          detailed_consent = ?6,
          detailed_consent_granted_at = ?7,
          updated_at = ?8
      WHERE owner_user_id = ?1 AND friend_user_id = ?2
    `).bind(ownerUserId, friendUserId, id, friendHandle, sharingLevel, detailedConsent, detailedConsentGrantedAt ?? null, timestamp).run();
  } else {
    await database.prepare(`
      INSERT INTO social_friend_permissions(id, owner_user_id, friend_user_id, friend_handle, sharing_level, detailed_consent, detailed_consent_granted_at, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
    `).bind(id, ownerUserId, friendUserId, friendHandle, sharingLevel, detailedConsent, detailedConsentGrantedAt ?? null, timestamp).run();
  }

  const saved = await database.prepare(`
    SELECT id, owner_user_id, friend_user_id, friend_handle, sharing_level, detailed_consent, detailed_consent_granted_at, created_at, updated_at
    FROM social_friend_permissions
    WHERE owner_user_id = ?1 AND friend_user_id = ?2
    LIMIT 1
  `).bind(ownerUserId, friendUserId).first();

  return {
    status: existing ? 200 : 201,
    payload: {
      status: existing ? 'updated' : 'created',
      message: existing ? 'Permission ami serveur mise à jour.' : 'Permission ami serveur créée.',
      permission: permissionFromRow(saved),
    },
  };
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_JSON', 'Corps JSON invalide.');
  }
}

function errorResponse(error) {
  if (isSocialFriendsError(error)) {
    const status = error.status === 400 ? 'invalidRequest' : 'unavailable';
    return jsonResponse(error.status, { status, code: error.code, message: error.message });
  }

  const message = error instanceof Error ? error.message : 'Erreur inconnue.';
  return jsonResponse(503, {
    status: 'unavailable',
    code: 'SOCIAL_FRIENDS_ERROR',
    message: `Permissions sociales serveur indisponibles : ${message}`,
  });
}

export async function handleSocialFriendsFriendshipsRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const database = readDatabase(env);
    const url = new URL(request.url);
    const result = await listFriendships(database, url.searchParams.get('userId'));
    return jsonResponse(200, { status: 'found', message: 'Amitiés serveur synchronisées.', ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendsPermissionsRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const database = readDatabase(env);
    const url = new URL(request.url);
    const permissions = await listPermissions(database, url.searchParams.get('userId'));
    return jsonResponse(200, { status: 'found', message: 'Permissions ami serveur synchronisées.', permissions });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendsPermissionSaveRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;
    const database = readDatabase(env);
    const payload = await readJsonBody(request);
    const result = await savePermission(database, payload);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export const socialFriendsInternals = {
  listFriendships,
  listPermissions,
  savePermission,
};
