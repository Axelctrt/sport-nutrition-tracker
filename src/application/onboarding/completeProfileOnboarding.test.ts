import { vi } from 'vitest';
import { completeProfileOnboarding } from '@/application/onboarding/completeProfileOnboarding';
import { createProfileInput } from '@/test/factories/profileFactory';
import { createEntity } from '@/shared/utils/entities';
import type { WeightEntry } from '@/domain/models/weight';

describe('completeProfileOnboarding', () => {
  it('crée la première pesée avant le profil quand aucun historique n’existe', async () => {
    const profileInput = createProfileInput({ initialWeightKg: 68.4 });
    const savedProfile = createEntity(profileInput, 'local-user-profile');
    const listAll = vi.fn().mockResolvedValue([]);
    const upsert = vi.fn().mockResolvedValue(createEntity<WeightEntry>({
      date: '2026-07-10',
      weightKg: 68.4,
    }, 'weight:2026-07-10'));
    const saveProfile = vi.fn().mockResolvedValue(savedProfile);

    const result = await completeProfileOnboarding(profileInput, {
      saveProfile,
      weightRepository: { listAll, upsert },
      today: () => '2026-07-10',
    });

    expect(upsert).toHaveBeenCalledWith({
      date: '2026-07-10',
      weightKg: 68.4,
      provenance: 'profileInitialization',
    });
    expect(saveProfile).toHaveBeenCalledWith(profileInput);
    expect(upsert.mock.invocationCallOrder[0]!).toBeLessThan(saveProfile.mock.invocationCallOrder[0]!);
    expect(result).toEqual({ profile: savedProfile, initialWeightCreated: true });
  });

  it('préserve un historique restauré sans créer de doublon', async () => {
    const profileInput = createProfileInput({ initialWeightKg: 68.4 });
    const savedProfile = createEntity(profileInput, 'local-user-profile');
    const listAll = vi.fn().mockResolvedValue([
      createEntity<WeightEntry>({ date: '2026-07-01', weightKg: 69 }, 'weight:2026-07-01'),
    ]);
    const upsert = vi.fn();
    const saveProfile = vi.fn().mockResolvedValue(savedProfile);

    const result = await completeProfileOnboarding(profileInput, {
      saveProfile,
      weightRepository: { listAll, upsert },
    });

    expect(upsert).not.toHaveBeenCalled();
    expect(saveProfile).toHaveBeenCalledWith(profileInput);
    expect(result.initialWeightCreated).toBe(false);
  });

  it('ne crée pas le profil si la première pesée échoue', async () => {
    const profileInput = createProfileInput();
    const saveProfile = vi.fn();
    const failure = new Error('Poids indisponible');

    await expect(completeProfileOnboarding(profileInput, {
      saveProfile,
      weightRepository: {
        listAll: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockRejectedValue(failure),
      },
    })).rejects.toBe(failure);

    expect(saveProfile).not.toHaveBeenCalled();
  });
});
