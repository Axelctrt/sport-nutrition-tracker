import {
  DEFAULT_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION,
  sanitizeSocialActivityPermissionFieldSelection,
  serializeSocialActivityPermissionFieldSelection,
  socialActivityPermissionFieldSelectionFromStored,
} from './socialActivityFieldSelection.js';
import { socialActivitySnapshotsInternals } from './socialActivitySnapshots.js';

class SocialFriendsError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SocialFriendsError';
    this.status = status;
    this.code = code;
  }
}

const FRIENDSHIP_STATUSES = new Set(['active', 'removed']);
const SHARING_LEVELS = new Set(['none', 'summary', 'detailed']);
const DETAILED_CONSENT_STATUSES = new Set(['notRequested', 'granted']);
const MAX_JSON_BYTES = 32_768;

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
      'access-control-allow-headers': 'authorization,content-type',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
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
      'access-control-allow-headers': 'authorization,content-type',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
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

function createFriendshipId(userAId, userBId) {
  if (userAId === userBId) {
    throw new SocialFriendsError(403, 'SOCIAL_FRIENDS_SELF_FRIENDSHIP', 'Impossible de modifier une amitié vers soi-même.');
  }
  const [first, second] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  return `cloud-friendship:${first}<->${second}`;
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
  return sharingLevel === 'detailed' ? detailedConsent : 'notRequested';
}

