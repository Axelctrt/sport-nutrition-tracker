import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { DexieSocialIdentityRepository } from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, FRIENDS_PRIVACY_SETTINGS_ID, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { createDefaultSocialIdentity, updateSocialIdentity } from '@/domain/friends/socialIdentity';

const snapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'summary-only',
  },
};

describe('DexieSocialIdentityRepository', () => {
  let database: AppDatabase;

  beforeEach(async () => {
    database = new AppDatabase(`sportpilot-social-identity-test-${crypto.randomUUID()}`);
    await database.open();
  });

  afterEach(async () => {
    await database.delete();
  });

  it('crée et relit une identité sociale locale stable', async () => {
    const repository = new DexieSocialIdentityRepository(database);

    const identity = await repository.readIdentity();
    const reloaded = await repository.readIdentity();

    expect(reloaded.userId).toBe(identity.userId);
    expect(reloaded.handle).toBe(identity.handle);
    expect(await database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID)).toMatchObject({
      socialIdentity: expect.objectContaining({ userId: identity.userId }),
    });
  });

  it('préserve les réglages de confidentialité quand le handle est sauvegardé', async () => {
    await new DexieFriendsPrivacyRepository(database).saveSnapshot(snapshot);
    const beforeIdentity = await database.friendsPrivacySettings.get(
      FRIENDS_PRIVACY_SETTINGS_ID,
    );
    const repository = new DexieSocialIdentityRepository(database);
    const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'abc123');
    const updated = updateSocialIdentity(identity, {
      handle: '@alex.run',
      displayName: 'Alex Run',
    }, '2026-07-05T11:00:00.000Z');

    await repository.saveIdentity(updated);

    await expect(new DexieFriendsPrivacyRepository(database).readSnapshot()).resolves.toMatchObject({
      privacy: {
        activitySharing: 'summary-only',
      },
    });
    await expect(repository.readIdentity()).resolves.toMatchObject({
      userId: identity.userId,
      handle: 'alex.run',
      displayName: 'Alex Run',
    });
    await expect(database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID))
      .resolves.toMatchObject({
        profileVisibilityUpdatedAt: beforeIdentity?.profileVisibilityUpdatedAt,
        socialActivitySharingPolicyUpdatedAt:
          beforeIdentity?.socialActivitySharingPolicyUpdatedAt,
        socialActivitySharingPolicy:
          beforeIdentity?.socialActivitySharingPolicy,
      });
  });
});
