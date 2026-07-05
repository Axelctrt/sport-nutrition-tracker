import { FRIENDS_PRIVACY_SETTINGS_ID, DEFAULT_FRIENDS_PRIVACY_SETTINGS } from '@/domain/friends/friendship';
import {
  createDefaultSocialIdentity,
  type SocialIdentity,
} from '@/domain/friends/socialIdentity';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';

export class DexieSocialIdentityRepository implements SocialIdentityRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  async readIdentity(): Promise<SocialIdentity> {
    const settings = await this.database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID);
    if (settings?.socialIdentity) return settings.socialIdentity;

    const identity = createDefaultSocialIdentity();
    await this.saveIdentity(identity);
    return identity;
  }

  async saveIdentity(identity: SocialIdentity): Promise<void> {
    const existing = await this.database.friendsPrivacySettings.get(FRIENDS_PRIVACY_SETTINGS_ID);
    const now = new Date().toISOString();

    await this.database.friendsPrivacySettings.put({
      id: FRIENDS_PRIVACY_SETTINGS_ID,
      profileVisibility: existing?.profileVisibility ?? DEFAULT_FRIENDS_PRIVACY_SETTINGS.profileVisibility,
      activitySharing: existing?.activitySharing ?? DEFAULT_FRIENDS_PRIVACY_SETTINGS.activitySharing,
      allowFriendRequests: existing?.allowFriendRequests ?? DEFAULT_FRIENDS_PRIVACY_SETTINGS.allowFriendRequests,
      requireManualApproval: existing?.requireManualApproval ?? DEFAULT_FRIENDS_PRIVACY_SETTINGS.requireManualApproval,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      socialIdentity: identity,
    });
  }
}
