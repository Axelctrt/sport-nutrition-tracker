import type { EntityId } from '@/domain/models/common';
import {
  SOCIAL_CLOUD_IDENTITY_CONTRACT_VERSION,
  assertSocialCloudIdentityContractIntegrity,
  buildSocialCloudIdentityRecord,
  buildSocialHandleReservation,
  createSocialCloudIdentityRecordId,
  createSocialHandleReservationId,
  evaluateSocialHandleReservationAvailability,
  identityFromSocialCloudRecord,
  publicProfileFromSocialReservation,
} from '@/domain/friends/socialCloudIdentity';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';

describe('identité cloud sociale 0.28.0 F2', () => {
  it('réserve un handle exact séparément de l’identité publique', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123');
    const reservation = buildSocialHandleReservation(identity, '2026-07-05T09:00:00.000Z');
    const record = buildSocialCloudIdentityRecord(identity, '2026-07-05T09:00:00.000Z');

    expect(SOCIAL_CLOUD_IDENTITY_CONTRACT_VERSION).toBe('0.28.0-f2');
    expect(createSocialHandleReservationId('@sp-alex123')).toBe('social-handle:sp-alex123');
    expect(createSocialCloudIdentityRecordId(identity.userId)).toBe('social-identity:social-user:alex123');
    expect(reservation).toMatchObject({
      id: 'social-handle:sp-alex123',
      handle: 'sp-alex123',
      ownerUserId: identity.userId,
    });
    expect(record.handleReservationId).toBe(reservation.id);
    expect(record.publicProfile).toEqual(publicProfileFromSocialReservation(reservation, record));
    expect(assertSocialCloudIdentityContractIntegrity()).toBe(true);
  });

  it('distingue disponible, propriétaire courant, doublon et handle invalide', () => {
    const owner = 'social-user:owner' as EntityId;
    const other = 'social-user:other' as EntityId;
    const reservation = buildSocialHandleReservation({
      userId: owner,
      handle: 'lina.trail',
      displayName: 'Lina Trail',
      createdAt: '2026-07-05T08:00:00.000Z',
      updatedAt: '2026-07-05T08:00:00.000Z',
      handleUpdatedAt: '2026-07-05T08:00:00.000Z',
    });

    expect(evaluateSocialHandleReservationAvailability('@ghost.run', owner)).toMatchObject({
      status: 'available',
      handle: 'ghost.run',
    });
    expect(evaluateSocialHandleReservationAvailability('@lina.trail', owner, reservation)).toMatchObject({
      status: 'ownedByCurrentUser',
    });
    expect(evaluateSocialHandleReservationAvailability('@lina.trail', other, reservation)).toMatchObject({
      status: 'alreadyTaken',
      ownerUserId: owner,
    });
    expect(evaluateSocialHandleReservationAvailability('@Admin', owner)).toMatchObject({
      status: 'invalidHandle',
    });
  });

  it('reconstruit une identité locale depuis le record cloud sans changer le userId', () => {
    const identity = createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123');
    const record = buildSocialCloudIdentityRecord(identity, '2026-07-05T09:00:00.000Z');

    expect(identityFromSocialCloudRecord(record)).toEqual({
      userId: identity.userId,
      handle: 'sp-alex123',
      displayName: 'SportPilot',
      createdAt: identity.createdAt,
      updatedAt: '2026-07-05T09:00:00.000Z',
      handleUpdatedAt: identity.handleUpdatedAt,
    });
  });
});
