import type { DataSpaceId } from '@/domain/data-spaces/dataSpace';
import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import {
  LEGACY_PROFILE_ONBOARDING_STEP_ID,
  PROFILE_ONBOARDING_STEP_IDS,
  normalizeProfileOnboardingStepId,
  type ProfileOnboardingStepId,
} from '@/features/onboarding/profile/profileOnboardingSteps';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  onboardingDraftStorageKeyForScope,
  saveOnboardingDraft,
  type OnboardingDraftLoadResult,
} from '@/features/onboarding/storage/onboardingDraftStorage';
import { activeDataSpace } from '@/infrastructure/database/database';

export const STORAGE_ONBOARDING_STEP_ID = 'storage';
export const PROFILE_ONBOARDING_STEP_ID = LEGACY_PROFILE_ONBOARDING_STEP_ID;

const sexValues = new Set<ProfileFormValues['sexForEnergyEquation']>(['male', 'female']);
const ageModeValues = new Set<ProfileFormValues['ageMode']>(['birthDate', 'age']);
const goalValues = new Set<ProfileFormValues['goal']>(['loss', 'maintenance', 'gain']);
const activityValues = new Set<ProfileFormValues['occupationalActivity']>([
  'sedentary',
  'lightlyActive',
  'active',
  'veryActive',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeProfileOnboardingValues(value: unknown): ProfileFormValues {
  if (!isRecord(value)) return { ...DEFAULT_PROFILE_FORM_VALUES };

  return {
    firstName: typeof value.firstName === 'string'
      ? value.firstName.slice(0, 50)
      : DEFAULT_PROFILE_FORM_VALUES.firstName,
    sexForEnergyEquation: sexValues.has(value.sexForEnergyEquation as ProfileFormValues['sexForEnergyEquation'])
      ? value.sexForEnergyEquation as ProfileFormValues['sexForEnergyEquation']
      : DEFAULT_PROFILE_FORM_VALUES.sexForEnergyEquation,
    ageMode: ageModeValues.has(value.ageMode as ProfileFormValues['ageMode'])
      ? value.ageMode as ProfileFormValues['ageMode']
      : DEFAULT_PROFILE_FORM_VALUES.ageMode,
    birthDate: typeof value.birthDate === 'string'
      ? value.birthDate
      : DEFAULT_PROFILE_FORM_VALUES.birthDate,
    ageYears: finiteNumber(value.ageYears, DEFAULT_PROFILE_FORM_VALUES.ageYears),
    heightCm: finiteNumber(value.heightCm, DEFAULT_PROFILE_FORM_VALUES.heightCm),
    initialWeightKg: finiteNumber(
      value.initialWeightKg,
      DEFAULT_PROFILE_FORM_VALUES.initialWeightKg,
    ),
    goal: goalValues.has(value.goal as ProfileFormValues['goal'])
      ? value.goal as ProfileFormValues['goal']
      : DEFAULT_PROFILE_FORM_VALUES.goal,
    targetWeeklyWeightChangePercent: finiteNumber(
      value.targetWeeklyWeightChangePercent,
      DEFAULT_PROFILE_FORM_VALUES.targetWeeklyWeightChangePercent,
    ),
    occupationalActivity: activityValues.has(
      value.occupationalActivity as ProfileFormValues['occupationalActivity'],
    )
      ? value.occupationalActivity as ProfileFormValues['occupationalActivity']
      : DEFAULT_PROFILE_FORM_VALUES.occupationalActivity,
    dailyStepGoal: finiteNumber(value.dailyStepGoal, DEFAULT_PROFILE_FORM_VALUES.dailyStepGoal),
    proteinGramsPerKg: finiteNumber(
      value.proteinGramsPerKg,
      DEFAULT_PROFILE_FORM_VALUES.proteinGramsPerKg,
    ),
    fatGramsPerKg: finiteNumber(
      value.fatGramsPerKg,
      DEFAULT_PROFILE_FORM_VALUES.fatGramsPerKg,
    ),
  };
}

export function profileOnboardingDraftStorageKey(
  dataSpaceId: DataSpaceId = activeDataSpace.id,
): string {
  return onboardingDraftStorageKeyForScope(dataSpaceId);
}

export function loadProfileOnboardingDraft(
  dataSpaceId: DataSpaceId = activeDataSpace.id,
  storage?: Storage,
): OnboardingDraftLoadResult<ProfileFormValues> {
  const result = loadOnboardingDraft(
    normalizeProfileOnboardingValues,
    storage,
    profileOnboardingDraftStorageKey(dataSpaceId),
  );

  if (result.status !== 'restored') return result;

  return {
    status: 'restored',
    draft: {
      ...result.draft,
      stepId: normalizeProfileOnboardingStepId(result.draft.stepId),
    },
  };
}

export function saveProfileOnboardingDraft(
  values: ProfileFormValues,
  stepId: ProfileOnboardingStepId = PROFILE_ONBOARDING_STEP_IDS.name,
  dataSpaceId: DataSpaceId = activeDataSpace.id,
  storage?: Storage,
): boolean {
  return saveOnboardingDraft(
    stepId,
    values,
    storage,
    profileOnboardingDraftStorageKey(dataSpaceId),
  );
}

export function clearProfileOnboardingDraft(
  dataSpaceId: DataSpaceId = activeDataSpace.id,
  storage?: Storage,
): boolean {
  return clearOnboardingDraft(
    storage,
    profileOnboardingDraftStorageKey(dataSpaceId),
  );
}
