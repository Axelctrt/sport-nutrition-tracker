import { profileFormSchema } from '@/features/profile/schemas/profileSchema';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';

function parseWith(overrides: Partial<typeof DEFAULT_PROFILE_FORM_VALUES>) {
  return profileFormSchema.safeParse({
    ...DEFAULT_PROFILE_FORM_VALUES,
    ...overrides,
  });
}

describe('profileFormSchema', () => {
  it('accepte les valeurs initiales raisonnables', () => {
    expect(profileFormSchema.safeParse(DEFAULT_PROFILE_FORM_VALUES).success).toBe(true);
  });

  it('impose une variation négative pour une perte de poids', () => {
    const result = parseWith({
      goal: 'loss',
      targetWeeklyWeightChangePercent: 0.5,
    });

    expect(result.success).toBe(false);
  });

  it('refuse une date de naissance invalide', () => {
    const result = parseWith({
      ageMode: 'birthDate',
      birthDate: '2000-02-31',
    });

    expect(result.success).toBe(false);
  });

  it('accepte une prise de poids avec variation positive', () => {
    const result = parseWith({
      goal: 'gain',
      targetWeeklyWeightChangePercent: 0.25,
    });

    expect(result.success).toBe(true);
  });
});
