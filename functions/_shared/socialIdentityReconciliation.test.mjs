import { describe, expect, it } from 'vitest';

import { socialIdentityReconciliationInternals } from './socialIdentityReconciliation.js';

const legacyIds = new Set(['social-user:legacy', 'sp-old']);
const canonicalUserId = 'dexie-user-123';

describe('social identity reconciliation server contract', () => {
  it('recalcule une amitié avec le userId canonique', () => {
    const result = socialIdentityReconciliationInternals.canonicalizeFriendshipRow({
      id: 'cloud-friendship:old',
      user_a_id: 'friend-user',
      user_b_id: 'social-user:legacy',
      status: 'active',
      created_at: '2026-07-07T10:00:00.000Z',
      updated_at: '2026-07-08T10:00:00.000Z',
    }, canonicalUserId, legacyIds);

    expect(result).toEqual(expect.objectContaining({
      id: 'cloud-friendship:dexie-user-123<->friend-user',
      user_a_id: 'dexie-user-123',
      user_b_id: 'friend-user',
    }));
  });

  it('recalcule les permissions et demandes dans les deux directions', () => {
    const permission = socialIdentityReconciliationInternals.canonicalizePermissionRow({
      id: 'cloud-friend-permission:old',
      owner_user_id: 'sp-old',
      friend_user_id: 'friend-user',
    }, canonicalUserId, legacyIds);
    const request = socialIdentityReconciliationInternals.canonicalizeRequestRow({
      id: 'friend-request:old',
      requester_user_id: 'friend-user',
      recipient_user_id: 'social-user:legacy',
    }, canonicalUserId, legacyIds);

    expect(permission).toEqual(expect.objectContaining({
      id: 'cloud-friend-permission:dexie-user-123->friend-user',
      owner_user_id: 'dexie-user-123',
    }));
    expect(request).toEqual(expect.objectContaining({
      id: 'friend-request:friend-user->dexie-user-123',
      recipient_user_id: 'dexie-user-123',
    }));
  });

  it('réécrit le snapshot JSON et sa clé déterministe', () => {
    const snapshot = {
      contractVersion: '0.29.0-a3',
      snapshotId: 'old',
      ownerUserId: 'social-user:legacy',
      recipientUserId: 'friend-user',
    };
    const result = socialIdentityReconciliationInternals.canonicalizeSnapshotRow({
      snapshot_id: 'old',
      owner_user_id: 'social-user:legacy',
      recipient_user_id: 'friend-user',
      source_kind: 'activity',
      source_activity_id: 'activity-1',
      snapshot_json: JSON.stringify(snapshot),
    }, canonicalUserId, legacyIds);

    expect(result.owner_user_id).toBe(canonicalUserId);
    expect(result.snapshot_id).toContain('dexie-user-123');
    expect(JSON.parse(result.snapshot_json)).toEqual(expect.objectContaining({
      ownerUserId: canonicalUserId,
      recipientUserId: 'friend-user',
      snapshotId: result.snapshot_id,
    }));
  });

  it('supprime les relations qui deviendraient une auto-relation', () => {
    const result = socialIdentityReconciliationInternals.canonicalizeFriendshipRow({
      id: 'old',
      user_a_id: 'social-user:legacy',
      user_b_id: 'sp-old',
    }, canonicalUserId, legacyIds);

    expect(result).toBeUndefined();
  });
});

describe('social identity reconciliation legacy ownership', () => {
  function directoryDatabase(row) {
    return {
      prepare() {
        return {
          bind() {
            return {
              async first() {
                return row;
              },
            };
          },
        };
      },
    };
  }

  it('reconnaît la réservation privée et le userId temporaire du navigateur', async () => {
    const fetcher = async (url) => {
      if (String(url).includes('socialHandleReservations')) {
        return new Response(JSON.stringify({
          id: 'social-handle:test',
          handle: 'test',
          ownerUserId: 'sp-old',
          ownerDisplayName: 'TEST',
        }), { status: 200 });
      }
      if (String(url).includes('socialIdentities')) {
        return new Response(JSON.stringify({
          id: 'social-identity:social-user:browser',
          userId: 'social-user:browser',
          handle: 'test',
        }), { status: 200 });
      }
      return new Response(null, { status: 404 });
    };

    const result = await socialIdentityReconciliationInternals.discoverLegacyUserIds({
      database: directoryDatabase({
        handle: 'test',
        owner_user_id: 'sp-old',
        owner_display_name: 'TEST',
        reserved_at: '2026-07-01T10:00:00.000Z',
        updated_at: '2026-07-07T10:00:00.000Z',
      }),
      canonicalUserId: 'dexie-user-123',
      previousUserId: 'social-user:browser',
      handle: 'test',
      databaseUrl: 'https://example.dexie.cloud',
      token: 'token',
      fetcher,
    });

    expect([...result.legacyIds].sort()).toEqual([
      'social-user:browser',
      'sp-old',
    ]);
  });

  it('refuse de reprendre un handle non prouvé pour le compte authentifié', async () => {
    const fetcher = async () => new Response(null, { status: 404 });

    await expect(
      socialIdentityReconciliationInternals.discoverLegacyUserIds({
        database: directoryDatabase({
          handle: 'victim',
          owner_user_id: 'other-user',
          owner_display_name: 'Victim',
          reserved_at: '2026-07-01T10:00:00.000Z',
          updated_at: '2026-07-07T10:00:00.000Z',
        }),
        canonicalUserId: 'dexie-user-123',
        previousUserId: 'social-user:browser',
        handle: 'victim',
        databaseUrl: 'https://example.dexie.cloud',
        token: 'token',
        fetcher,
      }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'SOCIAL_IDENTITY_RECONCILIATION_HANDLE_CONFLICT',
    });
  });
});
