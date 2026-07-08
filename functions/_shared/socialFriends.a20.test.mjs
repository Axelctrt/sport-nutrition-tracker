import { describe, expect, it } from 'vitest';

import { socialFriendsInternals } from './socialFriends.js';

function normalizeSql(sql) {
  return sql.replace(/\s+/gu, ' ').trim().toLowerCase();
}

class FakeStatement {
  constructor(database, sql) {
    this.database = database;
    this.sql = normalizeSql(sql);
    this.values = [];
  }

  bind(...values) {
    this.values = values;
    return this;
  }

  async run() {
    if (this.sql.startsWith('create ')) return { success: true };

    if (this.sql.startsWith('insert into social_friend_permissions')) {
      const [
        id,
        ownerUserId,
        friendUserId,
        friendHandle,
        sharingLevel,
        detailedConsent,
        detailedConsentGrantedAt,
        fieldSelectionJson,
        timestamp,
      ] = this.values;
      this.database.permissions.set(`${ownerUserId}->${friendUserId}`, {
        id,
        owner_user_id: ownerUserId,
        friend_user_id: friendUserId,
        friend_handle: friendHandle,
        sharing_level: sharingLevel,
        detailed_consent: detailedConsent,
        detailed_consent_granted_at: detailedConsentGrantedAt,
        field_selection_json: fieldSelectionJson,
        created_at: timestamp,
        updated_at: timestamp,
      });
      return { success: true };
    }

    if (this.sql.startsWith('update social_friend_permissions')) {
      const [
        ownerUserId,
        friendUserId,
        id,
        friendHandle,
        sharingLevel,
        detailedConsent,
        detailedConsentGrantedAt,
        fieldSelectionJson,
        timestamp,
      ] = this.values;
      const current = this.database.permissions.get(`${ownerUserId}->${friendUserId}`);
      if (current) {
        Object.assign(current, {
          id,
          friend_handle: friendHandle,
          sharing_level: sharingLevel,
          detailed_consent: detailedConsent,
          detailed_consent_granted_at: detailedConsentGrantedAt,
          field_selection_json: fieldSelectionJson,
          updated_at: timestamp,
        });
      }
      return { success: true };
    }

    throw new Error(`SQL run non simulé: ${this.sql}`);
  }

  async first() {
    if (this.sql.includes('from social_directory_handles')) {
      return { handle: 'friend.run' };
    }

    if (this.sql.includes('from social_friendships') && this.sql.includes("status = 'active'")) {
      const [ownerUserId, friendUserId] = this.values;
      return this.database.friendships.has(this.database.pair(ownerUserId, friendUserId))
        ? { id: 'friendship-a20' }
        : null;
    }

    if (this.sql.includes('from social_friend_permissions')) {
      const [ownerUserId, friendUserId] = this.values;
      const row = this.database.permissions.get(`${ownerUserId}->${friendUserId}`);
      if (!row) return null;
      if (this.sql.startsWith('select id, created_at')) {
        return { id: row.id, created_at: row.created_at, field_selection_json: row.field_selection_json };
      }
      return row;
    }

    throw new Error(`SQL first non simulé: ${this.sql}`);
  }

  async all() {
    if (this.sql.includes('from social_friend_permissions')) {
      const [ownerUserId] = this.values;
      return {
        results: [...this.database.permissions.values()]
          .filter((row) => row.owner_user_id === ownerUserId),
      };
    }
    throw new Error(`SQL all non simulé: ${this.sql}`);
  }
}

class FakeDatabase {
  constructor() {
    this.friendships = new Set();
    this.permissions = new Map();
  }

  pair(left, right) {
    return [left, right].sort().join('<->');
  }

  addFriendship(left, right) {
    this.friendships.add(this.pair(left, right));
  }

  prepare(sql) {
    return new FakeStatement(this, sql);
  }
}

function permissionPayload(fieldSelection) {
  return {
    ownerUserId: 'user-owner@example.com',
    permission: {
      id: 'cloud-friend-permission:user-owner@example.com->user-friend@example.com',
      friendUserId: 'user-friend@example.com',
      friendHandle: 'friend.run',
      sharingLevel: 'detailed',
      detailedConsent: 'granted',
      detailedConsentGrantedAt: '2026-07-08T12:00:00.000Z',
      fieldSelection,
    },
  };
}

