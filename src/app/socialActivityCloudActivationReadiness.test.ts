import readinessRouteSource from '../../functions/api/social-activity-snapshots/readiness.js?raw';
import serverSource from '../../functions/_shared/socialActivitySnapshots.js?raw';
import migrationSource from '../../migrations/0001_social_activity_snapshots_0_29_0.sql?raw';
import panelSource from '@/features/friends/components/SocialActivityCloudReadinessPanel.tsx?raw';
import pageSource from '@/features/friends/pages/FriendsPrivacyPage.tsx?raw';
import advancedSettingsSource from '@/features/settings/pages/AdvancedSettingsPage.tsx?raw';

describe('social activity cloud activation readiness 0.29.0 A11', () => {
  it('expose un endpoint authentifié et non mutatif pour vérifier D1', () => {
    expect(readinessRouteSource).toContain('handleSocialActivitySnapshotReadinessRequest');
    expect(serverSource).toContain("FROM sqlite_master");
    expect(serverSource).toContain("'migrationRequired'");
    expect(serverSource).toContain('SOCIAL_ACTIVITY_REQUIRED_MIGRATION');
    expect(serverSource).toContain('SOCIAL_ACTIVITY_MIGRATION_REQUIRED');
    expect(serverSource).not.toContain('async function ensureSchema');

    const handlerStart = serverSource.indexOf('handleSocialActivitySnapshotReadinessRequest');
    const handlerEnd = serverSource.indexOf('handleSocialActivitySnapshotSyncRequest');
    const handlerSource = serverSource.slice(handlerStart, handlerEnd);
    expect(handlerSource).toContain('authenticateRequest');
    expect(handlerSource).toContain('inspectSocialActivitySchema');
    expect(handlerSource).not.toContain('ensureSchema');
  });

  it('conserve une migration D1 idempotente et versionnée', () => {
    expect(migrationSource).toContain('CREATE TABLE IF NOT EXISTS social_activity_snapshots');
    expect(migrationSource).toContain('CREATE UNIQUE INDEX IF NOT EXISTS idx_social_activity_snapshot_source_recipient');
    expect(migrationSource).toContain('CREATE INDEX IF NOT EXISTS idx_social_activity_snapshot_feed');
    expect(migrationSource).toContain('CREATE INDEX IF NOT EXISTS idx_social_activity_snapshot_owner');
  });

  it('réserve le diagnostic mobile-first aux réglages avancés', () => {
    expect(pageSource).not.toContain('SocialActivityCloudReadinessPanel');
    expect(advancedSettingsSource).toContain('SocialActivityCloudReadinessPanel');
    expect(advancedSettingsSource).toContain('Diagnostic social');
    expect(panelSource).toContain('min-h-11');
    expect(panelSource).toContain('Migration D1 requise');
    expect(panelSource).toContain('Cloud social prêt');
    expect(panelSource).not.toContain('ownerUserId');
    expect(panelSource).not.toContain('accessToken');
  });
});
