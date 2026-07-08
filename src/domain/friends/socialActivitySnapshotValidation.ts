import {
  SOCIAL_ACTIVITY_CARDIO_FIELDS,
  SOCIAL_ACTIVITY_COMMON_FIELDS,
  SOCIAL_ACTIVITY_STRENGTH_FIELDS,
  SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION,
  assertNoForbiddenSocialActivitySourceFields,
  selectSocialActivityFieldsForFamily,
  type SocialActivityFieldSelection,
  type SocialActivityFamily,
  type SocialActivityShareField,
} from '@/domain/friends/socialActivitySharingPolicy';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
  createSocialActivitySnapshotV2Id,
  type SocialActivitySnapshotValidationIssue,
  type SocialActivitySnapshotValidationResult,
  type SocialActivitySnapshotSourceKind,
  type SocialActivitySnapshotV2,
  type SocialActivitySnapshotSummary,
} from '@/domain/friends/socialActivitySnapshotContract';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const activeTopLevelKeys = new Set([
  'contractVersion',
  'snapshotId',
  'ownerUserId',
  'recipientUserId',
  'sourceKind',
  'sourceActivityId',
  'sourceRevision',
  'createdAt',
  'updatedAt',
  'state',
  'visibility',
  'family',
  'activityType',
  'title',
  'occurredOn',
  'occurredTime',
  'occurredAt',
  'allowedFields',
  'summary',
  'detail',
]);
const deletedTopLevelKeys = new Set([
  'contractVersion',
  'snapshotId',
  'ownerUserId',
  'recipientUserId',
  'sourceKind',
  'sourceActivityId',
  'sourceRevision',
  'createdAt',
  'updatedAt',
  'state',
  'deletedAt',
  'deletionReason',
]);
const summaryKeys = new Set([
  'durationMinutes',
  'intensity',
  'caloriesKcal',
  'distanceKm',
  'distanceMeters',
  'paceMinutesPerKm',
  'paceSecondsPer100Meters',
  'speedKph',
  'elevationGainMeters',
  'averageHeartRateBpm',
  'averageCadencePerMinute',
  'exerciseCount',
  'muscleGroups',
  'volumeKg',
]);
const cardioDetailKeys = new Set([
  'family',
  'sessionType',
  'terrainType',
  'mainStroke',
  'poolLengthMeters',
  'bikeType',
  'environment',
  'paceSeries',
  'intervals',
  'laps',
  'segments',
  'chart',
]);
const strengthDetailKeys = new Set(['family', 'sessionName', 'exercises']);
const genericDetailKeys = new Set(['family']);
const strengthExerciseKeys = new Set(['name', 'muscleGroups', 'trackingMode', 'sets']);
const strengthSetKeys = new Set([
  'setNumber',
  'type',
  'repetitions',
  'loadKg',
  'loadUnit',
  'durationSeconds',
  'distanceMeters',
  'rpe',
  'restSeconds',
]);
const intervalKeys = new Set([
  'label',
  'durationSeconds',
  'distanceMeters',
  'paceMinutesPerKm',
  'paceSecondsPer100Meters',
  'speedKph',
]);
const lapKeys = new Set([
  'lapNumber',
  'durationSeconds',
  'distanceMeters',
  'paceMinutesPerKm',
  'paceSecondsPer100Meters',
  'speedKph',
]);
const segmentKeys = new Set([
  'label',
  'durationSeconds',
  'distanceMeters',
  'paceMinutesPerKm',
  'paceSecondsPer100Meters',
  'speedKph',
  'elevationGainMeters',
]);
const pacePointKeys = new Set(['elapsedSeconds', 'paceMinutesPerKm']);
const chartKeys = new Set(['metric', 'points']);
const chartPointKeys = new Set(['elapsedSeconds', 'value']);
const sourceKindSet = new Set<string>(['activity', 'strengthSession']);
const activeVisibilitySet = new Set<string>(['summary', 'detailed', 'custom']);
const familySet = new Set<string>(['cardio', 'strength', 'generic']);
const activityTypeSet = new Set<string>([
  'running',
  'swimming',
  'strengthTraining',
  'cycling',
  'walking',
  'otherCardio',
]);
const intensitySet = new Set<string>(['low', 'moderate', 'high']);
const deletionReasonSet = new Set<string>(['sourceDeleted', 'sharingDisabled', 'friendRevoked']);
const loadUnitSet = new Set<string>(['kg', 'bodyweight', 'assistedKg', 'none']);
const trackingModeSet = new Set<string>([
  'loadRepetitions',
  'bodyweightRepetitions',
  'assistedRepetitions',
  'repetitions',
  'duration',
  'distance',
]);
const strengthSetTypeSet = new Set<string>(['warmup', 'working', 'dropSet', 'failure', 'other']);
const muscleGroupSet = new Set<string>([
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
const chartMetricSet = new Set<string>(['pace', 'speed', 'heartRate', 'cadence']);

const summaryFieldByKey: Readonly<Record<keyof SocialActivitySnapshotSummary, SocialActivityShareField>> = {
  durationMinutes: 'duration',
  intensity: 'intensity',
  caloriesKcal: 'calories',
  distanceKm: 'distance',
  distanceMeters: 'distance',
  paceMinutesPerKm: 'pace',
  paceSecondsPer100Meters: 'pace',
  speedKph: 'speed',
  elevationGainMeters: 'elevation',
  averageHeartRateBpm: 'heartRate',
  averageCadencePerMinute: 'cadence',
  exerciseCount: 'exerciseCount',
  muscleGroups: 'muscleGroups',
  volumeKg: 'volume',
};

function addIssue(
  issues: SocialActivitySnapshotValidationIssue[],
  path: string,
  message: string,
): void {
  issues.push({ path, message });
}

function validateExactKeys(
  value: Record<string, unknown>,
  allowedKeys: ReadonlySet<string>,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  Object.keys(value).forEach((key) => {
    if (!allowedKeys.has(key)) addIssue(issues, `${path}.${key}`, 'Champ non prévu par le contrat.');
  });
}

function validateNonEmptyString(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    addIssue(issues, path, 'Une chaîne non vide est attendue.');
  }
}

function validateOptionalNonEmptyString(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (value !== undefined) validateNonEmptyString(value, path, issues);
}

function validateNonNegativeNumber(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    addIssue(issues, path, 'Un nombre positif ou nul est attendu.');
  }
}

