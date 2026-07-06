class SocialFriendRequestsError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'SocialFriendRequestsError';
    this.status = status;
    this.code = code;
  }
}

const REQUEST_STATUSES = new Set(['pending', 'accepted', 'declined', 'cancelled']);

function isFriendRequestsError(error) {
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
    throw new SocialFriendRequestsError(405, 'SOCIAL_FRIEND_REQUESTS_METHOD_NOT_ALLOWED', 'Méthode non autorisée.');
  }
  return undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function sanitizeUserId(value, fieldName = 'userId') {
  const userId = typeof value === 'string' ? value.trim() : '';
  if (userId.length < 3 || userId.length > 160) {
    throw new SocialFriendRequestsError(400, 'SOCIAL_FRIEND_REQUESTS_INVALID_USER', `Compte SportPilot invalide pour ${fieldName}.`);
  }
  return userId;
}

function sanitizeRequestId(value) {
  const requestId = typeof value === 'string' ? value.trim() : '';
  if (!requestId.startsWith('friend-request:') || requestId.length > 360) {
    throw new SocialFriendRequestsError(400, 'SOCIAL_FRIEND_REQUESTS_INVALID_REQUEST', 'Demande SportPilot invalide.');
  }
  return requestId;
}

function sanitizeStatus(value) {
  const status = typeof value === 'string' ? value.trim() : '';
  if (!REQUEST_STATUSES.has(status)) {
    throw new SocialFriendRequestsError(400, 'SOCIAL_FRIEND_REQUESTS_INVALID_STATUS', 'Statut de demande invalide.');
  }
  return status;
}

function createRequestId(requesterUserId, recipientUserId) {
  return `friend-request:${requesterUserId}->${recipientUserId}`;
}

function createFriendshipId(userAId, userBId) {
  if (userAId === userBId) {
    throw new SocialFriendRequestsError(403, 'SOCIAL_FRIEND_REQUESTS_SELF', 'Impossible de créer une amitié avec soi-même.');
  }
  const [first, second] = userAId < userBId ? [userAId, userBId] : [userBId, userAId];
  return `cloud-friendship:${first}<->${second}`;
}

function readDatabase(env = {}) {
  const database = env.SOCIAL_DIRECTORY_DB;
  if (!database || typeof database.prepare !== 'function') {
    throw new SocialFriendRequestsError(503, 'SOCIAL_FRIEND_REQUESTS_NOT_CONFIGURED', 'Demandes sociales serveur non configurées : binding D1 SOCIAL_DIRECTORY_DB manquant.');
  }
  return database;
}

