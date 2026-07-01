import {
  readSyncPrototypeConfig,
  readSyncPrototypeConfigSafely,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';

describe('configuration du prototype Dexie Cloud', () => {
  it('dégrade une configuration invalide sans faire tomber l’application', () => {
    expect(
      readSyncPrototypeConfigSafely({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
      }),
    ).toEqual({
      config: { enabled: false },
      errorMessage:
        'VITE_DEXIE_CLOUD_DATABASE_URL est obligatoire lorsque le prototype est activé.',
    });
  });

  it('reste désactivé par défaut sans exiger d’URL distante', () => {
    expect(readSyncPrototypeConfig({})).toEqual({ enabled: false });
    expect(
      readSyncPrototypeConfig({ VITE_ENABLE_SYNC_PROTOTYPE: 'false' }),
    ).toEqual({ enabled: false });
  });

  it('accepte uniquement une URL racine HTTPS hébergée par Dexie Cloud', () => {
    expect(
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: ' TRUE ',
        VITE_DEXIE_CLOUD_DATABASE_URL:
          'https://sportpilot-prototype.dexie.cloud/',
      }),
    ).toEqual({
      enabled: true,
      databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
      realWeightSyncEnabled: false,
      realActivitySyncEnabled: false,
      realGoalSyncEnabled: false,
      diagnosticsEnabled: false,
    });
  });

  it.each([
    {},
    { VITE_DEXIE_CLOUD_DATABASE_URL: 'http://test.dexie.cloud' },
    { VITE_DEXIE_CLOUD_DATABASE_URL: 'https://dexie.cloud' },
    { VITE_DEXIE_CLOUD_DATABASE_URL: 'https://example.com' },
    {
      VITE_DEXIE_CLOUD_DATABASE_URL:
        'https://user:secret@test.dexie.cloud',
    },
    {
      VITE_DEXIE_CLOUD_DATABASE_URL:
        'https://test.dexie.cloud/path',
    },
    {
      VITE_DEXIE_CLOUD_DATABASE_URL:
        'https://test.dexie.cloud?secret=value',
    },
  ])('refuse une configuration distante non sûre : %o', (environment) => {
    expect(() =>
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        ...environment,
      }),
    ).toThrow();
  });


  it('active séparément la synchronisation des vraies pesées', () => {
    expect(
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL:
          'https://sportpilot-prototype.dexie.cloud',
        VITE_ENABLE_REAL_WEIGHT_SYNC: 'true',
      }),
    ).toMatchObject({
      enabled: true,
      realWeightSyncEnabled: true,
    });
  });


  it('active séparément la synchronisation des activités réelles', () => {
    expect(
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL:
          'https://sportpilot-prototype.dexie.cloud',
        VITE_ENABLE_REAL_ACTIVITY_SYNC: 'true',
      }),
    ).toMatchObject({
      enabled: true,
      realActivitySyncEnabled: true,
    });
  });



  it('active séparément la synchronisation des objectifs réels', () => {
    expect(
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL:
          'https://sportpilot-prototype.dexie.cloud',
        VITE_ENABLE_REAL_GOAL_SYNC: 'true',
      }),
    ).toMatchObject({
      enabled: true,
      realGoalSyncEnabled: true,
    });
  });

  it('active les outils de diagnostic avec un flag séparé', () => {
    expect(
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL: 'https://test.dexie.cloud',
        VITE_ENABLE_SYNC_DIAGNOSTICS: 'true',
      }),
    ).toMatchObject({
      enabled: true,
      diagnosticsEnabled: true,
    });
  });

  it('refuse une valeur ambiguë pour les outils de diagnostic', () => {
    expect(() =>
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL: 'https://test.dexie.cloud',
        VITE_ENABLE_SYNC_DIAGNOSTICS: 'yes',
      }),
    ).toThrow('VITE_ENABLE_SYNC_DIAGNOSTICS');
  });

  it('refuse une valeur d’activation ambiguë', () => {
    expect(() =>
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'yes',
      }),
    ).toThrow('doit valoir true ou false');
  });




  it('refuse une valeur ambiguë pour B2', () => {
    expect(() =>
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL: 'https://test.dexie.cloud',
        VITE_ENABLE_REAL_GOAL_SYNC: 'yes',
      }),
    ).toThrow('VITE_ENABLE_REAL_GOAL_SYNC');
  });

  it('refuse une valeur ambiguë pour B1', () => {
    expect(() =>
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL: 'https://test.dexie.cloud',
        VITE_ENABLE_REAL_ACTIVITY_SYNC: 'yes',
      }),
    ).toThrow('VITE_ENABLE_REAL_ACTIVITY_SYNC');
  });

  it('refuse une valeur ambiguë pour C4', () => {
    expect(() =>
      readSyncPrototypeConfig({
        VITE_ENABLE_SYNC_PROTOTYPE: 'true',
        VITE_DEXIE_CLOUD_DATABASE_URL: 'https://test.dexie.cloud',
        VITE_ENABLE_REAL_WEIGHT_SYNC: 'yes',
      }),
    ).toThrow('VITE_ENABLE_REAL_WEIGHT_SYNC');
  });
});