function validateOptionalNonNegativeNumber(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (value !== undefined) validateNonNegativeNumber(value, path, issues);
}

function validatePositiveInteger(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    addIssue(issues, path, 'Un entier strictement positif est attendu.');
  }
}

function validateEnum(
  value: unknown,
  allowedValues: ReadonlySet<string>,
  path: string,
  message: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (typeof value !== 'string' || !allowedValues.has(value)) addIssue(issues, path, message);
}

function validateOptionalEnum(
  value: unknown,
  allowedValues: ReadonlySet<string>,
  path: string,
  message: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (value !== undefined) validateEnum(value, allowedValues, path, message, issues);
}

function validateMuscleGroups(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Une liste de groupes musculaires est attendue.');
    return;
  }

  value.forEach((group, index) => {
    validateEnum(group, muscleGroupSet, `${path}[${index}]`, 'Groupe musculaire inconnu.', issues);
  });
}

function hasAllowedField(
  selection: SocialActivityFieldSelection,
  field: SocialActivityShareField,
): boolean {
  return selection.common.includes(field as never)
    || selection.cardio.includes(field as never)
    || selection.strength.includes(field as never);
}

function validateSummaryFieldScope(
  selection: SocialActivityFieldSelection,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  const groups: readonly [
    keyof SocialActivityFieldSelection,
    readonly string[],
  ][] = [
    ['common', selection.common],
    ['cardio', selection.cardio],
    ['strength', selection.strength],
  ];

  groups.forEach(([group, fields]) => {
    const allowed = new Set<string>(SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION[group]);
    fields.forEach((field, index) => {
      if (!allowed.has(field)) {
        addIssue(
          issues,
          `${path}.${group}[${index}]`,
          'Champ trop détaillé pour une visibilité résumé.',
        );
      }
    });
  });
}

