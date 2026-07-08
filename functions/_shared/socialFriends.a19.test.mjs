import { describe, expect, it } from 'vitest';

import { socialFriendsInternals } from './socialFriends.js';

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = sql;
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    const normalized = this.sql.replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalized.startsWith('update social_friendships')) {
      const [id, updatedAt] = this.values;
      const friendship = this.database.friendships.get(id);
      if (friendship) {
        friendship.status = 'removed';
        friendship.updated_at = updatedAt;
      }
    }
    if (normalized.startsWith('delete from social_friend_permissions')) {
      const [userId, friendUserId] = this.values;
      this.database.permissions = this.database.permissions.filter((row) => !(
        (row.owner_user_id === userId && row.friend_user_id === friendUserId)
        || (row.owner_user_id === friendUserId && row.friend_user_id === userId)
      ));
    }
    return { success: true };
  }

  async first() {
    const normalized = this.sql.replace(/\s+/g, ' ').trim().toLowerCase();
    if (normalized.includes('from social_friendships')) {
      const [id, userId] = this.values;
      const row = this.database.friendships.get(id);
      if (!row) return null;
      if (normalized.includes('and (user_a_id = ?2 or user_b_id = ?2)')) {
        return row.user_a_id === userId || row.user_b_id === userId ? row : null;
      }
      return row;
    }
    return null;
  }
}

class FakeDatabase {
  constructor() {
    this.friendships = new Map();
    this.permissions = [];
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

describe('socialFriends A19', () => {
  it('marks friendship removed and deletes bilateral permissions', async () => {
  const database = new FakeDatabase();
  database.friendships.set('cloud-friendship:social-user:alex<->social-user:lina', {
    id: 'cloud-friendship:social-user:alex<->social-user:lina',
    user_a_id: 'social-user:alex',
    user_b_id: 'social-user:lina',
    status: 'active',
    created_at: '2026-07-08T10:00:00.000Z',
    updated_at: '2026-07-08T10:00:00.000Z',
  });
  database.permissions = [
    {
      owner_user_id: 'social-user:alex',
      friend_user_id: 'social-user:lina',
    },
    {
      owner_user_id: 'social-user:lina',
      friend_user_id: 'social-user:alex',
    },
    {
      owner_user_id: 'social-user:alex',
      friend_user_id: 'social-user:milo',
    },
  ];

  const result = await socialFriendsInternals.removeFriendship(database, {
    userId: 'social-user:alex',
    friendUserId: 'social-user:lina',
  });

    expect(result.status).toBe(200);
    expect(result.payload.status).toBe('updated');
    expect(result.payload.friendship.status).toBe('removed');
    expect(database.friendships.get('cloud-friendship:social-user:alex<->social-user:lina').status).toBe('removed');
    expect(database.permissions).toEqual([
    {
      owner_user_id: 'social-user:alex',
      friend_user_id: 'social-user:milo',
    },
  ]);
});

  it('rejects a forged friendship identifier before any removal', async () => {
  const database = new FakeDatabase();
  database.friendships.set('cloud-friendship:social-user:alex<->social-user:lina', {
    id: 'cloud-friendship:social-user:alex<->social-user:lina',
    user_a_id: 'social-user:alex',
    user_b_id: 'social-user:lina',
    status: 'active',
    created_at: '2026-07-08T10:00:00.000Z',
    updated_at: '2026-07-08T10:00:00.000Z',
  });

    await expect(
      socialFriendsInternals.removeFriendship(database, {
        userId: 'social-user:milo',
        friendUserId: 'social-user:lina',
        friendshipId: 'cloud-friendship:social-user:alex<->social-user:lina',
      }),
    ).rejects.toMatchObject({
      status: 400,
      code: 'SOCIAL_FRIENDS_FRIENDSHIP_ID_MISMATCH',
    });
    expect(database.friendships.get('cloud-friendship:social-user:alex<->social-user:lina').status).toBe('active');
});
});
