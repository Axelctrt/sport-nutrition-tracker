import { z } from 'zod';
import { FRIENDS_PRIVACY_SETTINGS_ID } from '@/domain/friends/friendship';
import {
  DELETION_ENTITY_TYPES,
  deletionRecordId,
} from '@/domain/models/deletion';
import { normalizeRoutineReminderPreferences } from '@/domain/reminders/routineReminder';
import { DEFAULT_ENDURANCE_TEMPLATES } from '@/domain/defaults/appSettings';
import {
  createDefaultDashboardPreferences,
  DASHBOARD_QUICK_ACTION_IDS,
  DASHBOARD_SUMMARY_METRIC_IDS,
  DASHBOARD_WIDGET_IDS,
  normalizeDashboardPreferences,
} from "@/domain/dashboard/dashboardPreferences";
import { APP_SETTINGS_ID, LOCAL_USER_PROFILE_ID, USER_SETTINGS_ID } from '@/domain/defaults/identifiers';
import {
  BACKUP_USER_STATE_TABLE_NAMES,
  type BackupEnvelope,
} from '@/domain/models/backup';
import {
  VISUAL_THEME_PREFERENCE_ID,
  routineReminderCompletionId,
  weeklyMissionCompletionId,
} from '@/infrastructure/user-state/userStateModels';
import { isValidLocalDate } from '@/shared/validation/localDate';
import {
  socialActivityGlobalSharingPolicySchema,
  socialActivitySharingOverrideSchema,
} from '@/shared/validation/socialActivitySharingSchema';

import { achievementCatalog } from '@/domain/rewards/achievements';
import { visualThemeCatalog } from '@/domain/rewards/visualThemes';
const finiteNumber = z.number().finite();
const nonNegativeNumber = finiteNumber.min(0);
const positiveNumber = finiteNumber.positive();
const nonNegativeInteger = z.number().int().min(0);
const positiveInteger = z.number().int().positive();

const localDateSchema = z.string().refine(isValidLocalDate, 'Date locale invalide.');
const isoDateTimeSchema = z.string().refine(
  (value) => !Number.isNaN(Date.parse(value)),
  'Horodatage ISO invalide.',
);
const localTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Heure locale invalide.');

const entityMetadataSchema = z.object({
  id: z.string().min(1),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const datedEntitySchema = entityMetadataSchema.extend({
  date: localDateSchema,
});

const nutritionValuesSchema = z.object({
  caloriesKcal: nonNegativeNumber,
  proteinGrams: nonNegativeNumber,
  carbohydratesGrams: nonNegativeNumber,
  fatGrams: nonNegativeNumber,
  fiberGrams: nonNegativeNumber.optional(),
  saltGrams: nonNegativeNumber.optional(),
});

const ageInformationSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('birthDate'),
    birthDate: localDateSchema,
  }),
  z.object({
    mode: z.literal('age'),
    ageYears: z.number().int().min(1).max(150),
    recordedOn: localDateSchema,
  }),
]);

const profileImpactHistoryEntrySchema = z.object({
  id: z.string().min(1),
  changedAt: isoDateTimeSchema,
  effectiveDate: localDateSchema,
  changedFields: z.array(z.enum([
    'sexForEnergyEquation',
    'ageInformation',
    'heightCm',
    'initialWeightKg',
    'goal',
    'targetWeeklyWeightChangePercent',
    'occupationalActivity',
    'dailyStepGoal',
    'proteinGramsPerKg',
    'fatGramsPerKg',
  ])).max(10),
  summary: z.string().min(1).max(300),
  beforeTargetCaloriesKcal: nonNegativeNumber,
  afterTargetCaloriesKcal: nonNegativeNumber,
  beforeMacros: z.object({
    proteinGrams: nonNegativeNumber,
    carbohydratesGrams: nonNegativeNumber,
    fatGrams: nonNegativeNumber,
  }),
  afterMacros: z.object({
    proteinGrams: nonNegativeNumber,
    carbohydratesGrams: nonNegativeNumber,
    fatGrams: nonNegativeNumber,
  }),
});

const userProfileSchema = entityMetadataSchema.extend({
  firstName: z.string().max(100).optional(),
  sexForEnergyEquation: z.enum(['male', 'female']),
  ageInformation: ageInformationSchema,
  heightCm: positiveNumber,
  initialWeightKg: positiveNumber,
  goal: z.enum(['loss', 'maintenance', 'gain']),
  targetWeeklyWeightChangePercent: finiteNumber,
  occupationalActivity: z.enum(['sedentary', 'lightlyActive', 'active', 'veryActive']),
  dailyStepGoal: nonNegativeInteger,
  proteinGramsPerKg: nonNegativeNumber,
  fatGramsPerKg: nonNegativeNumber,
  profileImpactHistory: z.array(profileImpactHistoryEntrySchema).max(12).optional(),
});

const swimmingMetValuesSchema = z.object({
  recovery: nonNegativeNumber,
  technique: nonNegativeNumber,
  endurance: nonNegativeNumber,
  tempo: nonNegativeNumber,
  intervals: nonNegativeNumber,
  competition: nonNegativeNumber,
});


const enduranceTemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(200),
  activityType: z.enum(['running', 'swimming', 'cycling']),
  durationMinutes: positiveNumber,
  intensity: z.enum(['low', 'moderate', 'high']),
  notes: z.string().max(2_000).optional(),
  runningSessionType: z.enum(['easy', 'recovery', 'longRun', 'tempo', 'intervals', 'hills', 'competition']).optional(),
  distanceKm: positiveNumber.optional(),
  averageCadenceSpm: positiveNumber.optional(),
  elevationGainMeters: nonNegativeNumber.optional(),
  terrainType: z.enum(['road', 'track', 'trail', 'treadmill', 'mixed']).optional(),
  swimmingSessionType: z.enum(['recovery', 'technique', 'endurance', 'tempo', 'intervals', 'competition']).optional(),
  mainStroke: z.enum(['freestyle', 'breaststroke', 'backstroke', 'butterfly', 'mixed', 'drills']).optional(),
  distanceMeters: positiveNumber.optional(),
  poolLengthMeters: z.union([z.literal(25), z.literal(50)]).optional(),
  cyclingMet: positiveNumber.optional(),
  bikeType: z.enum(['road', 'gravel', 'mountain', 'city', 'indoor', 'other']).optional(),
  cyclingEnvironment: z.enum(['outdoor', 'indoor']).optional(),
  intervalDetails: z.string().max(2_000).optional(),
});


const dashboardWidgetIdSchema = z.enum(DASHBOARD_WIDGET_IDS);
const dashboardQuickActionIdSchema = z.enum(DASHBOARD_QUICK_ACTION_IDS);
const dashboardSummaryMetricIdSchema = z.enum(DASHBOARD_SUMMARY_METRIC_IDS);

const dashboardPreferencesSchema = z.object({
  preset: z.enum(['balanced', 'nutrition', 'training', 'minimal', 'custom']),
  order: z.array(dashboardWidgetIdSchema),
  hidden: z.array(dashboardWidgetIdSchema),
  quickActions: z.array(dashboardQuickActionIdSchema).default(
    createDefaultDashboardPreferences().quickActions,
  ),
  summaryMetrics: z.array(dashboardSummaryMetricIdSchema).default(
    createDefaultDashboardPreferences().summaryMetrics,
  ),
  supplementalBlock: z.enum(['none', 'weeklyProgress', 'achievements']).optional(),
}).transform(({ supplementalBlock, ...preferences }) => normalizeDashboardPreferences({
  ...preferences,
  ...(supplementalBlock ? { supplementalBlock } : {}),
}));