function validateSummary(
  value: unknown,
  allowedFields: SocialActivityFieldSelection,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Un résumé typé est attendu.');
    return;
  }

  validateExactKeys(value, summaryKeys, path, issues);
  Object.entries(value).forEach(([key, fieldValue]) => {
    const mappedField = summaryFieldByKey[key as keyof SocialActivitySnapshotSummary];
    if (mappedField && !hasAllowedField(allowedFields, mappedField)) {
      addIssue(issues, `${path}.${key}`, `Le champ ${mappedField} n'est pas autorisé.`);
    }

    if (key === 'intensity') {
      validateEnum(fieldValue, intensitySet, `${path}.${key}`, 'Intensité inconnue.', issues);
    } else if (key === 'muscleGroups') {
      validateMuscleGroups(fieldValue, `${path}.${key}`, issues);
    } else {
      validateNonNegativeNumber(fieldValue, `${path}.${key}`, issues);
    }
  });
}

function validatePacePoints(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Une série de rythme est attendue.');
    return;
  }
  value.forEach((point, index) => {
    const pointPath = `${path}[${index}]`;
    if (!isRecord(point)) {
      addIssue(issues, pointPath, 'Un point de rythme est attendu.');
      return;
    }
    validateExactKeys(point, pacePointKeys, pointPath, issues);
    validateNonNegativeNumber(point.elapsedSeconds, `${pointPath}.elapsedSeconds`, issues);
    validateNonNegativeNumber(point.paceMinutesPerKm, `${pointPath}.paceMinutesPerKm`, issues);
  });
}

function validateMetricBlocks(
  value: unknown,
  path: string,
  keys: ReadonlySet<string>,
  identityKey: 'label' | 'lapNumber',
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Une liste structurée est attendue.');
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      addIssue(issues, itemPath, 'Un élément structuré est attendu.');
      return;
    }
    validateExactKeys(item, keys, itemPath, issues);
    if (identityKey === 'label') {
      validateNonEmptyString(item.label, `${itemPath}.label`, issues);
    } else {
      validatePositiveInteger(item.lapNumber, `${itemPath}.lapNumber`, issues);
    }
    Object.entries(item).forEach(([key, fieldValue]) => {
      if (key !== identityKey) validateOptionalNonNegativeNumber(fieldValue, `${itemPath}.${key}`, issues);
    });
  });
}

function validateChart(
  value: unknown,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Un graphique structuré est attendu.');
    return;
  }
  validateExactKeys(value, chartKeys, path, issues);
  validateEnum(value.metric, chartMetricSet, `${path}.metric`, 'Métrique de graphique inconnue.', issues);
  if (!Array.isArray(value.points)) {
    addIssue(issues, `${path}.points`, 'Une liste de points est attendue.');
    return;
  }
  value.points.forEach((point, index) => {
    const pointPath = `${path}.points[${index}]`;
    if (!isRecord(point)) {
      addIssue(issues, pointPath, 'Un point de graphique est attendu.');
      return;
    }
    validateExactKeys(point, chartPointKeys, pointPath, issues);
    validateNonNegativeNumber(point.elapsedSeconds, `${pointPath}.elapsedSeconds`, issues);
    validateNonNegativeNumber(point.value, `${pointPath}.value`, issues);
  });
}