describe('socialFriends A20', () => {
  it('persiste et relit la sélection granulaire par ami', async () => {
    const database = new FakeDatabase();
    database.addFriendship('user-owner@example.com', 'user-friend@example.com');
    const selection = {
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance', 'pace'],
      strength: ['exercises', 'sets', 'repetitions'],
    };

    await expect(socialFriendsInternals.savePermission(
      database,
      permissionPayload(selection),
    )).resolves.toMatchObject({
      status: 201,
      payload: {
        status: 'created',
        permission: { fieldSelection: selection },
      },
    });

    await expect(socialFriendsInternals.listPermissions(
      database,
      'user-owner@example.com',
    )).resolves.toMatchObject([{ fieldSelection: selection }]);
  });

  it('remplace les champs autorisés sans modifier le niveau de consentement', async () => {
    const database = new FakeDatabase();
    database.addFriendship('user-owner@example.com', 'user-friend@example.com');
    await socialFriendsInternals.savePermission(database, permissionPayload({
      common: ['activityType', 'title', 'date', 'duration'],
      cardio: ['distance', 'pace'],
      strength: ['exercises', 'sets', 'repetitions', 'loads'],
    }));

    const result = await socialFriendsInternals.savePermission(database, permissionPayload({
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance'],
      strength: ['exercises', 'sets', 'repetitions'],
    }));

    expect(result).toMatchObject({
      status: 200,
      payload: {
        status: 'updated',
        permission: {
          sharingLevel: 'detailed',
          detailedConsent: 'granted',
          fieldSelection: {
            common: ['activityType', 'date', 'duration'],
            cardio: ['distance'],
            strength: ['exercises', 'sets', 'repetitions'],
          },
        },
      },
    });
  });

  it('préserve une sélection existante lorsqu’un ancien client omet le champ A20', async () => {
    const database = new FakeDatabase();
    database.addFriendship('user-owner@example.com', 'user-friend@example.com');
    const existingSelection = {
      common: ['activityType', 'date', 'duration'],
      cardio: ['distance'],
      strength: ['exercises', 'sets', 'repetitions'],
    };
    await socialFriendsInternals.savePermission(database, permissionPayload(existingSelection));

    const legacyPayload = permissionPayload(undefined);
    delete legacyPayload.permission.fieldSelection;
    legacyPayload.permission.sharingLevel = 'summary';
    legacyPayload.permission.detailedConsent = 'notRequested';
    delete legacyPayload.permission.detailedConsentGrantedAt;

    const result = await socialFriendsInternals.savePermission(database, legacyPayload);
    expect(result.payload.permission).toMatchObject({
      sharingLevel: 'summary',
      detailedConsent: 'notRequested',
      fieldSelection: existingSelection,
    });
  });

  it('refuse une sélection contenant un champ inconnu', async () => {
    const database = new FakeDatabase();
    database.addFriendship('user-owner@example.com', 'user-friend@example.com');

    await expect(socialFriendsInternals.savePermission(database, permissionPayload({
      common: ['activityType', 'date', 'privateNotes'],
      cardio: [],
      strength: [],
    }))).rejects.toMatchObject({
      status: 400,
      code: 'SOCIAL_FRIENDS_INVALID_FIELD_SELECTION',
    });
  });

  it('persiste aucun partage et réinitialise le consentement détaillé', async () => {
    const database = new FakeDatabase();
    database.addFriendship('user-owner@example.com', 'user-friend@example.com');
    const payload = permissionPayload({
      common: ['activityType', 'title', 'date', 'duration'],
      cardio: ['distance'],
      strength: ['exercises', 'sets', 'repetitions'],
    });
    payload.permission.sharingLevel = 'none';
    payload.permission.detailedConsent = 'granted';

    const result = await socialFriendsInternals.savePermission(database, payload);
    expect(result.payload.permission).toMatchObject({
      sharingLevel: 'none',
      detailedConsent: 'notRequested',
    });
    expect(result.payload.permission).not.toHaveProperty('detailedConsentGrantedAt');
  });

  it('conserve le standard détaillé pour une ancienne ligne sans JSON A20', async () => {
    const database = new FakeDatabase();
    database.permissions.set('user-owner@example.com->user-friend@example.com', {
      id: 'legacy-permission',
      owner_user_id: 'user-owner@example.com',
      friend_user_id: 'user-friend@example.com',
      friend_handle: 'friend.run',
      sharing_level: 'summary',
      detailed_consent: 'notRequested',
      detailed_consent_granted_at: null,
      field_selection_json: null,
      created_at: '2026-07-08T10:00:00.000Z',
      updated_at: '2026-07-08T10:00:00.000Z',
    });

    const permissions = await socialFriendsInternals.listPermissions(
      database,
      'user-owner@example.com',
    );
    expect(permissions[0].fieldSelection).toMatchObject({
      common: expect.arrayContaining(['activityType', 'title', 'date', 'time', 'duration', 'calories']),
      cardio: expect.arrayContaining(['distance', 'pace', 'speed', 'heartRate', 'cadence']),
      strength: expect.arrayContaining(['exercises', 'sets', 'repetitions', 'loads', 'rpe']),
    });
  });
});
