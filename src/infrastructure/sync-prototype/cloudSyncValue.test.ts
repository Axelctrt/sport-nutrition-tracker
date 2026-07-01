import { describe, expect, it } from 'vitest';
import {
  belongsToCurrentUser,
  chooseLatest,
  cloudPrivateId,
  localIdFromCloud,
  sameEntity,
  stableValue,
  stripCloudFields,
} from '@/infrastructure/sync-prototype/cloudSyncValue';

describe('cloudSyncValue', () => {
  it('retire uniquement les métadonnées techniques Dexie Cloud', () => {
    expect(stripCloudFields({
      id: '#entity-1',
      label: 'Test',
      owner: 'user-1',
      realmId: 'rlm-public',
      $ts: { client: 2 },
      _hasBlobRefs: 1,
    })).toEqual({ id: '#entity-1', label: 'Test' });
  });

  it('compare récursivement les objets sans dépendre de l’ordre des clés', () => {
    const left = {
      id: 'entity-1',
      nested: { beta: 2, alpha: 1 },
      values: [{ zeta: 6, gamma: 3 }],
    };
    const right = {
      values: [{ gamma: 3, zeta: 6 }],
      nested: { alpha: 1, beta: 2 },
      id: 'entity-1',
    };

    expect(stableValue(left)).toBe(stableValue(right));
    expect(sameEntity(left, right)).toBe(true);
  });

  it('départage les conflits par updatedAt puis de manière déterministe', () => {
    const older = { id: 'entity-1', updatedAt: '2026-06-01T10:00:00.000Z', value: 9 };
    const newer = { id: 'entity-1', updatedAt: '2026-06-02T10:00:00.000Z', value: 1 };
    expect(chooseLatest(older, newer)).toBe(newer);

    const local = { id: 'entity-1', updatedAt: newer.updatedAt, value: 1 };
    const cloud = { id: 'entity-1', updatedAt: newer.updatedAt, value: 2 };
    const first = chooseLatest(local, cloud);
    const second = chooseLatest(cloud, local);
    expect(first).toEqual(second);
  });

  it('convertit les identifiants privés sans double préfixe', () => {
    expect(cloudPrivateId('entity-1')).toBe('#entity-1');
    expect(cloudPrivateId('#entity-1')).toBe('#entity-1');
    expect(localIdFromCloud('#entity-1')).toBe('entity-1');
    expect(localIdFromCloud('entity-1')).toBeUndefined();
  });

  it('isole les lignes appartenant au compte courant', () => {
    expect(belongsToCurrentUser({ id: '#entity-1' }, 'user-1')).toBe(true);
    expect(belongsToCurrentUser({ id: '#entity-1', owner: 'user-1' }, 'user-1')).toBe(true);
    expect(belongsToCurrentUser({ id: '#entity-1', owner: 'user-2' }, 'user-1')).toBe(false);
  });
});