function validateCardioDetail(
  value: Record<string, unknown>,
  allowedFields: SocialActivityFieldSelection,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  validateExactKeys(value, cardioDetailKeys, path, issues);
  const simpleFields: readonly [string, SocialActivityShareField][] = [
    ['sessionType', 'sessionType'],
    ['terrainType', 'terrain'],
    ['mainStroke', 'stroke'],
    ['poolLengthMeters', 'poolLength'],
    ['bikeType', 'bikeType'],
    ['environment', 'environment'],
  ];
  simpleFields.forEach(([key, field]) => {
    if (value[key] !== undefined && !hasAllowedField(allowedFields, field)) {
      addIssue(issues, `${path}.${key}`, `Le champ ${field} n'est pas autorisé.`);
    }
  });
  validateOptionalNonEmptyString(value.sessionType, `${path}.sessionType`, issues);
  validateOptionalNonEmptyString(value.terrainType, `${path}.terrainType`, issues);
  validateOptionalNonEmptyString(value.mainStroke, `${path}.mainStroke`, issues);
  validateOptionalNonNegativeNumber(value.poolLengthMeters, `${path}.poolLengthMeters`, issues);
  validateOptionalNonEmptyString(value.bikeType, `${path}.bikeType`, issues);
  validateOptionalNonEmptyString(value.environment, `${path}.environment`, issues);

  if (value.paceSeries !== undefined) {
    if (!hasAllowedField(allowedFields, 'paceSeries')) {
      addIssue(issues, `${path}.paceSeries`, 'Le champ paceSeries n\'est pas autorisé.');
    }
    validatePacePoints(value.paceSeries, `${path}.paceSeries`, issues);
  }
  if (value.intervals !== undefined) {
    if (!hasAllowedField(allowedFields, 'intervals')) {
      addIssue(issues, `${path}.intervals`, 'Le champ intervals n\'est pas autorisé.');
    }
    validateMetricBlocks(value.intervals, `${path}.intervals`, intervalKeys, 'label', issues);
  }
  if (value.laps !== undefined) {
    if (!hasAllowedField(allowedFields, 'laps')) {
      addIssue(issues, `${path}.laps`, 'Le champ laps n\'est pas autorisé.');
    }
    validateMetricBlocks(value.laps, `${path}.laps`, lapKeys, 'lapNumber', issues);
  }
  if (value.segments !== undefined) {
    if (!hasAllowedField(allowedFields, 'segments')) {
      addIssue(issues, `${path}.segments`, 'Le champ segments n\'est pas autorisé.');
    }
    validateMetricBlocks(value.segments, `${path}.segments`, segmentKeys, 'label', issues);
  }
  if (value.chart !== undefined) {
    if (!hasAllowedField(allowedFields, 'chart')) {
      addIssue(issues, `${path}.chart`, 'Le champ chart n\'est pas autorisé.');
    }
    validateChart(value.chart, `${path}.chart`, issues);
  }
}

function validateStrengthSet(
  value: unknown,
  allowedFields: SocialActivityFieldSelection,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Une série de musculation est attendue.');
    return;
  }
  validateExactKeys(value, strengthSetKeys, path, issues);
  validatePositiveInteger(value.setNumber, `${path}.setNumber`, issues);
  validateOptionalEnum(value.type, strengthSetTypeSet, `${path}.type`, 'Type de série inconnu.', issues);
  validateOptionalNonNegativeNumber(value.repetitions, `${path}.repetitions`, issues);
  validateOptionalNonNegativeNumber(value.loadKg, `${path}.loadKg`, issues);
  validateOptionalEnum(value.loadUnit, loadUnitSet, `${path}.loadUnit`, 'Unité de charge inconnue.', issues);
  validateOptionalNonNegativeNumber(value.durationSeconds, `${path}.durationSeconds`, issues);
  validateOptionalNonNegativeNumber(value.distanceMeters, `${path}.distanceMeters`, issues);
  validateOptionalNonNegativeNumber(value.rpe, `${path}.rpe`, issues);
  validateOptionalNonNegativeNumber(value.restSeconds, `${path}.restSeconds`, issues);

  if (value.repetitions !== undefined && !hasAllowedField(allowedFields, 'repetitions')) {
    addIssue(issues, `${path}.repetitions`, 'Le champ repetitions n\'est pas autorisé.');
  }
  if (value.loadKg !== undefined && !hasAllowedField(allowedFields, 'loads')) {
    addIssue(issues, `${path}.loadKg`, 'Le champ loads n\'est pas autorisé.');
  }
  if (value.loadUnit === 'bodyweight' && !hasAllowedField(allowedFields, 'bodyweight')) {
    addIssue(issues, `${path}.loadUnit`, 'Le champ bodyweight n\'est pas autorisé.');
  }
  if (value.rpe !== undefined && !hasAllowedField(allowedFields, 'rpe')) {
    addIssue(issues, `${path}.rpe`, 'Le champ rpe n\'est pas autorisé.');
  }
  if (value.restSeconds !== undefined && !hasAllowedField(allowedFields, 'restTimes')) {
    addIssue(issues, `${path}.restSeconds`, 'Le champ restTimes n\'est pas autorisé.');
  }
}

