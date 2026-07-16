import type { ProfileFormValues } from '@/features/profile/schemas/profileSchema';
import { profileFormSchema } from '@/features/profile/schemas/profileSchema';

export const LEGACY_PROFILE_ONBOARDING_STEP_ID = 'profile';

export const PROFILE_ONBOARDING_STEP_IDS = {
  name: 'name',
  sex: 'sex',
  birthDate: 'birth-date',
  height: 'height',
  weight: 'weight',
  goal: 'goal',
  activity: 'activity',
  steps: 'steps',
  summary: 'summary',
} as const;

export type ProfileOnboardingStepId =
  typeof PROFILE_ONBOARDING_STEP_IDS[keyof typeof PROFILE_ONBOARDING_STEP_IDS];

export const PROFILE_ONBOARDING_STEPS = [
  { id: PROFILE_ONBOARDING_STEP_IDS.name },
  { id: PROFILE_ONBOARDING_STEP_IDS.sex },
  { id: PROFILE_ONBOARDING_STEP_IDS.birthDate },
  { id: PROFILE_ONBOARDING_STEP_IDS.height },
  { id: PROFILE_ONBOARDING_STEP_IDS.weight },
  { id: PROFILE_ONBOARDING_STEP_IDS.goal },
  { id: PROFILE_ONBOARDING_STEP_IDS.activity },
  { id: PROFILE_ONBOARDING_STEP_IDS.steps },
  { id: PROFILE_ONBOARDING_STEP_IDS.summary },
] as const;

export const PROFILE_ONBOARDING_STEP_COPY: Record<
  ProfileOnboardingStepId,
  { eyebrow: string; title: string; description: string }
> = {
  [PROFILE_ONBOARDING_STEP_IDS.name]: {
    eyebrow: 'Votre profil',
    title: 'Comment vous appeler ?',
    description: 'Ce nom sera utilisé dans l’application.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.sex]: {
    eyebrow: 'Informations personnelles',
    title: 'Sexe utilisé pour les calculs',
    description: 'Choisissez la référence utilisée par les formules énergétiques.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.birthDate]: {
    eyebrow: 'Informations personnelles',
    title: 'Quelle est votre date de naissance ?',
    description: 'Faites défiler chaque colonne.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.height]: {
    eyebrow: 'Mesures',
    title: 'Quelle est votre taille ?',
    description: 'Faites défiler pour sélectionner votre taille.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.weight]: {
    eyebrow: 'Mesures',
    title: 'Quel est votre poids actuel ?',
    description: 'Sélectionnez votre poids de départ.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.goal]: {
    eyebrow: 'Objectif',
    title: 'Quel est votre objectif ?',
    description: 'Vous pourrez modifier cet objectif plus tard.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.activity]: {
    eyebrow: 'Activité quotidienne',
    title: 'Quel est votre niveau d’activité ?',
    description: 'En dehors de vos séances sportives.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.steps]: {
    eyebrow: 'Activité quotidienne',
    title: 'Quel objectif de pas quotidien ?',
    description: 'Choisissez un objectif adapté à votre quotidien.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.summary]: {
    eyebrow: 'Dernière vérification',
    title: 'Votre profil est prêt',
    description: 'Vérifiez les informations principales avant de commencer.',
  },
};

const stepFields: Record<ProfileOnboardingStepId, readonly (keyof ProfileFormValues)[]> = {
  [PROFILE_ONBOARDING_STEP_IDS.name]: ['firstName'],
  [PROFILE_ONBOARDING_STEP_IDS.sex]: ['sexForEnergyEquation'],
  [PROFILE_ONBOARDING_STEP_IDS.birthDate]: ['ageMode', 'birthDate', 'ageYears'],
  [PROFILE_ONBOARDING_STEP_IDS.height]: ['heightCm'],
  [PROFILE_ONBOARDING_STEP_IDS.weight]: ['initialWeightKg'],
  [PROFILE_ONBOARDING_STEP_IDS.goal]: ['goal', 'targetWeeklyWeightChangePercent'],
  [PROFILE_ONBOARDING_STEP_IDS.activity]: ['occupationalActivity'],
  [PROFILE_ONBOARDING_STEP_IDS.steps]: ['dailyStepGoal'],
  [PROFILE_ONBOARDING_STEP_IDS.summary]: [],
};

const fieldStep = Object.fromEntries(
  Object.entries(stepFields).flatMap(([stepId, fields]) =>
    fields.map((field) => [field, stepId]),
  ),
) as Partial<Record<keyof ProfileFormValues, ProfileOnboardingStepId>>;

export type ProfileOnboardingErrors = Partial<Record<keyof ProfileFormValues, string>>;

export function isProfileOnboardingStepId(value: string): value is ProfileOnboardingStepId {
  return PROFILE_ONBOARDING_STEPS.some((step) => step.id === value);
}

export function normalizeProfileOnboardingStepId(value: string): ProfileOnboardingStepId {
  if (isProfileOnboardingStepId(value)) return value;
  return PROFILE_ONBOARDING_STEP_IDS.name;
}

function collectErrors(values: ProfileFormValues): ProfileOnboardingErrors {
  const result = profileFormSchema.safeParse(values);
  if (result.success) return {};

  const errors: ProfileOnboardingErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || field in errors) continue;
    errors[field as keyof ProfileFormValues] = issue.message;
  }

  return errors;
}

export function validateProfileOnboardingStep(
  stepId: ProfileOnboardingStepId,
  values: ProfileFormValues,
): ProfileOnboardingErrors {
  const errors = collectErrors(values);
  const allowedFields = new Set(stepFields[stepId]);

  return Object.fromEntries(
    Object.entries(errors).filter(([field]) => allowedFields.has(field as keyof ProfileFormValues)),
  ) as ProfileOnboardingErrors;
}

export function validateCompleteProfileOnboarding(values: ProfileFormValues): {
  errors: ProfileOnboardingErrors;
  firstInvalidStepId?: ProfileOnboardingStepId;
  parsedValues?: ProfileFormValues;
} {
  const result = profileFormSchema.safeParse(values);
  if (result.success) {
    return { errors: {}, parsedValues: result.data };
  }

  const errors = collectErrors(values);
  const firstField = Object.keys(errors)[0] as keyof ProfileFormValues | undefined;
  const firstInvalidStepId = firstField ? fieldStep[firstField] : undefined;

  return {
    errors,
    ...(firstInvalidStepId ? { firstInvalidStepId } : {}),
  };
}
