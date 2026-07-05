import Dexie, { type Table } from 'dexie';
import type { EntityId, IsoDateTime } from '@/domain/models/common';
import { createDefaultSocialIdentity, updateSocialIdentity } from '@/domain/friends/socialIdentity';
import type {
  SocialCloudIdentityRecord,
  SocialHandleReservation,
} from '@/domain/friends/socialCloudIdentity';
import { createRealSocialCloudIdentityPort } from '@/infrastructure/sync-prototype/realSocialCloudIdentityService';

class TestSocialCloudIdentityDatabase extends Dexie {
  declare socialIdentities: Table<SocialCloudIdentityRecord, EntityId>;
  declare socialHandleReservations: Table<SocialHandleReservation, EntityId>;

  constructor() {
    super(`sportpilot-f2-social-cloud-${crypto.randomUUID()}`);
    this.version(1).stores({
      socialIdentities: 'id, &userId, &handle, updatedAt',
      socialHandleReservations: 'id, &handle, ownerUserId, updatedAt',
    });
  }
}

function fixedClock(value: IsoDateTime) {
  return { now: () => value };
}

describe('realSocialCloudIdentityService', () => {
  let database: TestSocialCloudIdentityDatabase;

  beforeEach(async () => {
    database = new TestSocialCloudIdentityDatabase();
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('publie une identité cloud et réserve son handle exact', async () => {
    const port = createRealSocialCloudIdentityPort(database, fixedClock('2026-07-06T10:00:00.000Z'));
    const identity = updateSocialIdentity(
      createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123'),
      { handle: '@alex.run', displayName: 'Alex Run' },
      '2026-07-06T09:00:00.000Z',
    );

    await expect(port.publishIdentity(identity)).resolves.toMatchObject({
      status: 'created',
      message: 'Identité sociale cloud créée.',
    });

    await expect(database.socialHandleReservations.get('social-handle:alex.run' as EntityId)).resolves.toMatchObject({
      handle: 'alex.run',
      ownerUserId: identity.userId,
      ownerDisplayName: 'Alex Run',
    });
    await expect(port.lookupByHandle('@alex.run')).resolves.toMatchObject({
      status: 'found',
      profile: {
        userId: identity.userId,
        handle: 'alex.run',
        displayName: 'Alex Run',
      },
    });
    await expect(port.readCurrentIdentity(identity.userId)).resolves.toMatchObject({
      userId: identity.userId,
      handle: 'alex.run',
      displayName: 'Alex Run',
    });
  });

  it('empêche deux userId différents de réserver le même handle', async () => {
    const port = createRealSocialCloudIdentityPort(database, fixedClock('2026-07-06T10:00:00.000Z'));
    const first = updateSocialIdentity(
      createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123'),
      { handle: '@shared.run', displayName: 'Alex Run' },
      '2026-07-06T09:00:00.000Z',
    );
    const second = updateSocialIdentity(
      createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'lina456'),
      { handle: '@shared.run', displayName: 'Lina Run' },
      '2026-07-06T09:10:00.000Z',
    );

    await port.publishIdentity(first);

    await expect(port.publishIdentity(second)).resolves.toMatchObject({
      status: 'conflict',
      message: 'Identifiant déjà réservé par un autre compte SportPilot.',
    });
    await expect(database.socialIdentities.count()).resolves.toBe(1);
  });

  it('supprime l’ancienne réservation quand le même userId change de handle', async () => {
    const port = createRealSocialCloudIdentityPort(database, fixedClock('2026-07-06T10:00:00.000Z'));
    const initial = updateSocialIdentity(
      createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123'),
      { handle: '@alex.run', displayName: 'Alex Run' },
      '2026-07-06T09:00:00.000Z',
    );
    const next = updateSocialIdentity(
      initial,
      { handle: '@alex.trail', displayName: 'Alex Trail' },
      '2026-07-06T09:30:00.000Z',
    );

    await port.publishIdentity(initial);
    await expect(port.publishIdentity(next)).resolves.toMatchObject({ status: 'updated' });

    await expect(port.lookupByHandle('@alex.run')).resolves.toEqual({ status: 'notFound' });
    await expect(port.lookupByHandle('@alex.trail')).resolves.toMatchObject({ status: 'found' });
    await expect(database.socialHandleReservations.count()).resolves.toBe(1);
  });

  it('refuse les handles invalides sans créer de réservation', async () => {
    const port = createRealSocialCloudIdentityPort(database, fixedClock('2026-07-06T10:00:00.000Z'));
    const identity = {
      ...createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123'),
      handle: 'Admin',
    };

    await expect(port.publishIdentity(identity)).resolves.toMatchObject({ status: 'invalidHandle' });
    await expect(database.socialHandleReservations.count()).resolves.toBe(0);
    await expect(port.lookupByHandle('@Admin')).resolves.toEqual({ status: 'invalidHandle' });
  });
});