function validateStrengthExercises(
  value: unknown,
  allowedFields: SocialActivityFieldSelection,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Une liste d\'exercices est attendue.');
    return;
  }
  value.forEach((exercise, index) => {
    const exercisePath = `${path}[${index}]`;
    if (!isRecord(exercise)) {
      addIssue(issues, exercisePath, 'Un exercice est attendu.');
      return;
    }
    validateExactKeys(exercise, strengthExerciseKeys, exercisePath, issues);
    validateNonEmptyString(exercise.name, `${exercisePath}.name`, issues);
    if (exercise.muscleGroups !== undefined) {
      if (!hasAllowedField(allowedFields, 'muscleGroups')) {
        addIssue(issues, `${exercisePath}.muscleGroups`, 'Le champ muscleGroups n\'est pas autorisé.');
      }
      validateMuscleGroups(exercise.muscleGroups, `${exercisePath}.muscleGroups`, issues);
    }
    validateOptionalEnum(
      exercise.trackingMode,
      trackingModeSet,
      `${exercisePath}.trackingMode`,
      'Mode de suivi inconnu.',
      issues,
    );
    if (exercise.sets !== undefined) {
      if (!hasAllowedField(allowedFields, 'sets')) {
        addIssue(issues, `${exercisePath}.sets`, 'Le champ sets n\'est pas autorisé.');
      }
      if (!Array.isArray(exercise.sets)) {
        addIssue(issues, `${exercisePath}.sets`, 'Une liste de séries est attendue.');
      } else {
        exercise.sets.forEach((set, setIndex) => {
          validateStrengthSet(set, allowedFields, `${exercisePath}.sets[${setIndex}]`, issues);
        });
      }
    }
  });
}

function validateStrengthDetail(
  value: Record<string, unknown>,
  allowedFields: SocialActivityFieldSelection,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  validateExactKeys(value, strengthDetailKeys, path, issues);
  if (value.sessionName !== undefined) {
    if (!hasAllowedField(allowedFields, 'sessionName')) {
      addIssue(issues, `${path}.sessionName`, 'Le champ sessionName n\'est pas autorisé.');
    }
    validateNonEmptyString(value.sessionName, `${path}.sessionName`, issues);
  }
  if (value.exercises !== undefined) {
    if (!hasAllowedField(allowedFields, 'exercises')) {
      addIssue(issues, `${path}.exercises`, 'Le champ exercises n\'est pas autorisé.');
    }
    validateStrengthExercises(value.exercises, allowedFields, `${path}.exercises`, issues);
  }
}

function validateDetail(
  value: unknown,
  family: SocialActivityFamily,
  allowedFields: SocialActivityFieldSelection,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Un détail typé est attendu.');
    return;
  }
  if (value.family !== family) {
    addIssue(issues, `${path}.family`, 'La famille du détail ne correspond pas au snapshot.');
    return;
  }
  if (family === 'cardio') {
    validateCardioDetail(value, allowedFields, path, issues);
  } else if (family === 'strength') {
    validateStrengthDetail(value, allowedFields, path, issues);
  } else {
    validateExactKeys(value, genericDetailKeys, path, issues);
  }
}