const appSettingsSchema = entityMetadataSchema.extend({
  syncableUpdatedAt: isoDateTimeSchema.optional(),
  routineReminderUpdatedAt: isoDateTimeSchema.optional(),
  theme: z.enum(['system', 'light', 'dark']),
  includedBaseSteps: nonNegativeInteger,
  walkingKcalPerKgPerKm: nonNegativeNumber,
  runningKcalPerKgPerKm: nonNegativeNumber,
  strengthTrainingMet: nonNegativeNumber,
  calorieFloorBmrMultiplier: nonNegativeNumber,
  defaultCyclingMet: nonNegativeNumber,
  defaultWalkingMet: nonNegativeNumber,
  defaultOtherCardioMet: nonNegativeNumber,
  swimmingMetValues: swimmingMetValuesSchema,
  maximumWeeklyAdjustmentKcal: nonNegativeNumber,
  maximumCumulativeAdjustmentKcal: nonNegativeNumber,
  requestPersistentStorage: z.boolean(),
  backupReminderIntervalDays: z.union([z.literal(0), z.literal(7), z.literal(14), z.literal(30)]).default(0),
  restTimerAutoStart: z.boolean().default(true),
  restTimerSoundEnabled: z.boolean().default(false),
  restTimerVibrationEnabled: z.boolean().default(true),
  enduranceTemplates: z.array(enduranceTemplateSchema).default(
    DEFAULT_ENDURANCE_TEMPLATES.map((template) => ({ ...template })),
  ),
  enduranceTemplatesVersion: positiveInteger.default(1),
  dashboardPreferences: dashboardPreferencesSchema.default(
    createDefaultDashboardPreferences(),
  ),
  routineReminderPreferences: z.unknown().optional().transform((value) =>
    normalizeRoutineReminderPreferences(value),
  ),
  lastBackupExportedAt: isoDateTimeSchema.optional(),
  lastBackupAppVersion: z.string().min(1).max(100).optional(),
  lastBackupSchemaVersion: positiveInteger.optional(),
  dashboardDensity: z.enum(['comfortable', 'compact']).default('comfortable'),
});


const userSettingsSchema = appSettingsSchema.omit({
  theme: true,
  requestPersistentStorage: true,
  backupReminderIntervalDays: true,
  restTimerAutoStart: true,
  restTimerSoundEnabled: true,
  restTimerVibrationEnabled: true,
  lastBackupExportedAt: true,
  lastBackupAppVersion: true,
  lastBackupSchemaVersion: true,
  dashboardDensity: true,
}).extend({
  id: z.literal(USER_SETTINGS_ID),
});

const weightEntrySchema = datedEntitySchema.extend({
  weightKg: positiveNumber,
  note: z.string().max(5_000).optional(),
  provenance: z.enum(['userMeasurement', 'profileInitialization']).optional(),
});

const dailyStepsSchema = datedEntitySchema.extend({
  totalSteps: nonNegativeInteger,
  source: z.literal('manual'),
});

const dailyContextFlagSchema = z.enum([
  'menstrualCycle',
  'illness',
  'painOrInjury',
  'travel',
  'exceptionalPoorSleep',
  'highSodiumMeal',
  'creatineChange',
  'muscleSoreness',
  'other',
]);
const dailySignalLevelSchema = z.enum(['low', 'normal', 'high']);
const dailySignalProvenanceSchema = z.literal('userReported');
const dailyContextSyncPreferenceSchema = z.enum(['localOnly', 'account']);

const dailyCheckInSchema = datedEntitySchema.extend({
  weightEntryId: z.string().min(1).optional(),
  sleepDurationMinutes: z.number().int().min(0).max(1_440).optional(),
  sleepQuality: z.enum(['poor', 'average', 'good']).optional(),
  readiness: dailySignalLevelSchema.optional(),
  signalProvenance: z.object({
    sleepQuality: dailySignalProvenanceSchema.optional(),
    readiness: dailySignalProvenanceSchema.optional(),
  }).optional(),
  waistCm: positiveNumber.optional(),
  contextFlags: z.array(dailyContextFlagSchema),
  contextSyncPreference: dailyContextSyncPreferenceSchema,
  completedAt: isoDateTimeSchema,
}).superRefine((checkIn, context) => {
  for (const signal of ['sleepQuality', 'readiness'] as const) {
    if (checkIn.signalProvenance?.[signal] && checkIn[signal] === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['signalProvenance', signal],
        message: `La provenance ${signal} exige une valeur correspondante.`,
      });
    }
  }
});

const dailyActivityDecisionSchema = datedEntitySchema.extend({
  decision: z.enum(['open', 'rest', 'activities']),
  confirmedAt: isoDateTimeSchema.optional(),
});

const dailyCheckOutSchema = datedEntitySchema.extend({
  stepsEntryId: z.string().min(1).optional(),
  hunger: dailySignalLevelSchema.optional(),
  energy: dailySignalLevelSchema.optional(),
  signalProvenance: z.object({
    hunger: dailySignalProvenanceSchema.optional(),
    energy: dailySignalProvenanceSchema.optional(),
  }).optional(),
  foodJournalComplete: z.boolean(),
  contextFlags: z.array(dailyContextFlagSchema),
  contextSyncPreference: dailyContextSyncPreferenceSchema,
  completedAt: isoDateTimeSchema,
}).superRefine((checkOut, context) => {
  for (const signal of ['hunger', 'energy'] as const) {
    if (checkOut.signalProvenance?.[signal] && checkOut[signal] === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['signalProvenance', signal],
        message: `La provenance ${signal} exige une valeur correspondante.`,
      });
    }
  }
});


const plannedActivityReferenceSchema = z.object({
  source: z.enum(['strengthSession', 'endurancePlanning']),
  sourceId: z.string().min(1),
});

const activityCalculationSnapshotSchema = z.object({
  weightKg: positiveNumber,
  estimatedCaloriesKcal: nonNegativeNumber,
  coefficientUsed: nonNegativeNumber.optional(),
  metUsed: nonNegativeNumber.optional(),
  calculationVersion: positiveInteger,
});

const activityBaseShape = {
  type: z.enum(['running', 'swimming', 'strengthTraining', 'cycling', 'walking', 'otherCardio']),
  time: localTimeSchema.optional(),
  durationMinutes: positiveNumber,
  intensity: z.enum(['low', 'moderate', 'high']),
  rpe: z.number().int().min(1).max(10).optional(),
  notes: z.string().max(10_000).optional(),
  manualCaloriesKcal: nonNegativeNumber.optional(),
  calculation: activityCalculationSnapshotSchema,
  plannedActivity: plannedActivityReferenceSchema.optional(),
  socialSharing: socialActivitySharingOverrideSchema.optional(),
};

const runningActivitySchema = datedEntitySchema.extend({
  ...activityBaseShape,
  type: z.literal('running'),
  sessionType: z.enum(['easy', 'recovery', 'longRun', 'tempo', 'intervals', 'hills', 'competition']),
  distanceKm: positiveNumber,
  averageCadenceSpm: positiveNumber,
  elevationGainMeters: nonNegativeNumber.optional(),
  terrainType: z.enum(['road', 'track', 'trail', 'treadmill', 'mixed']).optional(),
  intervalDetails: z.string().max(2_000).optional(),
});

const swimmingActivitySchema = datedEntitySchema.extend({
  ...activityBaseShape,
  type: z.literal('swimming'),
  sessionType: z.enum(['recovery', 'technique', 'endurance', 'tempo', 'intervals', 'competition']),
  mainStroke: z.enum(['freestyle', 'breaststroke', 'backstroke', 'butterfly', 'mixed', 'drills']),
  distanceMeters: positiveNumber,
  poolLengthMeters: z.union([z.literal(25), z.literal(50)]).optional(),
  intervalDetails: z.string().max(2_000).optional(),
});

const strengthActivitySchema = datedEntitySchema.extend({
  ...activityBaseShape,
  type: z.literal('strengthTraining'),
  met: nonNegativeNumber,
});

const cyclingActivitySchema = datedEntitySchema.extend({
  ...activityBaseShape,
  type: z.literal('cycling'),
  met: nonNegativeNumber,
  includedInDailySteps: z.literal(false),
  distanceKm: positiveNumber.optional(),
  elevationGainMeters: nonNegativeNumber.optional(),
  bikeType: z.enum(['road', 'gravel', 'mountain', 'city', 'indoor', 'other']).optional(),
  environment: z.enum(['outdoor', 'indoor']).optional(),
  intervalDetails: z.string().max(2_000).optional(),
});