async function ensureFriendRequestsSchema(database) {
  await database.prepare(`
    CREATE TABLE IF NOT EXISTS social_friend_requests (
      id TEXT PRIMARY KEY,
      requester_user_id TEXT NOT NULL,
      recipient_user_id TEXT NOT NULL,
      status TEXT NOT NULL,
      requested_at TEXT NOT NULL,
      responded_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `).run();

  await database.prepare(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_social_friend_requests_pair
    ON social_friend_requests(requester_user_id, recipient_user_id)
  `).run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_social_friend_requests_recipient
    ON social_friend_requests(recipient_user_id, status, requested_at)
  `).run();

  await database.prepare(`
    CREATE INDEX IF NOT EXISTS idx_social_friend_requests_requester
    ON social_friend_requests(requester_user_id, status, requested_at)
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
}

function requestFromRow(row) {
  const request = {
    id: row.id,
    requesterUserId: row.requester_user_id,
    recipientUserId: row.recipient_user_id,
    status: row.status,
    requestedAt: row.requested_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.responded_at) request.respondedAt = row.responded_at;
  return request;
}

async function readRequest(database, requestId) {
  return database.prepare(`
    SELECT id, requester_user_id, recipient_user_id, status, requested_at, responded_at, created_at, updated_at
    FROM social_friend_requests
    WHERE id = ?1
    LIMIT 1
  `).bind(requestId).first();
}

async function readActiveFriendship(database, userAId, userBId) {
  const id = createFriendshipId(userAId, userBId);
  return database.prepare(`
    SELECT id, user_a_id, user_b_id, status, created_at, updated_at
    FROM social_friendships
    WHERE id = ?1 AND status = 'active'
    LIMIT 1
  `).bind(id).first();
}

async function sendFriendRequest(database, payload) {
  const requesterUserId = sanitizeUserId(payload?.requesterUserId, 'requesterUserId');
  const recipientUserId = sanitizeUserId(payload?.recipientUserId, 'recipientUserId');
  if (requesterUserId === recipientUserId) {
    return {
      status: 403,
      payload: {
        status: 'forbidden',
        code: 'SOCIAL_FRIEND_REQUESTS_SELF',
        message: 'Impossible de t’envoyer une demande à toi-même.',
      },
    };
  }

  await ensureFriendRequestsSchema(database);
  const existingFriendship = await readActiveFriendship(database, requesterUserId, recipientUserId);
  if (existingFriendship) {
    return {
      status: 409,
      payload: {
        status: 'conflict',
        code: 'SOCIAL_FRIEND_REQUESTS_ALREADY_FRIENDS',
        message: 'Ces deux comptes sont déjà amis.',
      },
    };
  }

  const id = createRequestId(requesterUserId, recipientUserId);
  const existing = await readRequest(database, id);
  if (existing?.status === 'pending') {
    return {
      status: 200,
      payload: {
        status: 'alreadyExists',
        message: 'Une demande cloud est déjà en attente pour cet utilisateur.',
        request: requestFromRow(existing),
      },
    };
  }

  if (existing && ['accepted', 'declined', 'cancelled'].includes(existing.status)) {
    return {
      status: 409,
      payload: {
        status: 'conflict',
        code: 'SOCIAL_FRIEND_REQUESTS_TERMINAL_EXISTS',
        message: 'Une ancienne demande cloud existe déjà pour cette relation userId.',
        request: requestFromRow(existing),
      },
    };
  }

  const requestedAt = typeof payload?.requestedAt === 'string' ? payload.requestedAt : nowIso();
  const createdAt = typeof payload?.createdAt === 'string' ? payload.createdAt : requestedAt;
  const updatedAt = nowIso();

  await database.prepare(`
    INSERT INTO social_friend_requests(id, requester_user_id, recipient_user_id, status, requested_at, created_at, updated_at)
    VALUES (?1, ?2, ?3, 'pending', ?4, ?5, ?6)
  `).bind(id, requesterUserId, recipientUserId, requestedAt, createdAt, updatedAt).run();

  const created = await readRequest(database, id);
  return {
    status: 201,
    payload: {
      status: 'created',
      message: 'Demande d’ami cloud envoyée. Elle devra être acceptée avant toute relation.',
      request: requestFromRow(created),
    },
  };
}

async function listRequests(database, userId, direction) {
  const field = direction === 'incoming' ? 'recipient_user_id' : 'requester_user_id';
  await ensureFriendRequestsSchema(database);
  const result = await database.prepare(`
    SELECT id, requester_user_id, recipient_user_id, status, requested_at, responded_at, created_at, updated_at
    FROM social_friend_requests
    WHERE ${field} = ?1
    ORDER BY requested_at DESC
    LIMIT 100
  `).bind(userId).all();

  return Array.isArray(result?.results) ? result.results.map(requestFromRow) : [];
}

async function upsertFriendshipForAcceptedRequest(database, request, timestamp) {
  const friendshipId = createFriendshipId(request.requester_user_id, request.recipient_user_id);
  const [userAId, userBId] = request.requester_user_id < request.recipient_user_id
    ? [request.requester_user_id, request.recipient_user_id]
    : [request.recipient_user_id, request.requester_user_id];
  const existing = await database.prepare(`
    SELECT id, created_at
    FROM social_friendships
    WHERE id = ?1
    LIMIT 1
  `).bind(friendshipId).first();

  if (existing) {
    await database.prepare(`
      UPDATE social_friendships
      SET status = 'active', updated_at = ?2
      WHERE id = ?1
    `).bind(friendshipId, timestamp).run();
    return;
  }

  await database.prepare(`
    INSERT INTO social_friendships(id, user_a_id, user_b_id, status, created_at, updated_at)
    VALUES (?1, ?2, ?3, 'active', ?4, ?4)
  `).bind(friendshipId, userAId, userBId, timestamp).run();
}

async function updateFriendRequestStatus(database, payload) {
  const requestId = sanitizeRequestId(payload?.requestId);
  const status = sanitizeStatus(payload?.status);
  const respondedAt = typeof payload?.respondedAt === 'string' ? payload.respondedAt : nowIso();
  await ensureFriendRequestsSchema(database);

  const existing = await readRequest(database, requestId);
  if (!existing) {
    return {
      status: 404,
      payload: {
        status: 'notFound',
        code: 'SOCIAL_FRIEND_REQUESTS_NOT_FOUND',
        message: 'Demande cloud introuvable.',
      },
    };
  }

  await database.prepare(`
    UPDATE social_friend_requests
    SET status = ?2, responded_at = ?3, updated_at = ?3
    WHERE id = ?1
  `).bind(requestId, status, respondedAt).run();

  const updated = await readRequest(database, requestId);
  if (status === 'accepted') {
    await upsertFriendshipForAcceptedRequest(database, updated, respondedAt);
  }

  return {
    status: 200,
    payload: {
      status: 'updated',
      message: `Demande cloud ${status}.`,
      request: requestFromRow(updated),
    },
  };
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new SocialFriendRequestsError(400, 'SOCIAL_FRIEND_REQUESTS_INVALID_JSON', 'Corps JSON invalide.');
  }
}

function errorResponse(error) {
  if (isFriendRequestsError(error)) {
    const status = error.status === 400 ? 'invalidRequest' : 'unavailable';
    return jsonResponse(error.status, { status, code: error.code, message: error.message });
  }

  const message = error instanceof Error ? error.message : 'Erreur inconnue.';
  return jsonResponse(503, {
    status: 'unavailable',
    code: 'SOCIAL_FRIEND_REQUESTS_ERROR',
    message: `Demandes sociales serveur indisponibles : ${message}`,
  });
}

export async function handleSocialFriendRequestSendRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;
    const database = readDatabase(env);
    const payload = await readJsonBody(request);
    const result = await sendFriendRequest(database, payload);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendRequestIncomingRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const database = readDatabase(env);
    const url = new URL(request.url);
    const userId = sanitizeUserId(url.searchParams.get('userId'), 'userId');
    const requests = await listRequests(database, userId, 'incoming');
    return jsonResponse(200, { status: 'found', message: 'Demandes entrantes synchronisées.', requests });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendRequestOutgoingRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'GET');
    if (methodResponse) return methodResponse;
    const database = readDatabase(env);
    const url = new URL(request.url);
    const userId = sanitizeUserId(url.searchParams.get('userId'), 'userId');
    const requests = await listRequests(database, userId, 'outgoing');
    return jsonResponse(200, { status: 'found', message: 'Demandes sortantes synchronisées.', requests });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleSocialFriendRequestUpdateStatusRequest(request, env = {}) {
  try {
    const methodResponse = assertMethod(request, 'POST');
    if (methodResponse) return methodResponse;
    const database = readDatabase(env);
    const payload = await readJsonBody(request);
    const result = await updateFriendRequestStatus(database, payload);
    return jsonResponse(result.status, result.payload);
  } catch (error) {
    return errorResponse(error);
  }
}

export const socialFriendRequestsInternals = {
  createRequestId,
  sendFriendRequest,
  listRequests,
  updateFriendRequestStatus,
};