function validateAllowedFields(
  value: unknown,
  family: SocialActivityFamily,
  path: string,
  issues: SocialActivitySnapshotValidationIssue[],
): SocialActivityFieldSelection | undefined {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Une sélection de champs est attendue.');
    return undefined;
  }
  const expectedKeys = new Set(['common', 'cardio', 'strength']);
  validateExactKeys(value, expectedKeys, path, issues);
  const groups: readonly [keyof SocialActivityFieldSelection, readonly string[]][] = [
    ['common', SOCIAL_ACTIVITY_COMMON_FIELDS],
    ['cardio', SOCIAL_ACTIVITY_CARDIO_FIELDS],
    ['strength', SOCIAL_ACTIVITY_STRENGTH_FIELDS],
  ];
  groups.forEach(([group, allowed]) => {
    const fields = value[group];
    if (!Array.isArray(fields)) {
      addIssue(issues, `${path}.${group}`, 'Une liste de champs est attendue.');
      return;
    }
    const seen = new Set<string>();
    fields.forEach((field, index) => {
      if (typeof field !== 'string' || !allowed.includes(field as never)) {
        addIssue(issues, `${path}.${group}[${index}]`, 'Champ de partage inconnu.');
      } else if (seen.has(field)) {
        addIssue(issues, `${path}.${group}[${index}]`, 'Champ de partage dupliqué.');
      }
      if (typeof field === 'string') seen.add(field);
    });
  });
  if (!Array.isArray(value.common) || !Array.isArray(value.cardio) || !Array.isArray(value.strength)) {
    return undefined;
  }

  const selection = value as unknown as SocialActivityFieldSelection;
  if (!selection.common.includes('activityType')) {
    addIssue(issues, `${path}.common`, 'Le champ activityType est obligatoire.');
  }
  if (!selection.common.includes('date')) {
    addIssue(issues, `${path}.common`, 'Le champ date est obligatoire.');
  }
  const familySelection = selectSocialActivityFieldsForFamily(selection, family);
  if (JSON.stringify(selection) !== JSON.stringify(familySelection)) {
    addIssue(issues, path, 'La sélection contient des champs d\'une autre famille.');
  }
  return selection;
}

function validateIdentity(
  value: Record<string, unknown>,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  if (value.contractVersion !== SOCIAL_ACTIVITY_SNAPSHOT_CONTRACT_VERSION) {
    addIssue(issues, '$.contractVersion', 'Version de contrat de snapshot incompatible.');
  }
  validateNonEmptyString(value.snapshotId, '$.snapshotId', issues);
  validateNonEmptyString(value.ownerUserId, '$.ownerUserId', issues);
  validateNonEmptyString(value.recipientUserId, '$.recipientUserId', issues);
  validateEnum(value.sourceKind, sourceKindSet, '$.sourceKind', 'Type de source inconnu.', issues);
  validateNonEmptyString(value.sourceActivityId, '$.sourceActivityId', issues);
  validateNonEmptyString(value.sourceRevision, '$.sourceRevision', issues);
  validateNonEmptyString(value.createdAt, '$.createdAt', issues);
  validateNonEmptyString(value.updatedAt, '$.updatedAt', issues);

  if (
    typeof value.ownerUserId === 'string'
    && typeof value.recipientUserId === 'string'
    && typeof value.sourceKind === 'string'
    && sourceKindSet.has(value.sourceKind)
    && typeof value.sourceActivityId === 'string'
  ) {
    const expectedId = createSocialActivitySnapshotV2Id({
      ownerUserId: value.ownerUserId,
      recipientUserId: value.recipientUserId,
      sourceKind: value.sourceKind as SocialActivitySnapshotSourceKind,
      sourceActivityId: value.sourceActivityId,
    });
    if (value.snapshotId !== expectedId) {
      addIssue(issues, '$.snapshotId', 'Identifiant non déterministe pour cette source et ce destinataire.');
    }
  }
}