const otherActivitySchema = datedEntitySchema.extend({
  ...activityBaseShape,
  type: z.enum(['walking', 'otherCardio']),
  met: nonNegativeNumber,
  includedInDailySteps: z.boolean(),
});

const activitySchema = z.discriminatedUnion('type', [
  runningActivitySchema,
  swimmingActivitySchema,
  cyclingActivitySchema,
  strengthActivitySchema,
  otherActivitySchema,
]);

const foodDataSourceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('manual') }),
  z.object({
    type: z.literal('openFoodFacts'),
    fetchedAt: isoDateTimeSchema,
    barcode: z.string().optional(),
  }),
]);

const foodProductLocalOverrideFieldSchema = z.enum([
  'name',
  'brand',
  'basisUnit',
  'caloriesKcal',
  'proteinGrams',
  'carbohydratesGrams',
  'fatGrams',
  'fiberGrams',
  'saltGrams',
  'servingSize',
  'servingLabel',
]);

const foodProductSchema = entityMetadataSchema.extend({
  name: z.string().min(1),
  brand: z.string().optional(),
  basisUnit: z.enum(['g', 'ml']),
  nutritionPer100: nutritionValuesSchema,
  servingSize: positiveNumber.optional(),
  servingLabel: z.string().max(120).optional(),
  barcode: z.string().optional(),
  source: foodDataSourceSchema,
  isNutritionComplete: z.boolean(),
  localOverrides: z.array(foodProductLocalOverrideFieldSchema).optional(),
  isFavorite: z.boolean(),
  isArchived: z.boolean(),
});

const mealSlotSchema = z.enum(['breakfast', 'lunch', 'dinner', 'snacks']);

const mealSchema = datedEntitySchema.extend({
  slot: mealSlotSchema,
  title: z.string().optional(),
});

const productReferenceSchema = z.object({
  sourceType: z.literal('product'),
  productId: z.string().min(1),
  inputMode: z.enum(['amount', 'servings']),
  inputQuantity: positiveNumber,
  normalizedAmount: positiveNumber,
  normalizedUnit: z.enum(['g', 'ml']),
  nutritionPer100Snapshot: nutritionValuesSchema,
});

const recipeReferenceSchema = z.object({
  sourceType: z.literal('recipe'),
  recipeId: z.string().min(1),
  servingsConsumed: positiveNumber,
  nutritionPerServingSnapshot: nutritionValuesSchema,
});

const foodEntryReferenceSchema = z.discriminatedUnion('sourceType', [
  productReferenceSchema,
  recipeReferenceSchema,
]);

const foodEntrySchema = datedEntitySchema.extend({
  mealId: z.string().min(1),
  mealSlot: mealSlotSchema,
  sourceType: z.enum(['product', 'recipe']),
  reference: foodEntryReferenceSchema,
}).superRefine((value, context) => {
  if (value.sourceType !== value.reference.sourceType) {
    context.addIssue({
      code: 'custom',
      path: ['sourceType'],
      message: 'Le type de l’entrée ne correspond pas à sa référence.',
    });
  }
});

const favoriteProductItemSchema = productReferenceSchema.extend({
  id: z.string().min(1),
});

const favoriteRecipeItemSchema = recipeReferenceSchema.extend({
  id: z.string().min(1),
});

const favoriteMealSchema = entityMetadataSchema.extend({
  name: z.string().min(1),
  defaultSlot: mealSlotSchema.optional(),
  items: z.array(z.discriminatedUnion('sourceType', [favoriteProductItemSchema, favoriteRecipeItemSchema])),
});

const dailyJournalStatusSchema = datedEntitySchema.extend({
  isComplete: z.boolean(),
  completedAt: isoDateTimeSchema.optional(),
});

const recipeSchema = entityMetadataSchema.extend({
  name: z.string().min(1),
  numberOfServings: positiveNumber,
  notes: z.string().optional(),
});

const recipeIngredientSchema = entityMetadataSchema.extend({
  recipeId: z.string().min(1),
  productId: z.string().min(1),
  quantity: positiveNumber,
  unit: z.enum(['g', 'ml']),
  sortOrder: nonNegativeInteger,
  nutritionPer100Snapshot: nutritionValuesSchema,
});

const dailyEnergyBreakdownSchema = z.object({
  bmrKcal: nonNegativeNumber,
  occupationalBaseKcal: nonNegativeNumber,
  walkingKcal: nonNegativeNumber,
  runningKcal: nonNegativeNumber,
  swimmingKcal: nonNegativeNumber,
  strengthTrainingKcal: nonNegativeNumber,
  otherActivitiesKcal: nonNegativeNumber,
  plannedActivitiesKcal: nonNegativeNumber.optional(),
  totalEstimatedExpenditureKcal: nonNegativeNumber,
});

const dailyMacroTargetsSchema = z.object({
  proteinGrams: nonNegativeNumber,
  carbohydratesGrams: nonNegativeNumber,
  fatGrams: nonNegativeNumber,
});

const dailyTargetStepBasisSchema = z.object({
  mode: z.literal('expected'),
  steps: nonNegativeInteger,
  stepGoal: nonNegativeInteger,
  source: z.enum(['profileFallback', 'recentBlend', 'recentHistory']),
  confidence: z.enum(['fallback', 'emerging', 'established']),
  observedDayCount: nonNegativeInteger,
  observationWindowDays: positiveInteger,
});

const dailyTargetEnergyInputSnapshotSchema = z.object({
  version: z.literal(1),
  profile: z.object({
    sexForEnergyEquation: z.enum(['male', 'female']),
    ageInformation: ageInformationSchema,
    heightCm: positiveNumber,
    goal: z.enum(['loss', 'maintenance', 'gain']),
    targetWeeklyWeightChangePercent: finiteNumber,
    occupationalActivity: z.enum([
      'sedentary',
      'lightlyActive',
      'active',
      'veryActive',
    ]),
    dailyStepGoal: nonNegativeInteger,
    proteinGramsPerKg: nonNegativeNumber,
    fatGramsPerKg: nonNegativeNumber,
  }),
  settings: z.object({
    includedBaseSteps: nonNegativeInteger,
    walkingKcalPerKgPerKm: nonNegativeNumber,
    runningKcalPerKgPerKm: nonNegativeNumber,
    strengthTrainingMet: nonNegativeNumber,
    calorieFloorBmrMultiplier: nonNegativeNumber,
    defaultCyclingMet: nonNegativeNumber,
    defaultWalkingMet: nonNegativeNumber,
    defaultOtherCardioMet: nonNegativeNumber,
    swimmingMetValues: swimmingMetValuesSchema,
  }),
});

const plannedActivityCalorieSnapshotSchema = z.object({
  id: z.string().min(1),
  source: z.enum(['strengthSession', 'endurancePlanning']),
  sourceId: z.string().min(1),
  title: z.string().min(1).max(200),
  date: localDateSchema,
  activityType: z.enum(['running', 'swimming', 'strengthTraining', 'cycling', 'walking', 'otherCardio']),
  estimatedCaloriesKcal: nonNegativeNumber,
  weightKg: positiveNumber,
  calculationVersion: positiveInteger,
  basis: z.enum(['plannedDuration', 'actualDuration', 'plannedDistance']),
  durationMinutes: positiveNumber.optional(),
  metUsed: nonNegativeNumber.optional(),
  coefficientUsed: nonNegativeNumber.optional(),
});

const dailyTargetSchema = datedEntitySchema.extend({
  calculationWeightKg: positiveNumber,
  energyInputSnapshot: dailyTargetEnergyInputSnapshotSchema.optional(),
  energy: dailyEnergyBreakdownSchema,
  targetWeeklyWeightChangePercentUsed: finiteNumber.optional(),
  goalAdjustmentKcal: finiteNumber,
  acceptedCalibrationAdjustmentKcal: finiteNumber,
  calorieFloorKcal: nonNegativeNumber,
  targetCaloriesKcal: nonNegativeNumber,
  macros: dailyMacroTargetsSchema,
  plannedActivities: z.array(plannedActivityCalorieSnapshotSchema).optional(),
  stepBasis: dailyTargetStepBasisSchema.optional(),
  calculationVersion: positiveInteger,
});

