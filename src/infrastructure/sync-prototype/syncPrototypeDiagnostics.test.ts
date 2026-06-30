import {
  createSyncPrototypeAccountFingerprint,
  createSyncPrototypeDiagnosticReport,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import type { SyncPrototypeSnapshot } from '@/infrastructure/sync-prototype/syncPrototypeClient';

describe('diagnostic non sensible du prototype Dexie Cloud', () => {
  it('produit une empreinte stable sans exposer l’identifiant du compte', () => {
    expect(
      createSyncPrototypeAccountFingerprint('Test@Example.com'),
    ).toBe(createSyncPrototypeAccountFingerprint(' test@example.com '));
    expect(
      createSyncPrototypeAccountFingerprint('test@example.com'),
    ).toMatch(/^acct-[0-9A-F]{8}$/);
  });

  it('génère un rapport sans email, jeton ou donnée SportPilot réelle', () => {
    const snapshot: SyncPrototypeSnapshot = {
      account: {
        isLoggedIn: true,
        isLoading: false,
        email: 'test@example.com',
        userId: 'test@example.com',
      },
      sync: {
        status: 'connected',
        phase: 'in-sync',
        progress: 100,
      },
      weights: {
        weights: [],
        deletedCount: 2,
        isLoading: false,
      },
      diagnostics: {
        databaseName: 'sportpilot-sync-prototype',
        databaseVersion: 1,
        accountFingerprint: 'acct-12345678',
        visibleWeightCount: 3,
        deletedWeightCount: 2,
        lastSyncCompletedAt: '2026-06-30T09:00:00.000Z',
        lastRefreshAt: '2026-06-30T09:00:01.000Z',
      },
    };

    const report = createSyncPrototypeDiagnosticReport(
      snapshot,
      '2026-06-30T09:05:00.000Z',
    );
    const serialized = JSON.stringify(report);

    expect(report.account).toEqual({
      isLoggedIn: true,
      fingerprint: 'acct-12345678',
    });
    expect(report.database.realDatabaseIncluded).toBe(false);
    expect(report.conflictPolicy).toEqual({
      differentProperties: 'merge',
      sameProperty: 'latest-operation-wins',
      staleEntityAfterDeletion: 'hidden-by-deletion-record',
    });
    expect(serialized).not.toContain('test@example.com');
    expect(serialized).not.toContain('accessToken');
    expect(serialized).not.toContain('sportpilot-local-database');
  });
});
