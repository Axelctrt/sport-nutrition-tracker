import { mergeSyncPrototypeProductionEnvironment, readSyncPrototypeConfig } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';

describe('activation contrôlée du cloud social réel 0.28.1 F1', () => {
  it('conserve un défaut public prudent', () => {
    expect(syncPublicDeploymentConfig.VITE_ENABLE_REAL_SOCIAL_CLOUD).toBe('false');
  });

  it('laisse Cloudflare Preview activer le cloud social sans repatcher le code', () => {
    const config = readSyncPrototypeConfig(
      mergeSyncPrototypeProductionEnvironment({
        VITE_ENABLE_REAL_SOCIAL_CLOUD: 'true',
      }),
    );

    expect(config).toMatchObject({
      enabled: true,
      databaseUrl: 'https://zhnyk8met.dexie.cloud',
      realSocialCloudEnabled: true,
    });
  });

  it('garde la production désactivable explicitement par environnement', () => {
    const config = readSyncPrototypeConfig(
      mergeSyncPrototypeProductionEnvironment({
        VITE_ENABLE_REAL_SOCIAL_CLOUD: 'false',
      }),
    );

    expect(config).toMatchObject({
      enabled: true,
      realSocialCloudEnabled: false,
    });
  });
});