const calorieAdaptationConfidenceSchema = z.object({
  weight: nonNegativeNumber.max(100),
  food: nonNegativeNumber.max(100),
  activity: nonNegativeNumber.max(100),
  recovery: nonNegativeNumber.max(100),
  overall: nonNegativeNumber.max(100),
  level: z.enum(['insufficient', 'uncertain', 'usable', 'reliable']),
});

const calorieAdaptationAssessmentSchema = z.object({
  calculationVersion: positiveInteger,
  analysisStart: localDateSchema,
  analysisEnd: localDateSchema,
  trackingSpanDays: nonNegativeInteger,
  weightTrendKgPerWeek: finiteNumber.optional(),
  waistTrendCmPerWeek: finiteNumber.optional(),
  averageCalorieDeviationPercent: finiteNumber.optional(),
  proteinAdherencePercent: nonNegativeNumber.max(100).optional(),
  actualToExpectedStepsPercent: nonNegativeNumber.optional(),
  weighInCount: nonNegativeInteger,
  completedFoodDays: nonNegativeInteger,
  comparableFoodDays: nonNegativeInteger,
  recordedStepDays: nonNegativeInteger,
  recoverySignalDays: nonNegativeInteger,
  recoveryConcernDays: nonNegativeInteger,
  contextDayCount: nonNegativeInteger,
  strengthSessionCount: nonNegativeInteger,
  confidence: calorieAdaptationConfidenceSchema,
  detectedState: z.enum([
    'insufficientData',
    'insufficientFoodTracking',
    'onTrack',
    'temporaryWaterVariation',
    'possibleRecomposition',
    'conflictingSignals',
    'truePlateau',
    'targetTooHigh',
    'targetTooLow',
    'excessiveLoss',
    'excessiveGain',
    'activityBelowExpected',
    'degradedRecovery',
  ]),
  reasons: z.array(z.string()),
  blockingFactors: z.array(z.string()),
  rawWeightBasedAdjustmentKcal: finiteNumber,
  proposedAdjustmentKcal: finiteNumber,
});

const weeklyReviewSchema = entityMetadataSchema.extend({
  weekStart: localDateSchema,
  weekEnd: localDateSchema,
  previousWeekStart: localDateSchema,
  previousWeekEnd: localDateSchema,
  weighInCount: nonNegativeInteger,
  previousWeighInCount: nonNegativeInteger,
  trackedFoodDays: nonNegativeInteger,
  completedFoodDays: nonNegativeInteger,
  calorieComparableDays: nonNegativeInteger,
  averageWeightKg: positiveNumber.optional(),
  previousAverageWeightKg: positiveNumber.optional(),
  actualWeightChangeKg: finiteNumber.optional(),
  targetWeightChangeKg: finiteNumber,
  averageConsumedCaloriesKcal: nonNegativeNumber.optional(),
  averageTargetCaloriesKcal: nonNegativeNumber.optional(),
  calorieDeviationPercent: nonNegativeNumber.optional(),
  calorieAdherencePercent: nonNegativeNumber.optional(),
  proteinTargetDays: nonNegativeInteger,
  stepGoalDays: nonNegativeInteger,
  recordedStepDays: nonNegativeInteger,
  isCalibrationEligible: z.boolean(),
  ineligibilityReasons: z.array(z.string()),
  rawProposedAdjustmentKcal: finiteNumber,
  proposedDecision: z.enum(['keep', 'increase', 'decrease']),
  proposedAdjustmentKcal: finiteNumber,
  currentCumulativeAdjustmentKcal: finiteNumber,
  resultingCumulativeAdjustmentKcal: finiteNumber,
  adherenceScore: nonNegativeNumber,
  adherenceLevel: z.enum(['excellent', 'good', 'needsStrengthening', 'insufficient']),
  adaptation: calorieAdaptationAssessmentSchema.optional(),
  decisionStatus: z.enum(['pending', 'accepted', 'rejected', 'notEligible']),
  decidedAt: isoDateTimeSchema.optional(),
});

const acceptedCalorieAdjustmentSchema = entityMetadataSchema.extend({
  weeklyReviewId: z.string().min(1),
  effectiveFrom: localDateSchema,
  adjustmentKcalPerDay: finiteNumber,
  resultingCumulativeAdjustmentKcal: finiteNumber,
  status: z.enum(['active', 'reverted']),
  revertedAt: isoDateTimeSchema.optional(),
});

const muscleGroupSchema = z.enum([
  'pectorals',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abdominals',
  'lowerBack',
  'fullBody',
  'other',
]);

const loadUnitSchema = z.enum(['kg', 'bodyweight', 'assistedKg', 'none']);
const strengthTrackingModeSchema = z.enum([
  'loadRepetitions',
  'bodyweightRepetitions',
  'assistedRepetitions',
  'repetitions',
  'duration',
  'distance',
]);

const exerciseGroupTypeSchema = z.enum(['superset', 'triSet', 'circuit']);

const exerciseDefinitionSchema = entityMetadataSchema.extend({
  name: z.string().trim().min(1).max(200),
  primaryMuscleGroup: muscleGroupSchema,
  secondaryMuscleGroups: z.array(muscleGroupSchema),
  equipment: z.enum([
    'barbell',
    'dumbbells',
    'machine',
    'cable',
    'bodyweight',
    'resistanceBand',
    'kettlebell',
    'other',
  ]),
  category: z.enum(['strength', 'bodyweight', 'conditioning', 'mobility', 'other']),
  movementType: z.enum(['compound', 'isolation', 'core', 'carry', 'other']),
  loadUnit: loadUnitSchema,
  trackingMode: strengthTrackingModeSchema.optional(),
  description: z.string().max(10_000).optional(),
  source: z.enum(['catalog', 'user']),
  isArchived: z.boolean(),
});

const workoutTemplateSchema = entityMetadataSchema.extend({
  name: z.string().trim().min(1).max(200),
  description: z.string().max(10_000).optional(),
  notes: z.string().max(10_000).optional(),
  isArchived: z.boolean(),
});

const workoutTemplateExerciseSchema = entityMetadataSchema.extend({
  templateId: z.string().min(1),
  exerciseDefinitionId: z.string().min(1),
  sortOrder: nonNegativeInteger,
  plannedSets: positiveInteger,
  minRepetitions: positiveInteger,
  maxRepetitions: positiveInteger,
  targetLoadKg: nonNegativeNumber.optional(),
  targetDurationSeconds: nonNegativeNumber.optional(),
  targetDistanceMeters: nonNegativeNumber.optional(),
  loadIncrementKg: nonNegativeNumber,
  restSeconds: nonNegativeInteger.optional(),
  maximumRecommendedRpe: finiteNumber.min(1).max(10).optional(),
  notes: z.string().max(10_000).optional(),
  isActive: z.boolean(),
  exerciseGroupId: z.string().min(1).optional(),
  exerciseGroupType: exerciseGroupTypeSchema.optional(),
  exerciseGroupName: z.string().max(200).optional(),
  exerciseGroupRounds: positiveInteger.optional(),
  exerciseGroupRestBetweenExercisesSeconds: nonNegativeInteger.optional(),
  exerciseGroupRestBetweenRoundsSeconds: nonNegativeInteger.optional(),
}).refine((value) => value.minRepetitions <= value.maxRepetitions, {
  message: 'La borne minimale de répétitions doit être inférieure ou égale à la borne maximale.',
  path: ['minRepetitions'],
});

