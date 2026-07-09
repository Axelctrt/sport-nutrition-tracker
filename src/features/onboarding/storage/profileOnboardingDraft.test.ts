import {
  clearProfileOnboardingDraft,
  loadProfileOnboardingDraft,
  normalizeProfileOnboardingValues,
  profileOnboardingDraftStorageKey,
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

  it('cloisonne les brouillons entre l’espace invité et les comptes', () => {
    const guestValues = {
      ...DEFAULT_PROFILE_FORM_VALUES,
      firstName: 'Invité',
    };
    const accountValues = {
      ...DEFAULT_PROFILE_FORM_VALUES,
      firstName: 'Compte',
    };
    const accountSpaceId = 'account:acct-test' as const;

    expect(saveProfileOnboardingDraft(guestValues, 'guest')).toBe(true);
    expect(saveProfileOnboardingDraft(accountValues, accountSpaceId)).toBe(true);

    expect(profileOnboardingDraftStorageKey('guest')).not.toBe(
      profileOnboardingDraftStorageKey(accountSpaceId),
    );
    expect(loadProfileOnboardingDraft('guest')).toMatchObject({
      status: 'restored',
      draft: { values: { firstName: 'Invité' } },
    });
    expect(loadProfileOnboardingDraft(accountSpaceId)).toMatchObject({
      status: 'restored',
      draft: { values: { firstName: 'Compte' } },
    });

    expect(clearProfileOnboardingDraft(accountSpaceId)).toBe(true);
    expect(loadProfileOnboardingDraft(accountSpaceId)).toEqual({ status: 'empty' });
    expect(loadProfileOnboardingDraft('guest')).toMatchObject({
      status: 'restored',
      draft: { values: { firstName: 'Invité' } },
    });
  });

});
