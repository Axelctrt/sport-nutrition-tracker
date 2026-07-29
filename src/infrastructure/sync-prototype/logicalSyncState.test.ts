import { describe, expect, it } from 'vitest';
import {
  compareLogicalSyncStamps,
  logicalSyncStamp,
  resolveLogicalSyncState,
  stripLogicalSyncFields,
  withLogicalSyncStamp,
} from '@/infrastructure/sync-prototype/logicalSyncState';

const legacyResolve = <T extends { updatedAt: string }>(
  local: T,
  cloud: T,
) => local.updatedAt >= cloud.updatedAt ? local : cloud;

describe('logical sync state', () => {
  it('initialise les anciennes lignes avec la politique historique une seule fois', () => {
    const local = { value: 'local', updatedAt: '2026-01-01T00:00:00.000Z' };
    const cloud = { value: 'cloud', updatedAt: '2026-02-01T00:00:00.000Z' };
    const result = resolveLogicalSyncState({
      accountUserId: 'account-1',
      domainId: 'weights',
      entityId: 'weight-1',
      actorId: 'device-a',
      localValue: local,
      cloudValue: cloud,
      cloudStamp: { revision: 0, actorId: '' },
      legacyResolve,
    });

    expect(result.value).toEqual(cloud);
    expect(result.source).toBe('legacy');
    expect(result.stamp).toEqual({ revision: 1, actorId: 'device-a' });
  });

  it('préfère une modification locale sans dépendre de son horloge murale', () => {
    const previous = { value: 'initial', updatedAt: '2030-01-01T00:00:00.000Z' };
    const first = resolveLogicalSyncState({
      accountUserId: 'account-1',
      domainId: 'weights',
      entityId: 'weight-1',
      actorId: 'device-a',
      localValue: previous,
      cloudValue: previous,
      cloudStamp: { revision: 4, actorId: 'device-b' },
      legacyResolve,
    });
    const local = { value: 'local', updatedAt: '2020-01-01T00:00:00.000Z' };
    const result = resolveLogicalSyncState({
      accountUserId: 'account-1',
      domainId: 'weights',
      entityId: 'weight-1',
      actorId: 'device-a',
      localValue: local,
      cloudValue: previous,
      cloudStamp: first.stamp,
      baseline: first.baseline,
      legacyResolve,
    });

    expect(result.value).toEqual(local);
    expect(result.source).toBe('local');
    expect(result.stamp.revision).toBe(5);
  });

  it('télécharge une modification cloud quand le local est inchangé', () => {
    const previous = { value: 'initial', updatedAt: '2030-01-01T00:00:00.000Z' };
    const first = resolveLogicalSyncState({
      accountUserId: 'account-1',
      domainId: 'weights',
      entityId: 'weight-1',
      actorId: 'device-a',
      localValue: previous,
      cloudValue: previous,
      cloudStamp: { revision: 2, actorId: 'device-a' },
      legacyResolve,
    });
    const cloud = { value: 'cloud', updatedAt: '2020-01-01T00:00:00.000Z' };
    const result = resolveLogicalSyncState({
      accountUserId: 'account-1',
      domainId: 'weights',
      entityId: 'weight-1',
      actorId: 'device-a',
      localValue: previous,
      cloudValue: cloud,
      cloudStamp: { revision: 3, actorId: 'device-b' },
      baseline: first.baseline,
      legacyResolve,
    });

    expect(result.value).toEqual(cloud);
    expect(result.source).toBe('cloud');
  });

  it('départage deux révisions identiques par identifiant d’appareil', () => {
    expect(compareLogicalSyncStamps(
      { revision: 7, actorId: 'device-b' },
      { revision: 7, actorId: 'device-a' },
    )).toBeGreaterThan(0);
  });

  it('ajoute et retire les champs de révision sans polluer le domaine', () => {
    const versioned = withLogicalSyncStamp(
      { id: '#weight-1', value: 70 },
      { revision: 3, actorId: 'device-a' },
    );

    expect(logicalSyncStamp(versioned)).toEqual({
      revision: 3,
      actorId: 'device-a',
    });
    expect(stripLogicalSyncFields(versioned)).toEqual({
      id: '#weight-1',
      value: 70,
    });
  });
});