const workoutSessionSchema = entityMetadataSchema.extend({
  date: localDateSchema,
  status: z.enum(['planned', 'inProgress', 'completed', 'abandoned', 'skipped']),
  plannedDate: localDateSchema.optional(),
  originalPlannedDate: localDateSchema.optional(),
  plannedAt: isoDateTimeSchema.optional(),
  skippedAt: isoDateTimeSchema.optional(),
  sourceTemplateId: z.string().min(1).optional(),
  sourceTemplateNameSnapshot: z.string().max(200).optional(),
  startedAt: isoDateTimeSchema.optional(),
  completedAt: isoDateTimeSchema.optional(),
  durationMinutes: nonNegativeNumber.optional(),
  plannedDurationMinutes: positiveNumber.optional(),
  strengthSessionStyle: z.enum(['classic', 'strength', 'circuit', 'veryIntense']).optional(),
  completedActivityId: z.string().min(1).optional(),
  notes: z.string().max(10_000).optional(),
  socialSharing: socialActivitySharingOverrideSchema.optional(),
});

const workoutSessionExerciseSchema = entityMetadataSchema.extend({
  sessionId: z.string().min(1),
  exerciseDefinitionId: z.string().min(1),
  exerciseNameSnapshot: z.string().trim().min(1).max(200),
  sortOrder: nonNegativeInteger,
  sourceTemplateExerciseId: z.string().min(1).optional(),
  plannedSets: positiveInteger.optional(),
  minRepetitions: positiveInteger.optional(),
  maxRepetitions: positiveInteger.optional(),
  targetLoadKg: nonNegativeNumber.optional(),
  targetDurationSeconds: nonNegativeNumber.optional(),
  targetDistanceMeters: nonNegativeNumber.optional(),
  loadIncrementKg: nonNegativeNumber.optional(),
  restSeconds: nonNegativeInteger.optional(),
  maximumRecommendedRpe: finiteNumber.min(1).max(10).optional(),
  loadUnitSnapshot: loadUnitSchema,
  trackingModeSnapshot: strengthTrackingModeSchema.optional(),
  notes: z.string().max(10_000).optional(),
  exerciseGroupId: z.string().min(1).optional(),
  exerciseGroupType: exerciseGroupTypeSchema.optional(),
  exerciseGroupName: z.string().max(200).optional(),
  exerciseGroupRounds: positiveInteger.optional(),
  exerciseGroupRestBetweenExercisesSeconds: nonNegativeInteger.optional(),
  exerciseGroupRestBetweenRoundsSeconds: nonNegativeInteger.optional(),
}).refine(
  (value) =>
    value.minRepetitions === undefined ||
    value.maxRepetitions === undefined ||
    value.minRepetitions <= value.maxRepetitions,
  {
    message: 'La borne minimale de répétitions doit être inférieure ou égale à la borne maximale.',
    path: ['minRepetitions'],
  },
);

const strengthSetSchema = entityMetadataSchema.extend({
  sessionId: z.string().min(1),
  sessionExerciseId: z.string().min(1),
  setNumber: positiveInteger,
  repetitions: nonNegativeInteger,
  weightKg: nonNegativeNumber,
  durationSeconds: nonNegativeNumber.optional(),
  distanceMeters: nonNegativeNumber.optional(),
  rpe: finiteNumber.min(1).max(10).optional(),
  type: z.enum(['warmup', 'working', 'dropSet', 'failure', 'other']),
  isCompleted: z.boolean(),
  completedAt: isoDateTimeSchema.optional(),
  notes: z.string().max(10_000).optional(),
});

const trashItemBaseSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  label: z.string().min(1).max(300),
  deletedAt: isoDateTimeSchema,
  purgeAt: isoDateTimeSchema,
});

export const trashItemSchema = z.discriminatedUnion('entityType', [
  trashItemBaseSchema.extend({
    entityType: z.literal('activity'),
    payload: activitySchema,
  }),
  trashItemBaseSchema.extend({
    entityType: z.literal('weight'),
    payload: weightEntrySchema,
  }),
  trashItemBaseSchema.extend({
    entityType: z.literal('foodEntry'),
    payload: foodEntrySchema,
  }),
  trashItemBaseSchema.extend({
    entityType: z.literal('meal'),
    payload: z.object({
      meal: mealSchema,
      entries: z.array(foodEntrySchema),
    }),
  }),
  trashItemBaseSchema.extend({
    entityType: z.literal('favoriteMeal'),
    payload: favoriteMealSchema,
  }),
  trashItemBaseSchema.extend({
    entityType: z.literal('recipe'),
    payload: z.object({
      recipe: recipeSchema,
      ingredients: z.array(recipeIngredientSchema),
    }),
  }),
  trashItemBaseSchema.extend({
    entityType: z.literal('strengthSet'),
    payload: strengthSetSchema,
  }),
  trashItemBaseSchema.extend({
    entityType: z.literal('workoutSessionExercise'),
    payload: z.object({
      exercise: workoutSessionExerciseSchema,
      sets: z.array(strengthSetSchema),
    }),
  }),
]);

const progressionSuggestionSchema = entityMetadataSchema.extend({
  sessionId: z.string().min(1),
  sessionExerciseId: z.string().min(1),
  exerciseDefinitionId: z.string().min(1),
  templateId: z.string().min(1).optional(),
  templateExerciseId: z.string().min(1).optional(),
  currentLoadKg: nonNegativeNumber,
  suggestedLoadKg: nonNegativeNumber,
  incrementKg: positiveNumber,
  status: z.enum(['pending', 'accepted', 'rejected', 'deferred']),
  reason: z.literal('repetitionRangeCompleted'),
  decidedAt: isoDateTimeSchema.optional(),
  appliedAt: isoDateTimeSchema.optional(),
});

const achievementIdSchema = z.string().refine(
  (value) =>
    achievementCatalog.some(
      (achievement) => achievement.id === value,
    ),
  'Identifiant de badge inconnu.',
);

const visualThemeIdSchema = z.string().refine(
  (value) =>
    visualThemeCatalog.some((theme) => theme.id === value),
  'Identifiant de thème inconnu.',
);

const achievementStateSchema = z.object({
  earnedAchievements: z.array(
    z.object({
      id: achievementIdSchema,
      earnedAt: isoDateTimeSchema,
    }),
  ),
});

const visualThemeStateSchema = z
  .object({
    activeThemeId: visualThemeIdSchema,
    unlockedThemeIds: z.array(visualThemeIdSchema),
    unlockMetadata: z.record(
      visualThemeIdSchema,
      z.object({
        unlockedAt: isoDateTimeSchema,
        revealSeenAt: isoDateTimeSchema.optional(),
      }),
    ).optional().default({}),
  })
  .refine(
    (state) =>
      state.unlockedThemeIds.includes(state.activeThemeId),
    {
      message: 'Le thème actif doit être débloqué.',
      path: ['activeThemeId'],
    },
  );

const weeklyMissionHistoryStateSchema = z.object({
  completedWeeks: z.array(
    z.object({
      weekStart: localDateSchema,
      completedAt: isoDateTimeSchema,
    }),
  ),
});

const goalMetricSchema = z.enum([
  'weightTarget',
  'totalSteps',
  'activityMinutes',
  'runningDistanceKm',
  'swimmingDistanceKm',
  'cyclingDistanceKm',
  'strengthSessions',
  'weighIns',
]);

const goalStatusSchema = z.enum([
  'active',
  'paused',
  'completed',
  'archived',
]);

const goalMilestoneSchema = z.union([
  z.literal(25),
  z.literal(50),
  z.literal(75),
  z.literal(100),
]);

const goalSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  metric: goalMetricSchema,
  targetValue: positiveNumber,
  startDate: localDateSchema,
  deadline: localDateSchema.optional(),
  baselineValue: positiveNumber.optional(),
  status: goalStatusSchema,
  reachedMilestones: z.array(goalMilestoneSchema),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  completedAt: isoDateTimeSchema.optional(),
});

const goalStateSchema = z.object({
  version: z.literal(1),
  goals: z.array(goalSchema),
});

const plannedEnduranceActivityTypeSchema = z.enum([
  'running',
  'swimming',
  'cycling',
  'walking',
  'otherCardio',
]);

const plannedEnduranceSessionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  activityType: plannedEnduranceActivityTypeSchema,
  date: localDateSchema,
  intensity: z.enum(['low', 'moderate', 'high']),
  targetDurationMinutes: positiveNumber.optional(),
  targetDistanceKm: positiveNumber.optional(),
  targetDistanceMeters: positiveNumber.optional(),
  notes: z.string().max(240).optional(),
  status: z.enum(['planned', 'skipped']),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  skippedAt: isoDateTimeSchema.optional(),
  completedActivityId: z.string().min(1).optional(),
});

