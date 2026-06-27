import { z } from 'zod';

const optionalNumber = (schema: z.ZodNumber) => schema.optional();

export const enduranceTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Saisis un nom.').max(200, 'Le nom est trop long.'),
  activityType: z.enum(['running', 'swimming', 'cycling']),
  durationMinutes: z.number().min(1).max(1_440),
  intensity: z.enum(['low', 'moderate', 'high']),
  notes: z.string().trim().max(2_000),
  intervalDetails: z.string().trim().max(2_000),
  runningSessionType: z.enum(['easy', 'recovery', 'longRun', 'tempo', 'intervals', 'hills', 'competition']),
  swimmingSessionType: z.enum(['recovery', 'technique', 'endurance', 'tempo', 'intervals', 'competition']),
  mainStroke: z.enum(['freestyle', 'breaststroke', 'backstroke', 'butterfly', 'mixed', 'drills']),
  distanceKm: optionalNumber(z.number().min(0.1).max(1_000)),
  distanceMeters: optionalNumber(z.number().int().min(25).max(100_000)),
  averageCadenceSpm: optionalNumber(z.number().min(50).max(300)),
  elevationGainMeters: optionalNumber(z.number().int().min(0).max(50_000)),
  terrainType: z.enum(['road', 'track', 'trail', 'treadmill', 'mixed']),
  poolLengthMeters: optionalNumber(z.number().refine((value) => value === 25 || value === 50)),
  cyclingMet: optionalNumber(z.number().min(1).max(25)),
  bikeType: z.enum(['road', 'gravel', 'mountain', 'city', 'indoor', 'other']),
  cyclingEnvironment: z.enum(['outdoor', 'indoor']),
});

export type EnduranceTemplateFormValues = z.infer<typeof enduranceTemplateSchema>;
