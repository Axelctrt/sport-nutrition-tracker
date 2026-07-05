import type { EntityId } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  canExposeFriendActivityDetails,
  canExposeFriendActivityDetailsToFriend,
  evaluateFriendActivitySharingGuard,
  evaluateFriendScopedActivitySharingGuard,
  updateFriendActivityPermission,
  type FriendProfileSummary,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import {
  databaseSchemaVersion,
  databaseTableNames,
} from '@/infrastructure/database/schema';

const friend: FriendProfileSummary = {
  id: 'social-user:lea' as EntityId,
  userId: 'social-user:lea' as EntityId,
  displayName: 'Léa Cardio',
  handle: 'lea.cardio',
  initials: 'LC',
};

const snapshot: FriendsPrivacySnapshot = {
  friends: [friend],
  requests: [],
  privacy: {
    ...DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    activitySharing: 'detailed',
  },
};

describe('readiness permissions amis 0.27.0 F3', () => {
  it('installe Dexie v10 et sauvegarde JSON v9 pour les permissions par ami', () => {
    expect(databaseSchemaVersion).toBe(10);
    expect(CURRENT_BACKUP_SCHEMA_VERSION).toBe(9);
    expect(databaseTableNames).toContain('friendActivityPermissions');
  });

  it('conserve le résumé par défaut et limite le détail au consentement explicite', () => {
    const defaultScopedGuard = evaluateFriendScopedActivitySharingGuard(snapshot, friend);
    const detailedSnapshot = updateFriendActivityPermission(
      snapshot,
      friend.id,
      'detailed',
      '2026-07-05T12:00:00.000Z',
    );
    const detailedScopedGuard = evaluateFriendScopedActivitySharingGuard(detailedSnapshot, friend);
    const globalGuard = evaluateFriendActivitySharingGuard(detailedSnapshot);

    expect(defaultScopedGuard.allowedScope).toBe('summary');
    expect(defaultScopedGuard.canShareDetailed).toBe(false);
    expect(detailedScopedGuard.allowedScope).toBe('detailed');
    expect(detailedScopedGuard.canShareDetailed).toBe(true);
    expect(canExposeFriendActivityDetailsToFriend(detailedSnapshot, friend)).toBe(true);
    expect(canExposeFriendActivityDetails(detailedSnapshot)).toBe(false);
    expect(globalGuard.reason).toMatch(/Snapshots sociaux filtrés disponibles/u);
  });
});