function validateActiveSnapshot(
  value: Record<string, unknown>,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  validateExactKeys(value, activeTopLevelKeys, '$', issues);
  validateIdentity(value, issues);
  validateEnum(value.visibility, activeVisibilitySet, '$.visibility', 'Visibilité active invalide.', issues);
  validateEnum(value.family, familySet, '$.family', 'Famille d\'activité inconnue.', issues);
  validateEnum(value.activityType, activityTypeSet, '$.activityType', 'Type d\'activité inconnu.', issues);
  validateOptionalNonEmptyString(value.title, '$.title', issues);
  validateNonEmptyString(value.occurredOn, '$.occurredOn', issues);
  validateOptionalNonEmptyString(value.occurredTime, '$.occurredTime', issues);
  validateOptionalNonEmptyString(value.occurredAt, '$.occurredAt', issues);

  if (value.title !== undefined && isRecord(value.allowedFields)) {
    const common = value.allowedFields.common;
    if (Array.isArray(common) && !common.includes('title')) {
      addIssue(issues, '$.title', 'Le champ title n\'est pas autorisé.');
    }
  }
  if ((value.occurredTime !== undefined || value.occurredAt !== undefined) && isRecord(value.allowedFields)) {
    const common = value.allowedFields.common;
    if (Array.isArray(common) && !common.includes('time')) {
      if (value.occurredTime !== undefined) {
        addIssue(issues, '$.occurredTime', 'Le champ time n\'est pas autorisé.');
      }
      if (value.occurredAt !== undefined) {
        addIssue(issues, '$.occurredAt', 'Le champ time n\'est pas autorisé.');
      }
    }
  }

  if (
    value.family === 'strength'
    && (value.activityType !== 'strengthTraining' || value.sourceKind !== 'strengthSession')
  ) {
    addIssue(issues, '$.sourceKind', 'Une projection de musculation doit provenir d\'une strengthSession.');
  }
  if (
    value.family !== 'strength'
    && (value.activityType === 'strengthTraining' || value.sourceKind !== 'activity')
  ) {
    addIssue(issues, '$.sourceKind', 'Une projection non musculation doit provenir d\'une activity.');
  }

  if (typeof value.family !== 'string' || !familySet.has(value.family)) return;
  const family = value.family as SocialActivityFamily;
  const allowedFields = validateAllowedFields(value.allowedFields, family, '$.allowedFields', issues);
  if (!allowedFields) return;
  if (value.visibility === 'summary') {
    validateSummaryFieldScope(allowedFields, '$.allowedFields', issues);
  }
  validateSummary(value.summary, allowedFields, '$.summary', issues);

  if (value.visibility === 'summary' && value.detail !== undefined) {
    addIssue(issues, '$.detail', 'Un snapshot résumé ne doit pas contenir de détail.');
  } else if (value.detail !== undefined) {
    validateDetail(value.detail, family, allowedFields, '$.detail', issues);
  }
}

function validateDeletedSnapshot(
  value: Record<string, unknown>,
  issues: SocialActivitySnapshotValidationIssue[],
): void {
  validateExactKeys(value, deletedTopLevelKeys, '$', issues);
  validateIdentity(value, issues);
  validateNonEmptyString(value.deletedAt, '$.deletedAt', issues);
  validateEnum(
    value.deletionReason,
    deletionReasonSet,
    '$.deletionReason',
    'Motif de suppression inconnu.',
    issues,
  );
}

export function validateSocialActivitySnapshotV2(
  value: unknown,
): SocialActivitySnapshotValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ path: '$', message: 'Un snapshot social est attendu.' }],
    };
  }

  const issues: SocialActivitySnapshotValidationIssue[] = [];
  if (value.state === 'active') {
    validateActiveSnapshot(value, issues);
  } else if (value.state === 'deleted') {
    validateDeletedSnapshot(value, issues);
  } else {
    addIssue(issues, '$.state', 'État de snapshot inconnu.');
  }

  try {
    assertNoForbiddenSocialActivitySourceFields(value);
  } catch (error) {
    addIssue(issues, '$', error instanceof Error ? error.message : 'Projection sociale interdite.');
  }

  return { valid: issues.length === 0, issues };
}

export function assertValidSocialActivitySnapshotV2(value: unknown): asserts value is SocialActivitySnapshotV2 {
  const validation = validateSocialActivitySnapshotV2(value);
  if (!validation.valid) {
    const details = validation.issues.map((issue) => `${issue.path}: ${issue.message}`).join(' | ');
    throw new Error(`Snapshot social 0.29 invalide : ${details}`);
  }
}
