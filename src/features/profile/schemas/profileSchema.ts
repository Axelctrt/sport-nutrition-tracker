import { z } from 'zod';

const localDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function isValidLocalDate(value: string): boolean {
  if (!localDatePattern.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year ?? 0, (month ?? 1) - 1, day ?? 0);

  return date.getFullYear() === year
    && date.getMonth() === (month ?? 1) - 1
    && date.getDate() === day;
}

function calculateAgeFromBirthDate(value: string): number {
  const [year, month, day] = value.split('-').map(Number);
  const today = new Date();
  let age = today.getFullYear() - (year ?? today.getFullYear());
  const currentMonth = today.getMonth() + 1;
  const currentDay = today.getDate();

  if (currentMonth < (month ?? 1) || (currentMonth === month && currentDay < (day ?? 1))) {
    age -= 1;
  }

  return age;
}

export const profileFormSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .max(50, 'Le prénom ne peut pas dépasser 50 caractères.'),
    sexForEnergyEquation: z.enum(['male', 'female'], {
      message: 'Sélectionne le sexe utilisé pour l’équation énergétique.',
    }),
    ageMode: z.enum(['birthDate', 'age']),
    birthDate: z.string(),
    ageYears: z
      .number({ message: 'Saisis un âge valide.' })
      .int('L’âge doit être un nombre entier.')
      .min(13, 'L’âge minimum pris en charge est 13 ans.')
      .max(120, 'L’âge maximum pris en charge est 120 ans.'),
    heightCm: z
      .number({ message: 'Saisis une taille valide.' })
      .min(100, 'La taille doit être au moins de 100 cm.')
      .max(250, 'La taille ne peut pas dépasser 250 cm.'),
    initialWeightKg: z
      .number({ message: 'Saisis un poids valide.' })
      .min(30, 'Le poids doit être au moins de 30 kg.')
      .max(350, 'Le poids ne peut pas dépasser 350 kg.'),
    goal: z.enum(['loss', 'maintenance', 'gain']),
    targetWeeklyWeightChangePercent: z
      .number({ message: 'Saisis une variation hebdomadaire valide.' })
      .min(-2, 'La variation ne peut pas être inférieure à −2 % par semaine.')
      .max(2, 'La variation ne peut pas dépasser 2 % par semaine.'),
    occupationalActivity: z.enum([
      'sedentary',
      'lightlyActive',
      'active',
      'veryActive',
    ]),
    dailyStepGoal: z
      .number({ message: 'Saisis un objectif de pas valide.' })
      .int('L’objectif de pas doit être un nombre entier.')
      .min(0, 'L’objectif de pas ne peut pas être négatif.')
      .max(100_000, 'L’objectif de pas ne peut pas dépasser 100 000.'),
    proteinGramsPerKg: z
      .number({ message: 'Saisis un objectif de protéines valide.' })
      .min(0.5, 'Le coefficient doit être au moins de 0,5 g/kg.')
      .max(4, 'Le coefficient ne peut pas dépasser 4 g/kg.'),
    fatGramsPerKg: z
      .number({ message: 'Saisis un objectif de lipides valide.' })
      .min(0.3, 'Le coefficient doit être au moins de 0,3 g/kg.')
      .max(2, 'Le coefficient ne peut pas dépasser 2 g/kg.'),
  })
  .superRefine((values, context) => {
    if (values.ageMode === 'birthDate') {
      if (!values.birthDate) {
        context.addIssue({
          code: 'custom',
          path: ['birthDate'],
          message: 'Saisis une date de naissance.',
        });
      } else if (!isValidLocalDate(values.birthDate)) {
        context.addIssue({
          code: 'custom',
          path: ['birthDate'],
          message: 'La date de naissance est invalide.',
        });
      } else {
        const age = calculateAgeFromBirthDate(values.birthDate);

        if (age < 13 || age > 120) {
          context.addIssue({
            code: 'custom',
            path: ['birthDate'],
            message: 'La date doit correspondre à un âge compris entre 13 et 120 ans.',
          });
        }
      }
    }

    if (values.goal === 'loss' && values.targetWeeklyWeightChangePercent >= 0) {
      context.addIssue({
        code: 'custom',
        path: ['targetWeeklyWeightChangePercent'],
        message: 'Une perte de poids nécessite une variation négative.',
      });
    }

    if (values.goal === 'maintenance' && values.targetWeeklyWeightChangePercent !== 0) {
      context.addIssue({
        code: 'custom',
        path: ['targetWeeklyWeightChangePercent'],
        message: 'Le maintien utilise une variation de 0 %.',
      });
    }

    if (values.goal === 'gain' && values.targetWeeklyWeightChangePercent <= 0) {
      context.addIssue({
        code: 'custom',
        path: ['targetWeeklyWeightChangePercent'],
        message: 'Une prise de poids nécessite une variation positive.',
      });
    }
  });

export type ProfileFormValues = z.infer<typeof profileFormSchema>;
