import { socialActivitySnapshotsInternals } from './socialActivitySnapshots.js';

class AccountDataDeletionError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'AccountDataDeletionError';
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'DELETE,OPTIONS',
      'access-control-allow-headers': 'authorization,content-type',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    },
  });
}

function assertMethod(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'DELETE,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      },
    });
  }
  if (request.method !== 'DELETE') {
    throw new AccountDataDeletionError(
      405,
      'ACCOUNT_DATA_METHOD_NOT_ALLOWED',
      'Méthode non autorisée.',
    );
  }
  return undefined;
}

function readDatabase(env = {}) {
  const database = env.SOCIAL_DIRECTORY_DB;
  if (!database || typeof database.prepare !== 'function' || typeof database.batch !== 'function') {
    throw new AccountDataDeletionError(
      503,
      'ACCOUNT_DATA_DATABASE_NOT_CONFIGURED',
      'Suppression distante indisponible.',
    );
  }
  return database;
}

function deletedCount(results) {
  return results.reduce(
    (total, result) => total + Number(result?.meta?.changes ?? 0),
    0,
  );
}

async function deleteSocialAccountData(database, userId) {
  const statements = [
    database.prepare(`
      DELETE FROM social_activity_snapshots
      WHERE owner_user_id = ?1 OR recipient_user_id = ?1
    `).bind(userId),
    database.prepare(`
      DELETE FROM social_friend_permissions
      WHERE owner_user_id = ?1 OR friend_user_id = ?1
    `).bind(userId),
    database.prepare(`
      DELETE FROM social_friend_requests
      WHERE requester_user_id = ?1 OR recipient_user_id = ?1
    `).bind(userId),
    database.prepare(`
      DELETE FROM social_friendships
      WHERE user_a_id = ?1 OR user_b_id = ?1
    `).bind(userId),
    database.prepare(`
      DELETE FROM social_directory_handles
      WHERE owner_user_id = ?1
    `).bind(userId),
  ];
  return deletedCount(await database.batch(statements));
}

function errorResponse(error) {
  if (
    error instanceof AccountDataDeletionError
    || (
      error
      && typeof error === 'object'
      && Number.isInteger(error.status)
      && error.status >= 400
      && error.status <= 599
      && typeof error.code === 'string'
      && typeof error.message === 'string'
    )
  ) {
    return jsonResponse(error.status, {
      status: 'error',
      code: error.code,
      message: error.message,
    });
  }
  return jsonResponse(503, {
    status: 'error',
    code: 'ACCOUNT_DATA_DELETION_FAILED',
    message: 'Les données sociales distantes n’ont pas pu être supprimées.',
  });
}

export async function handleAccountDataDeletionRequest(
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
    const deletedSocialRecords = await deleteSocialAccountData(
      readDatabase(env),
      actor.subject,
    );
    return jsonResponse(200, {
      status: 'deleted',
      deletedSocialRecords,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export const accountDataDeletionInternals = {
  deleteSocialAccountData,
};