const endurancePlanningStateSchema = z.object({
  version: z.literal(1),
  sessions: z.array(plannedEnduranceSessionSchema),
});

const rewardBackupStateSchema = z.object({
  achievements: achievementStateSchema,
  visualThemes: visualThemeStateSchema,
  weeklyMissions: weeklyMissionHistoryStateSchema,
  goals: goalStateSchema.optional(),
  endurancePlanning: endurancePlanningStateSchema.optional(),
});

const earnedAchievementRecordSchema = z.object({
  id: achievementIdSchema,
  earnedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const unlockedVisualThemeRecordSchema = z.object({
  id: visualThemeIdSchema,
  unlockedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const visualThemePreferenceRecordSchema = z.object({
  id: z.literal(VISUAL_THEME_PREFERENCE_ID),
  activeThemeId: visualThemeIdSchema,
  updatedAt: isoDateTimeSchema,
});

const completedWeeklyMissionRecordSchema = z.object({
  id: z.string().min(1),
  weekStart: localDateSchema,
  completedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const routineReminderTypeSchema = z.enum([
  'training',
  'nutrition',
  'weighIn',
  'weeklyPlanning',
]);

const routineReminderCompletionRecordSchema = z.object({
  id: z.string().min(1),
  date: localDateSchema,
  type: routineReminderTypeSchema,
  completedAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

const deletionEntityTypeSchema = z.enum(DELETION_ENTITY_TYPES);

const deletionRecordSchema = entityMetadataSchema.extend({
  entityType: deletionEntityTypeSchema,
  entityId: z.string().min(1),
  status: z.enum(['deleted', 'restored']),
  deletedAt: isoDateTimeSchema,
  restoredAt: isoDateTimeSchema.optional(),
});


const friendVisibilityLevelSchema = z.enum(['private', 'friends', 'public']);
const friendActivitySharingLevelSchema = z.enum([
  'disabled',
  'summary-only',
  'detailed',
]);

const socialIdentitySchema = z.object({
  userId: z.string().min(1),
  handle: z.string().min(3).max(24),
  displayName: z.string().min(1).max(80),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
  handleUpdatedAt: isoDateTimeSchema.optional(),
});

const friendProfileSchema = entityMetadataSchema.extend({
  userId: z.string().min(1).optional(),
  displayName: z.string().min(1).max(120),
  handle: z.string().min(3).max(32),
  initials: z.string().min(1).max(4),
  connectedSince: isoDateTimeSchema.optional(),
});

const friendRequestSchema = entityMetadataSchema.extend({
  requesterUserId: z.string().min(1).optional(),
  recipientUserId: z.string().min(1).optional(),
  displayName: z.string().min(1).max(120),
  handle: z.string().min(3).max(32),
  direction: z.enum(['incoming', 'outgoing']),
  status: z.enum(['pending', 'accepted', 'declined', 'cancelled']),
  requestedAt: isoDateTimeSchema,
});

const friendActivityPermissionSchema = entityMetadataSchema.extend({
  friendUserId: z.string().min(1).optional(),
  friendHandle: z.string().min(3).max(32),
  sharingLevel: z.enum(['summary', 'detailed']),
  detailedConsent: z.enum(['notRequested', 'granted']),
  detailedConsentGrantedAt: isoDateTimeSchema.optional(),
});

const friendsPrivacySettingsSchema = entityMetadataSchema.extend({
  id: z.literal(FRIENDS_PRIVACY_SETTINGS_ID),
  profileVisibility: friendVisibilityLevelSchema,
  activitySharing: friendActivitySharingLevelSchema,
  allowFriendRequests: z.boolean(),
  requireManualApproval: z.boolean(),
  socialIdentity: socialIdentitySchema.optional(),
  socialActivitySharingPolicy: socialActivityGlobalSharingPolicySchema.optional(),
  profileVisibilityUpdatedAt: isoDateTimeSchema.optional(),
  socialActivitySharingPolicyUpdatedAt: isoDateTimeSchema.optional(),
});

const backupUserStateTableNameSchema = z.enum(
  BACKUP_USER_STATE_TABLE_NAMES,
);

const backupDataSchema = z.object({
  userProfile: z.array(userProfileSchema).max(1),
  appSettings: z.array(appSettingsSchema).max(1).optional(),
  userSettings: z.array(userSettingsSchema).max(1).optional(),
  weights: z.array(weightEntrySchema),
  dailySteps: z.array(dailyStepsSchema),
  dailyCheckIns: z.array(dailyCheckInSchema).optional(),
  dailyActivityDecisions: z.array(dailyActivityDecisionSchema).optional(),
  dailyCheckOuts: z.array(dailyCheckOutSchema).optional(),
  activities: z.array(activitySchema),
  foodProducts: z.array(foodProductSchema),
  meals: z.array(mealSchema),
  foodEntries: z.array(foodEntrySchema),
  favoriteMeals: z.array(favoriteMealSchema),
  recipes: z.array(recipeSchema),
  recipeIngredients: z.array(recipeIngredientSchema),
  dailyTargets: z.array(dailyTargetSchema),
  dailyJournalStatuses: z.array(dailyJournalStatusSchema),
  weeklyReviews: z.array(weeklyReviewSchema),
  acceptedCalorieAdjustments: z.array(acceptedCalorieAdjustmentSchema),
  exerciseDefinitions: z.array(exerciseDefinitionSchema),
  workoutTemplates: z.array(workoutTemplateSchema),
  workoutTemplateExercises: z.array(workoutTemplateExerciseSchema),
  workoutSessions: z.array(workoutSessionSchema),
  workoutSessionExercises: z.array(workoutSessionExerciseSchema),
  strengthSets: z.array(strengthSetSchema),
  progressionSuggestions: z.array(progressionSuggestionSchema),
  goals: z.array(goalSchema).optional(),
  endurancePlanningSessions: z
    .array(plannedEnduranceSessionSchema)
    .optional(),
  earnedAchievements: z.array(earnedAchievementRecordSchema).optional(),
  unlockedVisualThemes: z
    .array(unlockedVisualThemeRecordSchema)
    .optional(),
  visualThemePreferences: z
    .array(visualThemePreferenceRecordSchema)
    .max(1)
    .optional(),
  weeklyMissionCompletions: z
    .array(completedWeeklyMissionRecordSchema)
    .optional(),
  routineReminderCompletions: z
    .array(routineReminderCompletionRecordSchema)
    .optional(),
  deletionRecords: z.array(deletionRecordSchema).optional(),
  friendProfiles: z.array(friendProfileSchema).optional(),
  friendRequests: z.array(friendRequestSchema).optional(),
  friendsPrivacySettings: z
    .array(friendsPrivacySettingsSchema)
    .max(1)
    .optional(),
  friendActivityPermissions: z.array(friendActivityPermissionSchema).optional(),
});

function addDuplicateIssues<T>(
  values: T[],
  key: (value: T) => string,
  path: (string | number)[],
  label: string,
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    const currentKey = key(value);
    if (seen.has(currentKey)) {
      context.addIssue({
        code: 'custom',
        path,
        message: `${label} contient une valeur dupliquée : ${currentKey}.`,
      });
      return;
    }
    seen.add(currentKey);
  }
}

export const backupEnvelopeSchema = z.object({
  format: z.literal('sportpilot-backup'),
  schemaVersion: z.number().int().positive(),
  exportedAt: isoDateTimeSchema,
  appVersion: z.string().min(1).max(100).optional(),
  includedUserStateTables: z
    .array(backupUserStateTableNameSchema)
    .optional(),
  rewardState: rewardBackupStateSchema.optional(),
  data: backupDataSchema,
}).superRefine((envelope, context) => {
  const { data } = envelope;
  const includedUserStateTables = new Set(
    envelope.includedUserStateTables ?? [],
  );

  if (envelope.schemaVersion >= 5) {
    if (envelope.rewardState !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['rewardState'],
        message:
          'Le bloc rewardState historique ne doit plus être présent en sauvegarde v5.',
      });
    }

    if (envelope.includedUserStateTables === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['includedUserStateTables'],
        message:
          'La liste des tables d’état utilisateur est requise en sauvegarde v5.',
      });
    }

    for (const tableName of BACKUP_USER_STATE_TABLE_NAMES) {
      if (data[tableName] === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['data', tableName],
          message:
            `La table ${tableName} est requise en sauvegarde v5.`,
        });
      }
    }
  }

  addDuplicateIssues(
    envelope.includedUserStateTables ?? [],
    (value) => value,
    ['includedUserStateTables'],
    'La liste des tables d’état utilisateur',
    context,
  );

  for (const tableName of BACKUP_USER_STATE_TABLE_NAMES) {
    const records = data[tableName] ?? [];

    if (
      records.length > 0 &&
      !includedUserStateTables.has(tableName)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['data', tableName],
        message:
          `La table ${tableName} contient des données mais n’est pas déclarée comme incluse.`,
      });
    }
  }

  if (data.userProfile[0] && data.userProfile[0].id !== LOCAL_USER_PROFILE_ID) {
    context.addIssue({
      code: 'custom',
      path: ['data', 'userProfile', 0, 'id'],
      message: 'L’identifiant du profil local est invalide.',
    });
  }

  if (envelope.schemaVersion >= 6) {
    if (data.userSettings?.length !== 1) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'userSettings'],
        message: 'Les paramètres utilisateur sont requis en sauvegarde v6.',
      });
    }
    if (data.appSettings !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'appSettings'],
        message: 'Les paramètres appareil ne doivent pas être exportés en sauvegarde v6.',
      });
    }
  } else if (data.appSettings?.length !== 1) {
    context.addIssue({
      code: 'custom',
      path: ['data', 'appSettings'],
      message: 'Les paramètres historiques sont requis avant la version 6.',
    });
  }

  if (envelope.schemaVersion >= 10) {
    for (const tableName of [
      'dailyCheckIns',
      'dailyActivityDecisions',
      'dailyCheckOuts',
    ] as const) {
      if (data[tableName] === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['data', tableName],
          message: `La table ${tableName} est requise en sauvegarde v10.`,
        });
      }
    }
  }

  if (data.appSettings?.[0]?.id !== undefined && data.appSettings[0].id !== APP_SETTINGS_ID) {
    context.addIssue({
      code: 'custom',
      path: ['data', 'appSettings', 0, 'id'],
      message: 'L’identifiant des paramètres historiques est invalide.',
    });
  }

  const collections: [string, { id: string }[]][] = [
    ['userProfile', data.userProfile],
    ['appSettings', data.appSettings ?? []],
    ['userSettings', data.userSettings ?? []],
    ['weights', data.weights],
    ['dailySteps', data.dailySteps],
    ['dailyCheckIns', data.dailyCheckIns ?? []],
    ['dailyActivityDecisions', data.dailyActivityDecisions ?? []],
    ['dailyCheckOuts', data.dailyCheckOuts ?? []],
    ['activities', data.activities],
    ['foodProducts', data.foodProducts],
    ['meals', data.meals],
    ['foodEntries', data.foodEntries],
    ['favoriteMeals', data.favoriteMeals],
    ['recipes', data.recipes],
    ['recipeIngredients', data.recipeIngredients],
    ['dailyTargets', data.dailyTargets],
    ['dailyJournalStatuses', data.dailyJournalStatuses],
    ['weeklyReviews', data.weeklyReviews],
    ['acceptedCalorieAdjustments', data.acceptedCalorieAdjustments],
    ['exerciseDefinitions', data.exerciseDefinitions],
    ['workoutTemplates', data.workoutTemplates],
    ['workoutTemplateExercises', data.workoutTemplateExercises],
    ['workoutSessions', data.workoutSessions],
    ['workoutSessionExercises', data.workoutSessionExercises],
    ['strengthSets', data.strengthSets],
    ['progressionSuggestions', data.progressionSuggestions],
    ['goals', data.goals ?? []],
    [
      'endurancePlanningSessions',
      data.endurancePlanningSessions ?? [],
    ],
    ['earnedAchievements', data.earnedAchievements ?? []],
    ['unlockedVisualThemes', data.unlockedVisualThemes ?? []],
    [
      'visualThemePreferences',
      data.visualThemePreferences ?? [],
    ],
    [
      'weeklyMissionCompletions',
      data.weeklyMissionCompletions ?? [],
    ],
    [
      'routineReminderCompletions',
      data.routineReminderCompletions ?? [],
    ],
    ['deletionRecords', data.deletionRecords ?? []],
    ['friendProfiles', data.friendProfiles ?? []],
    ['friendRequests', data.friendRequests ?? []],
    ['friendsPrivacySettings', data.friendsPrivacySettings ?? []],
    ['friendActivityPermissions', data.friendActivityPermissions ?? []],
  ];

  for (const [name, values] of collections) {
    addDuplicateIssues(values, (value) => value.id, ['data', name], `La table ${name}`, context);
  }

  addDuplicateIssues(data.weights, (value) => value.date, ['data', 'weights'], 'Les pesées', context);
  addDuplicateIssues(data.dailySteps, (value) => value.date, ['data', 'dailySteps'], 'Les pas', context);
  addDuplicateIssues(data.dailyCheckIns ?? [], (value) => value.date, ['data', 'dailyCheckIns'], 'Les check-ins', context);
  addDuplicateIssues(data.dailyActivityDecisions ?? [], (value) => value.date, ['data', 'dailyActivityDecisions'], 'Les decisions quotidiennes', context);
  addDuplicateIssues(data.dailyCheckOuts ?? [], (value) => value.date, ['data', 'dailyCheckOuts'], 'Les check-outs', context);
  addDuplicateIssues(data.dailyTargets, (value) => value.date, ['data', 'dailyTargets'], 'Les objectifs quotidiens', context);
  addDuplicateIssues(
    data.dailyJournalStatuses,
    (value) => value.date,
    ['data', 'dailyJournalStatuses'],
    'Les statuts du journal',
    context,
  );
  addDuplicateIssues(data.weeklyReviews, (value) => value.weekStart, ['data', 'weeklyReviews'], 'Les bilans', context);
  addDuplicateIssues(data.meals, (value) => `${value.date}|${value.slot}`, ['data', 'meals'], 'Les repas', context);
  addDuplicateIssues(
    data.weeklyMissionCompletions ?? [],
    (value) => value.weekStart,
    ['data', 'weeklyMissionCompletions'],
    'Les missions hebdomadaires',
    context,
  );
  addDuplicateIssues(
    data.friendProfiles ?? [],
    (value) => value.handle,
    ['data', 'friendProfiles'],
    'Les profils amis',
    context,
  );
  addDuplicateIssues(
    data.friendRequests ?? [],
    (value) => `${value.handle}|${value.direction}|${value.status}`,
    ['data', 'friendRequests'],
    'Les demandes amis',
    context,
  );
  addDuplicateIssues(
    data.friendActivityPermissions ?? [],
    (value) => value.id,
    ['data', 'friendActivityPermissions'],
    'Les permissions de partage par ami',
    context,
  );

  addDuplicateIssues(
    data.routineReminderCompletions ?? [],
    (value) => `${value.date}|${value.type}`,
    ['data', 'routineReminderCompletions'],
    'Les complétions de rappels',
    context,
  );

  (data.weeklyMissionCompletions ?? []).forEach(
    (completion, index) => {
      if (
        completion.id !==
        weeklyMissionCompletionId(completion.weekStart)
      ) {
        context.addIssue({
          code: 'custom',
          path: [
            'data',
            'weeklyMissionCompletions',
            index,
            'id',
          ],
          message:
            'L’identifiant de mission hebdomadaire est invalide.',
        });
      }
    },
  );

  (data.routineReminderCompletions ?? []).forEach(
    (completion, index) => {
      if (
        completion.id !==
        routineReminderCompletionId(
          completion.date,
          completion.type,
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: [
            'data',
            'routineReminderCompletions',
            index,
            'id',
          ],
          message:
            'L’identifiant de complétion de rappel est invalide.',
        });
      }
    },
  );

  (data.deletionRecords ?? []).forEach((record, index) => {
    if (
      record.id !==
      deletionRecordId(record.entityType, record.entityId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'deletionRecords', index, 'id'],
        message: 'L’identifiant du marqueur de suppression est invalide.',
      });
    }

    if (record.status === 'restored' && !record.restoredAt) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'deletionRecords', index, 'restoredAt'],
        message:
          'Un marqueur restauré doit contenir sa date de restauration.',
      });
    }

    if (record.status === 'deleted' && record.restoredAt) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'deletionRecords', index, 'restoredAt'],
        message:
          'Un marqueur supprimé ne doit pas contenir de date de restauration.',
      });
    }
  });

  const unlockedThemeIds = new Set(
    (data.unlockedVisualThemes ?? []).map(({ id }) => id),
  );
  (data.visualThemePreferences ?? []).forEach(
    (preference, index) => {
      if (!unlockedThemeIds.has(preference.activeThemeId)) {
        context.addIssue({
          code: 'custom',
          path: [
            'data',
            'visualThemePreferences',
            index,
            'activeThemeId',
          ],
          message:
            'Le thème actif doit être présent parmi les thèmes débloqués.',
        });
      }
    },
  );
  addDuplicateIssues(
    data.recipeIngredients,
    (value) => `${value.recipeId}|${value.sortOrder}`,
    ['data', 'recipeIngredients'],
    'Les positions d’ingrédients',
    context,
  );

  addDuplicateIssues(
    data.workoutTemplateExercises,
    (value) => `${value.templateId}|${value.sortOrder}`,
    ['data', 'workoutTemplateExercises'],
    'Les positions d’exercices des séances modèles',
    context,
  );
  addDuplicateIssues(
    data.workoutSessionExercises,
    (value) => `${value.sessionId}|${value.sortOrder}`,
    ['data', 'workoutSessionExercises'],
    'Les positions d’exercices des séances réalisées',
    context,
  );
  addDuplicateIssues(
    data.strengthSets,
    (value) => `${value.sessionExerciseId}|${value.setNumber}`,
    ['data', 'strengthSets'],
    'Les numéros de séries',
    context,
  );

  const mealById = new Map(data.meals.map((meal) => [meal.id, meal]));
  data.foodEntries.forEach((entry, index) => {
    const meal = mealById.get(entry.mealId);
    if (!meal) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'foodEntries', index, 'mealId'],
        message: 'Le repas associé à cette entrée est absent.',
      });
      return;
    }
    if (meal.date !== entry.date || meal.slot !== entry.mealSlot) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'foodEntries', index],
        message: 'La date ou l’emplacement de l’entrée ne correspond pas au repas.',
      });
    }
  });

  const recipeIds = new Set(data.recipes.map((recipe) => recipe.id));
  const productIds = new Set(data.foodProducts.map((product) => product.id));
  data.recipeIngredients.forEach((ingredient, index) => {
    if (!recipeIds.has(ingredient.recipeId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'recipeIngredients', index, 'recipeId'],
        message: 'La recette associée à cet ingrédient est absente.',
      });
    }
    if (!productIds.has(ingredient.productId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'recipeIngredients', index, 'productId'],
        message: 'L’aliment associé à cet ingrédient est absent.',
      });
    }
  });

  const reviewIds = new Set(data.weeklyReviews.map((review) => review.id));
  data.acceptedCalorieAdjustments.forEach((adjustment, index) => {
    if (!reviewIds.has(adjustment.weeklyReviewId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'acceptedCalorieAdjustments', index, 'weeklyReviewId'],
        message: 'Le bilan associé à cet ajustement est absent.',
      });
    }
  });

  const exerciseIds = new Set(data.exerciseDefinitions.map((exercise) => exercise.id));
  const templateIds = new Set(data.workoutTemplates.map((template) => template.id));
  const templateExerciseIds = new Set(
    data.workoutTemplateExercises.map((templateExercise) => templateExercise.id),
  );
  const sessionIds = new Set(data.workoutSessions.map((session) => session.id));
  const sessionExerciseById = new Map(
    data.workoutSessionExercises.map((sessionExercise) => [sessionExercise.id, sessionExercise]),
  );

  data.workoutTemplateExercises.forEach((templateExercise, index) => {
    if (!templateIds.has(templateExercise.templateId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'workoutTemplateExercises', index, 'templateId'],
        message: 'La séance modèle associée à cet exercice est absente.',
      });
    }
    if (!exerciseIds.has(templateExercise.exerciseDefinitionId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'workoutTemplateExercises', index, 'exerciseDefinitionId'],
        message: 'La définition d’exercice associée est absente.',
      });
    }
  });

  data.workoutSessionExercises.forEach((sessionExercise, index) => {
    if (!sessionIds.has(sessionExercise.sessionId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'workoutSessionExercises', index, 'sessionId'],
        message: 'La séance réalisée associée à cet exercice est absente.',
      });
    }
    if (!exerciseIds.has(sessionExercise.exerciseDefinitionId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'workoutSessionExercises', index, 'exerciseDefinitionId'],
        message: 'La définition d’exercice associée est absente.',
      });
    }
    if (
      sessionExercise.sourceTemplateExerciseId !== undefined &&
      !templateExerciseIds.has(sessionExercise.sourceTemplateExerciseId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'workoutSessionExercises', index, 'sourceTemplateExerciseId'],
        message: 'L’exercice de séance modèle d’origine est absent.',
      });
    }
  });

  data.strengthSets.forEach((strengthSet, index) => {
    const sessionExercise = sessionExerciseById.get(strengthSet.sessionExerciseId);
    if (!sessionIds.has(strengthSet.sessionId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'strengthSets', index, 'sessionId'],
        message: 'La séance réalisée associée à cette série est absente.',
      });
    }
    if (!sessionExercise) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'strengthSets', index, 'sessionExerciseId'],
        message: 'L’exercice réalisé associé à cette série est absent.',
      });
    } else if (sessionExercise.sessionId !== strengthSet.sessionId) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'strengthSets', index],
        message: 'La série et son exercice ne correspondent pas à la même séance.',
      });
    }
  });

  data.progressionSuggestions.forEach((suggestion, index) => {
    const sessionExercise = sessionExerciseById.get(suggestion.sessionExerciseId);
    if (!sessionIds.has(suggestion.sessionId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'progressionSuggestions', index, 'sessionId'],
        message: 'La séance réalisée associée à cette suggestion est absente.',
      });
    }
    if (!sessionExercise) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'progressionSuggestions', index, 'sessionExerciseId'],
        message: 'L’exercice réalisé associé à cette suggestion est absent.',
      });
    }
    if (!exerciseIds.has(suggestion.exerciseDefinitionId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'progressionSuggestions', index, 'exerciseDefinitionId'],
        message: 'La définition d’exercice associée à cette suggestion est absente.',
      });
    }
    if (suggestion.templateId !== undefined && !templateIds.has(suggestion.templateId)) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'progressionSuggestions', index, 'templateId'],
        message: 'La séance modèle associée à cette suggestion est absente.',
      });
    }
    if (
      suggestion.templateExerciseId !== undefined &&
      !templateExerciseIds.has(suggestion.templateExerciseId)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['data', 'progressionSuggestions', index, 'templateExerciseId'],
        message: 'L’exercice de séance modèle associé à cette suggestion est absent.',
      });
    }
  });
});

export function validateBackupEnvelope(input: unknown): BackupEnvelope {
  return backupEnvelopeSchema.parse(input) as unknown as BackupEnvelope;
}

export function formatBackupValidationError(error: z.ZodError): string {
  const firstIssues = error.issues.slice(0, 5).map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'fichier';
    return `${path} : ${issue.message}`;
  });
  const remaining = error.issues.length - firstIssues.length;
  return `${firstIssues.join('\n')}${remaining > 0 ? `\n… et ${remaining} autre(s) erreur(s).` : ''}`;
}
