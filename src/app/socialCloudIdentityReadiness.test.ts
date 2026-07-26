import {
  SOCIAL_CLOUD_IDENTITY_CONTRACT_VERSION,
  assertSocialCloudIdentityContractIntegrity,
  buildSocialCloudIdentityRecord,
  buildSocialHandleReservation,
} from '@/domain/friends/socialCloudIdentity';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';
import {
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('readiness identités cloud 0.28.0 F2', () => {
  it('ajoute les collections cloud nécessaires aux identités et réservations exactes', () => {
    expect(SOCIAL_CLOUD_IDENTITY_CONTRACT_VERSION).toBe('0.28.0-f2');
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toEqual(
      expect.arrayContaining([
        'socialIdentities',
        'socialHandleReservations',
      ]),
    );
    expect(SYNC_PROTOTYPE_TABLE_NAMES).not.toContain('socialRawActivities');
    expect(SYNC_PROTOTYPE_TABLE_NAMES).not.toContain('globalUserDirectory');
    expect(assertSocialCloudIdentityContractIntegrity()).toBe(true);
  });

  it('sépare le handle public du userId stable', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123');
    const reservation = buildSocialHandleReservation(identity, '2026-07-06T10:00:00.000Z');
    const record = buildSocialCloudIdentityRecord(identity, '2026-07-06T10:00:00.000Z');

    expect(reservation.id).toBe('social-handle:sp-alex123');
    expect(reservation.ownerUserId).toBe(identity.userId);
    expect(record.userId).toBe(identity.userId);
    expect(record.handleReservationId).toBe(reservation.id);
    expect(record.publicProfile).toMatchObject({
      userId: identity.userId,
      handle: 'sp-alex123',
      displayName: 'SportPilot',
    });
  });
});
