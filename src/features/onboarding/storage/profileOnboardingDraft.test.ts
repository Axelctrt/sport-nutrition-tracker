import {
  loadProfileOnboardingDraft,
  normalizeProfileOnboardingValues,
  saveProfileOnboardingDraft,
} from '@/features/onboarding/storage/profileOnboardingDraft';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';

describe('profileOnboardingDraft', () => {
  it('normalise les champs connus et remplace les valeurs non finies', () => {
    expect(normalizeProfileOnboardingValues({
      firstName: 'Maya',
      sexForEnergyEquation: 'female',
      ageYears: Number.NaN,
      heightCm: 168,
      goal: 'loss',
      occupationalActivity: 'active',
    })).toMatchObject({
      firstName: 'Maya',
      sexForEnergyEquation: 'female',
      ageYears: DEFAULT_PROFILE_FORM_VALUES.ageYears,
      heightCm: 168,
      goal: 'loss',
      occupationalActivity: 'active',
    });
  });

  it('restaure les réponses valides après fermeture', () => {
    const values = {
      ...DEFAULT_PROFILE_FORM_VALUES,
      firstName: 'Camille',
      heightCm: 181,
    };

    expect(saveProfileOnboardingDraft(values)).toBe(true);
    expect(loadProfileOnboardingDraft()).toMatchObject({
      status: 'restored',
      draft: {
        stepId: 'profile',
        values,
      },
    });
  });
});
