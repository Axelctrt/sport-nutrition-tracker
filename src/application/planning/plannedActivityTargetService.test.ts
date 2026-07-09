import { describe, expect, it, vi } from 'vitest';
import {
  recalculatePlannedActivityTargets,
  recalculatePlannedActivityTargetsForCurrentProfile,
} from '@/application/planning/plannedActivityTargetService';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

describe('plannedActivityTargetService', () => {
  it('recalcule une seule fois les journées actuelles et futures', async () => {
    const calculateTarget = vi.fn(async () => undefined);
    const profile = createEntity(createProfileInput());

    await recalculatePlannedActivityTargets(
      ['2026-07-08', '2026-07-09', '2026-07-10', '2026-07-10'],
      profile,
      { calculateTarget },
      '2026-07-09',
    );

    expect(calculateTarget).toHaveBeenCalledTimes(2);
    expect(calculateTarget).toHaveBeenNthCalledWith(1, '2026-07-09', profile);
    expect(calculateTarget).toHaveBeenNthCalledWith(2, '2026-07-10', profile);
  });

  it('ne fait pas échouer l’action principale si le profil est temporairement indisponible', async () => {
    const calculateTarget = vi.fn(async () => undefined);

    await expect(
      recalculatePlannedActivityTargetsForCurrentProfile(
        ['2026-07-10'],
        {
          calculateTarget,
          profile: {
            get: vi.fn(async () => {
              throw new Error('Impossible de lire le profil local.');
            }),
          },
        },
        '2026-07-09',
      ),
    ).resolves.toBeUndefined();

    expect(calculateTarget).not.toHaveBeenCalled();
  });

});
