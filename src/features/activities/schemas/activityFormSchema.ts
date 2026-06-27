import { z } from 'zod';
import { isValidLocalDate } from '@/shared/validation/localDate';

const optionalNumber = (schema: z.ZodNumber) => schema.optional();

export const activityFormSchema = z
  .object({
    activityType: z.enum([
      'running',
      'swimming',
      'strengthTraining',
      'cycling',
      'walking',
      'otherCardio',
    ]),
    date: z.string().refine(isValidLocalDate, 'Saisis une date valide.'),
    time: z
      .string()
      .refine(
        (value) => value === '' || /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
        'Saisis une heure valide.',
      ),
    durationMinutes: z
      .number({ message: 'Saisis une durée valide.' })
      .min(1, 'La durée doit être au moins de 1 minute.')
      .max(1_440, 'La durée ne peut pas dépasser 24 heures.'),
    intensity: z.enum(['low', 'moderate', 'high']),
    notes: z.string().trim().max(1_000, 'Les notes ne peuvent pas dépasser 1 000 caractères.'),
    intervalDetails: z.string().trim().max(2_000, 'Le détail des intervalles ne peut pas dépasser 2 000 caractères.'),
    manualCaloriesKcal: optionalNumber(
      z
        .number({ message: 'Saisis une valeur calorique valide.' })
        .min(0, 'Les calories ne peuvent pas être négatives.')
        .max(10_000, 'Les calories ne peuvent pas dépasser 10 000 kcal.'),
    ),
    runningSessionType: z.enum([
      'easy',
      'recovery',
      'longRun',
      'tempo',
      'intervals',
      'hills',
      'competition',
    ]),
    distanceKm: optionalNumber(
      z
        .number({ message: 'Saisis une distance valide.' })
        .min(0.1, 'La distance doit être au moins de 0,1 km.')
        .max(1_000, 'La distance ne peut pas dépasser 1 000 km.'),
    ),
    averageCadenceSpm: optionalNumber(
      z
        .number({ message: 'Saisis une cadence valide.' })
        .min(50, 'La cadence doit être au moins de 50 pas/min.')
        .max(300, 'La cadence ne peut pas dépasser 300 pas/min.'),
    ),
    elevationGainMeters: optionalNumber(
      z
        .number({ message: 'Saisis un dénivelé valide.' })
        .int('Le dénivelé doit être exprimé en mètres entiers.')
        .min(0, 'Le dénivelé ne peut pas être négatif.')
        .max(50_000, 'Le dénivelé ne peut pas dépasser 50 000 m.'),
    ),
    terrainType: z.enum(['road', 'track', 'trail', 'treadmill', 'mixed']),
    swimmingSessionType: z.enum([
      'recovery',
      'technique',
      'endurance',
      'tempo',
      'intervals',
      'competition',
    ]),
    mainStroke: z.enum([
      'freestyle',
      'breaststroke',
      'backstroke',
      'butterfly',
      'mixed',
      'drills',
    ]),
    distanceMeters: optionalNumber(
      z
        .number({ message: 'Saisis une distance valide.' })
        .int('La distance doit être exprimée en mètres entiers.')
        .min(25, 'La distance doit être au moins de 25 m.')
        .max(100_000, 'La distance ne peut pas dépasser 100 000 m.'),
    ),
    poolLengthMeters: optionalNumber(
      z
        .number({ message: 'Saisis une longueur de bassin valide.' })
        .refine((value) => value === 25 || value === 50, 'Choisis un bassin de 25 m ou 50 m.'),
    ),
    bikeType: z.enum(['road', 'gravel', 'mountain', 'city', 'indoor', 'other']),
    cyclingEnvironment: z.enum(['outdoor', 'indoor']),
    met: optionalNumber(
      z
        .number({ message: 'Saisis une valeur MET valide.' })
        .min(1, 'La valeur MET doit être au moins de 1.')
        .max(25, 'La valeur MET ne peut pas dépasser 25.'),
    ),
    includedInDailySteps: z.boolean(),
  })
  .superRefine((values, context) => {
    if (values.activityType === 'running') {
      if (values.distanceKm === undefined) {
        context.addIssue({ code: 'custom', path: ['distanceKm'], message: 'Saisis la distance de la course.' });
      }
      if (values.averageCadenceSpm === undefined) {
        context.addIssue({ code: 'custom', path: ['averageCadenceSpm'], message: 'Saisis la cadence moyenne.' });
      }
    }

    if (values.activityType === 'swimming' && values.distanceMeters === undefined) {
      context.addIssue({ code: 'custom', path: ['distanceMeters'], message: 'Saisis la distance nagée.' });
    }

    if (values.activityType === 'cycling' && values.distanceKm === undefined) {
      context.addIssue({ code: 'custom', path: ['distanceKm'], message: 'Saisis la distance parcourue à vélo.' });
    }

    if (
      ['strengthTraining', 'cycling', 'walking', 'otherCardio'].includes(values.activityType)
      && values.met === undefined
    ) {
      context.addIssue({ code: 'custom', path: ['met'], message: 'Saisis une valeur MET.' });
    }
  });

export type ActivityFormValues = z.infer<typeof activityFormSchema>;
