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
    title: 'Comment souhaitez-vous être appelé dans SportPilot ?',
    description: 'Ce nom reste local au profil et peut être modifié plus tard.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.sex]: {
    eyebrow: 'Informations personnelles',
    title: 'Quel sexe doit être utilisé pour les calculs énergétiques ?',
    description: 'Cette donnée sert uniquement aux équations de dépense énergétique.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.birthDate]: {
    eyebrow: 'Informations personnelles',
    title: 'Quelle est votre date de naissance ?',
    description: 'Vous pouvez utiliser les sélecteurs ou saisir directement la date.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.height]: {
    eyebrow: 'Mesures',
    title: 'Quelle est votre taille ?',
    description: 'La valeur est enregistrée en centimètres.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.weight]: {
    eyebrow: 'Mesures',
    title: 'Quel est votre poids actuel ?',
    description: 'Cette valeur initiale servira de référence tant qu’aucune pesée plus récente n’existe.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.goal]: {
    eyebrow: 'Objectif',
    title: 'Quel est votre objectif principal ?',
    description: 'La variation hebdomadaire reste ajustable sur ce même écran.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.activity]: {
    eyebrow: 'Activité quotidienne',
    title: 'À quoi ressemble votre activité professionnelle ?',
    description: 'Choisissez le niveau qui décrit le mieux une journée habituelle hors sport.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.steps]: {
    eyebrow: 'Activité quotidienne',
    title: 'Quel objectif de pas souhaitez-vous viser chaque jour ?',
    description: 'Vous pourrez l’ajuster à tout moment depuis votre profil.',
  },
  [PROFILE_ONBOARDING_STEP_IDS.summary]: {
    eyebrow: 'Dernière vérification',
    title: 'Vérifiez votre configuration',
    description: 'Relisez les informations avant de commencer avec SportPilot.',
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