function readDatabase(env = {}) {
  const database = env.SOCIAL_DIRECTORY_DB;
  if (!database || typeof database.prepare !== 'function') {
    throw new SocialFriendsError(503, 'SOCIAL_FRIENDS_NOT_CONFIGURED', 'Permissions sociales serveur non configurées : binding D1 SOCIAL_DIRECTORY_DB manquant.');
  }
  return database;
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
  permission.fieldSelection = socialActivityPermissionFieldSelectionFromStored(row.field_selection_json);
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
    handle: 'sportpilot-friend',
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

  const result = await database.prepare(`
    SELECT id, owner_user_id, friend_user_id, friend_handle, sharing_level, detailed_consent, detailed_consent_granted_at, field_selection_json, created_at, updated_at
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

  const expectedPermissionId = `cloud-friend-permission:${ownerUserId}->${friendUserId}`;
  const id = sanitizePermissionId(permission.id ?? expectedPermissionId);
  if (id !== expectedPermissionId) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_PERMISSION_ID_MISMATCH', 'Identifiant de permission incohérent.');
  }
  const requestedFriendHandle = normalizeHandle(permission.friendHandle);
  const sharingLevel = sanitizeSharingLevel(permission.sharingLevel);
  const detailedConsent = sanitizeDetailedConsent(permission.detailedConsent, sharingLevel);
  const timestamp = nowIso();
  const detailedConsentGrantedAt = sharingLevel === 'detailed'
    ? timestamp
    : undefined;


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

  const friendProfile = await database.prepare(`
    SELECT handle
    FROM social_directory_handles
    WHERE owner_user_id = ?1
    ORDER BY updated_at DESC
    LIMIT 1
  `).bind(friendUserId).first();
  const friendHandle = normalizeHandle(friendProfile?.handle ?? requestedFriendHandle);
  if (!friendHandle) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_HANDLE', 'Identifiant social de l’ami invalide.');
  }

  const existing = await database.prepare(`
    SELECT id, created_at, field_selection_json
    FROM social_friend_permissions
    WHERE owner_user_id = ?1 AND friend_user_id = ?2
    LIMIT 1
  `).bind(ownerUserId, friendUserId).first();

  const fieldSelection = permission.fieldSelection === undefined
    ? (existing
        ? socialActivityPermissionFieldSelectionFromStored(existing.field_selection_json)
        : {
            common: [...DEFAULT_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION.common],
            cardio: [...DEFAULT_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION.cardio],
            strength: [...DEFAULT_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION.strength],
          })
    : sanitizeSocialActivityPermissionFieldSelection(permission.fieldSelection);
  if (!fieldSelection) {
    throw new SocialFriendsError(
      400,
      'SOCIAL_FRIENDS_INVALID_FIELD_SELECTION',
      'Sélection des champs partagés invalide.',
    );
  }
  const fieldSelectionJson = serializeSocialActivityPermissionFieldSelection(fieldSelection);

  if (existing) {
    await database.prepare(`
      UPDATE social_friend_permissions
      SET id = ?3,
          friend_handle = ?4,
          sharing_level = ?5,
          detailed_consent = ?6,
          detailed_consent_granted_at = ?7,
          field_selection_json = ?8,
          updated_at = ?9
      WHERE owner_user_id = ?1 AND friend_user_id = ?2
    `).bind(
      ownerUserId,
      friendUserId,
      id,
      friendHandle,
      sharingLevel,
      detailedConsent,
      detailedConsentGrantedAt ?? null,
      fieldSelectionJson,
      timestamp,
    ).run();
  } else {
    await database.prepare(`
      INSERT INTO social_friend_permissions(
        id, owner_user_id, friend_user_id, friend_handle, sharing_level,
        detailed_consent, detailed_consent_granted_at, field_selection_json,
        created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)
    `).bind(
      id,
      ownerUserId,
      friendUserId,
      friendHandle,
      sharingLevel,
      detailedConsent,
      detailedConsentGrantedAt ?? null,
      fieldSelectionJson,
      timestamp,
    ).run();
  }

  const saved = await database.prepare(`
    SELECT id, owner_user_id, friend_user_id, friend_handle, sharing_level, detailed_consent, detailed_consent_granted_at, field_selection_json, created_at, updated_at
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

async function removeFriendship(database, payload) {
  const userId = sanitizeUserId(payload?.userId ?? payload?.ownerUserId, 'userId');
  const friendUserId = sanitizeUserId(payload?.friendUserId, 'friendUserId');
  const expectedFriendshipId = createFriendshipId(userId, friendUserId);
  const friendshipId = sanitizeFriendshipId(payload?.friendshipId ?? expectedFriendshipId);
  if (friendshipId !== expectedFriendshipId) {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_FRIENDSHIP_ID_MISMATCH', 'Identifiant d’amitié incohérent.');
  }
  const timestamp = nowIso();


  const friendship = await database.prepare(`
    SELECT id, user_a_id, user_b_id, status, created_at, updated_at
    FROM social_friendships
    WHERE id = ?1
      AND (user_a_id = ?2 OR user_b_id = ?2)
    LIMIT 1
  `).bind(friendshipId, userId).first();

  if (!friendship) {
    return {
      status: 404,
      payload: {
        status: 'notFound',
        code: 'SOCIAL_FRIENDS_FRIENDSHIP_NOT_FOUND',
        message: 'Amitié serveur introuvable pour ce compte.',
      },
    };
  }

  const actualFriendUserId = friendship.user_a_id === userId ? friendship.user_b_id : friendship.user_a_id;
  if (actualFriendUserId !== friendUserId) {
    return {
      status: 403,
      payload: {
        status: 'forbidden',
        code: 'SOCIAL_FRIENDS_REMOVE_MISMATCH',
        message: 'Suppression refusée : cette amitié ne cible pas cet ami.',
      },
    };
  }

  await database.prepare(`
    UPDATE social_friendships
    SET status = 'removed', updated_at = ?2
    WHERE id = ?1
  `).bind(friendship.id, timestamp).run();

  await database.prepare(`
    DELETE FROM social_friend_permissions
    WHERE (owner_user_id = ?1 AND friend_user_id = ?2)
       OR (owner_user_id = ?2 AND friend_user_id = ?1)
  `).bind(userId, friendUserId).run();

  const removed = await database.prepare(`
    SELECT id, user_a_id, user_b_id, status, created_at, updated_at
    FROM social_friendships
    WHERE id = ?1
    LIMIT 1
  `).bind(friendship.id).first();

  return {
    status: 200,
    payload: {
      status: 'updated',
      message: 'Ami supprimé. Les permissions associées ont été retirées.',
      friendship: friendshipFromRow(removed),
    },
  };
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_JSON_BYTES) {
    throw new SocialFriendsError(413, 'SOCIAL_FRIENDS_PAYLOAD_TOO_LARGE', 'Corps JSON trop volumineux.');
  }
  let raw;
  try {
    raw = await request.text();
  } catch {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_JSON', 'Corps JSON invalide.');
  }
  if (new TextEncoder().encode(raw).byteLength > MAX_JSON_BYTES) {
    throw new SocialFriendsError(413, 'SOCIAL_FRIENDS_PAYLOAD_TOO_LARGE', 'Corps JSON trop volumineux.');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new SocialFriendsError(400, 'SOCIAL_FRIENDS_INVALID_JSON', 'Corps JSON invalide.');
  }
}

function assertActorMatches(actorUserId, claimedUserId) {
  const actor = sanitizeUserId(actorUserId, 'actorUserId');
  const claimed = sanitizeUserId(claimedUserId, 'userId');
  if (actor !== claimed) {
    throw new SocialFriendsError(403, 'SOCIAL_FRIENDS_ACTOR_MISMATCH', 'Accès refusé pour ce compte.');
  }
  return actor;
}

function errorResponse(error) {
  if (isSocialFriendsError(error)) {
    const status = error.status === 400
      ? 'invalidRequest'
      : error.status === 403
        ? 'forbidden'
        : 'unavailable';
    return jsonResponse(error.status, { status, code: error.code, message: error.message });
  }

  return jsonResponse(503, {
    status: 'unavailable',
    code: 'SOCIAL_FRIENDS_ERROR',
    message: 'Permissions sociales serveur indisponibles.',
  });
}

export async function handleSocialFriendsFriendshipsRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const actor = await socialActivitySnapshotsInternals.authenticateRequest(
      request, env, context.fetcher ?? fetch,
    );
    const database = readDatabase(env);
    const url = new URL(request.url);
    const userId = assertActorMatches(actor.subject, url.searchParams.get('userId'));
    const result = await listFriendships(database, userId);
    return jsonResponse(200, { status: 'found', message: 'Amitiés serveur synchronisées.', ...result });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendsPermissionsRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const actor = await socialActivitySnapshotsInternals.authenticateRequest(
      request, env, context.fetcher ?? fetch,
    );
    const database = readDatabase(env);
    const url = new URL(request.url);
    const userId = assertActorMatches(actor.subject, url.searchParams.get('userId'));
    const permissions = await listPermissions(database, userId);
    return jsonResponse(200, { status: 'found', message: 'Permissions ami serveur synchronisées.', permissions });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendsPermissionSaveRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;
    const actor = await socialActivitySnapshotsInternals.authenticateRequest(
      request, env, context.fetcher ?? fetch,
    );
    const database = readDatabase(env);
    const payload = await readJsonBody(request);
    assertActorMatches(actor.subject, payload?.ownerUserId ?? payload?.userId);
    const result = await savePermission(database, payload);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendsRemoveRequest(request, env = {}, context = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;
    const actor = await socialActivitySnapshotsInternals.authenticateRequest(
      request, env, context.fetcher ?? fetch,
    );
    const database = readDatabase(env);
    const payload = await readJsonBody(request);
    assertActorMatches(actor.subject, payload?.userId ?? payload?.ownerUserId);
    const result = await removeFriendship(database, payload);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export const socialFriendsInternals = {
  listFriendships,
  listPermissions,
  savePermission,
  removeFriendship,
  assertActorMatches,
};
