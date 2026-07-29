import { recalculateExistingTargetsAfterSettingsChange } from '@/application/daily/settingsTargetRecalculationService';
import { createEntity } from '@/shared/utils/entities';
import { createProfileInput } from '@/test/factories/profileFactory';

describe('recalcul des objectifs après modification des réglages', () => {
  it('recalcule chaque journée existante une seule fois avec le profil courant', async () => {
    const profile = createEntity(createProfileInput(), 'profile');
    const calculateTarget = vi.fn(async () => undefined);

    const count = await recalculateExistingTargetsAfterSettingsChange({
      profile: { get: vi.fn(async () => profile) },
      targets: {
        listTargetsBetween: vi.fn(async () => [
          { date: '2026-07-18' },
          { date: '2026-07-19' },
          { date: '2026-07-19' },
        ] as never),
      },
      calculateTarget,
    });

    expect(count).toBe(2);
    expect(calculateTarget).toHaveBeenNthCalledWith(
      1,
      '2026-07-18',
      profile,
    );
    expect(calculateTarget).toHaveBeenNthCalledWith(
      2,
      '2026-07-19',
      profile,
    );
  });

  it('ne fait rien tant que le profil n’existe pas', async () => {
    const calculateTarget = vi.fn();
    const count = await recalculateExistingTargetsAfterSettingsChange({
      profile: { get: vi.fn(async () => undefined) },
      targets: { listTargetsBetween: vi.fn() },
      calculateTarget,
    });

    expect(count).toBe(0);
    expect(calculateTarget).not.toHaveBeenCalled();
  });
});
