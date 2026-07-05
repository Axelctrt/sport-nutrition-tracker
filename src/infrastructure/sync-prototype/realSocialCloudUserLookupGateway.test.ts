import Dexie, { type Table } from 'dexie';
import type { EntityId } from '@/domain/models/common';
import { createDefaultSocialIdentity, updateSocialIdentity } from '@/domain/friends/socialIdentity';
import type {
  SocialCloudIdentityRecord,
  SocialHandleReservation,
} from '@/domain/friends/socialCloudIdentity';
import { createRealSocialCloudIdentityPort } from '@/infrastructure/sync-prototype/realSocialCloudIdentityService';
import {
  createRealSocialCloudUserLookupGateway,
  createRuntimeSocialCloudUserLookupGateway,
} from '@/infrastructure/sync-prototype/realSocialCloudUserLookupGateway';

class TestSocialCloudLookupDatabase extends Dexie {
  declare socialIdentities: Table<SocialCloudIdentityRecord, EntityId>;
  declare socialHandleReservations: Table<SocialHandleReservation, EntityId>;

  constructor() {
    super(`sportpilot-f3-social-cloud-lookup-${crypto.randomUUID()}`);
    this.version(1).stores({
      socialIdentities: 'id, &userId, &handle, updatedAt',
      socialHandleReservations: 'id, &handle, ownerUserId, updatedAt',
    });
  }
}

describe('realSocialCloudUserLookupGateway', () => {
  let database: TestSocialCloudLookupDatabase;

  beforeEach(async () => {
    database = new TestSocialCloudLookupDatabase();
    await database.open();
  });

  afterEach(async () => {
    database.close();
    await database.delete();
  });

  it('retrouve un profil via réservation de handle exacte', async () => {
    const identityPort = createRealSocialCloudIdentityPort(database, { now: () => '2026-07-06T10:00:00.000Z' });
    const lookupGateway = createRealSocialCloudUserLookupGateway(identityPort);
    const identity = updateSocialIdentity(
      createDefaultSocialIdentity('2026-07-05T08:00:00.000Z', 'alex123'),
      { handle: '@alex.run', displayName: 'Alex Run' },
      '2026-07-06T09:00:00.000Z',
    );

    await identityPort.publishIdentity(identity);

    await expect(lookupGateway.lookupByHandle('@alex.run')).resolves.toMatchObject({
      status: 'found',
      profile: {
        userId: identity.userId,
        handle: 'alex.run',
        displayName: 'Alex Run',
      },
    });
  });

  it('ne retourne pas de suggestion quand le handle exact est absent', async () => {
    const identityPort = createRealSocialCloudIdentityPort(database);
    const lookupGateway = createRealSocialCloudUserLookupGateway(identityPort);

    await expect(lookupGateway.lookupByHandle('@ghost.run')).resolves.toEqual({ status: 'notFound' });
  });

  it('garde le runtime indisponible tant que le flag social cloud est désactivé', async () => {
    const gateway = createRuntimeSocialCloudUserLookupGateway({
      configResult: {
        config: {
          enabled: true,
          databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
          realWeightSyncEnabled: true,
          realActivitySyncEnabled: true,
          realGoalSyncEnabled: true,
          realStrengthSyncEnabled: true,
          realNutritionJournalSyncEnabled: true,
          realNutritionLibrarySyncEnabled: true,
          realNutritionTrackingSyncEnabled: true,
          realAccountPreferencesSyncEnabled: true,
          realRewardsRoutinesSyncEnabled: true,
          realSocialCloudEnabled: false,
          diagnosticsEnabled: false,
        },
      },
    });

    await expect(gateway.lookupByHandle('@alex.run')).resolves.toEqual({ status: 'unavailable' });
  });
});
