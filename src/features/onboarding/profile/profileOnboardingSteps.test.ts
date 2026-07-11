import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
import {
  LEGACY_PROFILE_ONBOARDING_STEP_ID,
  PROFILE_ONBOARDING_STEP_IDS,
  normalizeProfileOnboardingStepId,
  validateCompleteProfileOnboarding,
  validateProfileOnboardingStep,
} from '@/features/onboarding/profile/profileOnboardingSteps';

describe('profileOnboardingSteps', () => {
  it('reprend une étape connue et convertit l’ancienne étape monolithique', () => {
    expect(normalizeProfileOnboardingStepId(PROFILE_ONBOARDING_STEP_IDS.summary)).toBe(
      PROFILE_ONBOARDING_STEP_IDS.summary,
    );
    expect(normalizeProfileOnboardingStepId(PROFILE_ONBOARDING_STEP_IDS.height)).toBe(
      PROFILE_ONBOARDING_STEP_IDS.height,
    );
    expect(normalizeProfileOnboardingStepId(LEGACY_PROFILE_ONBOARDING_STEP_ID)).toBe(
      PROFILE_ONBOARDING_STEP_IDS.name,
    );
    expect(normalizeProfileOnboardingStepId('unknown')).toBe(PROFILE_ONBOARDING_STEP_IDS.name);
  });

  it('ne renvoie que les erreurs de l’étape courante', () => {
    const values = {
      ...DEFAULT_PROFILE_FORM_VALUES,
      heightCm: 80,
      initialWeightKg: 10,
    };

    expect(validateProfileOnboardingStep(PROFILE_ONBOARDING_STEP_IDS.height, values)).toEqual({
      heightCm: 'La taille doit être au moins de 100 cm.',
    });
    expect(validateProfileOnboardingStep(PROFILE_ONBOARDING_STEP_IDS.weight, values)).toEqual({
      initialWeightKg: 'Le poids doit être au moins de 30 kg.',
    });
    expect(validateProfileOnboardingStep(PROFILE_ONBOARDING_STEP_IDS.summary, values)).toEqual({});
  });

  it('associe une erreur complète à la bonne étape', () => {
    const result = validateCompleteProfileOnboarding({
      ...DEFAULT_PROFILE_FORM_VALUES,
      goal: 'loss',
      targetWeeklyWeightChangePercent: 0,
    });

    expect(result.firstInvalidStepId).toBe(PROFILE_ONBOARDING_STEP_IDS.goal);
    expect(result.errors.targetWeeklyWeightChangePercent).toMatch(/variation négative/);
  });
});
