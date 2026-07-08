const ACTIVE_TOP_LEVEL_KEYS = new Set([
  'contractVersion', 'snapshotId', 'ownerUserId', 'recipientUserId', 'sourceKind',
  'sourceActivityId', 'sourceRevision', 'createdAt', 'updatedAt', 'state',
  'visibility', 'family', 'activityType', 'title', 'occurredOn', 'occurredTime',
  'occurredAt', 'allowedFields', 'summary', 'detail',
]);
const DELETED_TOP_LEVEL_KEYS = new Set([
  'contractVersion', 'snapshotId', 'ownerUserId', 'recipientUserId', 'sourceKind',
  'sourceActivityId', 'sourceRevision', 'createdAt', 'updatedAt', 'state',
  'deletedAt', 'deletionReason',
]);
const COMMON_FIELDS = new Set([
  'activityType', 'title', 'date', 'time', 'duration', 'intensity', 'calories',
]);
const CARDIO_FIELDS = new Set([
  'distance', 'sessionType', 'terrain', 'stroke', 'poolLength', 'bikeType',
  'environment', 'pace', 'speed', 'paceSeries', 'elevation', 'heartRate',
  'cadence', 'intervals', 'laps', 'segments', 'chart',
]);
const STRENGTH_FIELDS = new Set([
  'sessionName', 'muscleGroups', 'exerciseCount', 'exercises', 'sets',
  'repetitions', 'loads', 'bodyweight', 'restTimes', 'rpe', 'volume',
]);
const SUMMARY_COMMON_FIELDS = new Set(['activityType', 'title', 'date', 'duration']);
const SUMMARY_CARDIO_FIELDS = new Set(['distance']);
const SUMMARY_STRENGTH_FIELDS = new Set(['sessionName', 'muscleGroups', 'exerciseCount']);
const SUMMARY_KEYS = new Set([
  'durationMinutes', 'intensity', 'caloriesKcal', 'distanceKm', 'distanceMeters',
  'paceMinutesPerKm', 'paceSecondsPer100Meters', 'speedKph',
  'elevationGainMeters', 'averageHeartRateBpm', 'averageCadencePerMinute',
  'exerciseCount', 'muscleGroups', 'volumeKg',
]);
const CARDIO_DETAIL_KEYS = new Set([
  'family', 'sessionType', 'terrainType', 'mainStroke', 'poolLengthMeters',
  'bikeType', 'environment', 'paceSeries', 'intervals', 'laps', 'segments', 'chart',
]);
const STRENGTH_DETAIL_KEYS = new Set(['family', 'sessionName', 'exercises']);
const GENERIC_DETAIL_KEYS = new Set(['family']);
const STRENGTH_EXERCISE_KEYS = new Set(['name', 'muscleGroups', 'trackingMode', 'sets']);
const STRENGTH_SET_KEYS = new Set([
  'setNumber', 'type', 'repetitions', 'loadKg', 'loadUnit', 'durationSeconds',
  'distanceMeters', 'rpe', 'restSeconds',
]);
const INTERVAL_KEYS = new Set([
  'label', 'durationSeconds', 'distanceMeters', 'paceMinutesPerKm',
  'paceSecondsPer100Meters', 'speedKph',
]);
const LAP_KEYS = new Set([
  'lapNumber', 'durationSeconds', 'distanceMeters', 'paceMinutesPerKm',
  'paceSecondsPer100Meters', 'speedKph',
]);
const SEGMENT_KEYS = new Set([
  'label', 'durationSeconds', 'distanceMeters', 'paceMinutesPerKm',
  'paceSecondsPer100Meters', 'speedKph', 'elevationGainMeters',
]);
const PACE_POINT_KEYS = new Set(['elapsedSeconds', 'paceMinutesPerKm']);
const CHART_KEYS = new Set(['metric', 'points']);
const CHART_POINT_KEYS = new Set(['elapsedSeconds', 'value']);
const SOURCE_KINDS = new Set(['activity', 'strengthSession']);
const ACTIVE_VISIBILITIES = new Set(['summary', 'detailed', 'custom']);
const FAMILIES = new Set(['cardio', 'strength', 'generic']);
const ACTIVITY_TYPES = new Set([
  'running', 'swimming', 'strengthTraining', 'cycling', 'walking', 'otherCardio',
]);
const INTENSITIES = new Set(['low', 'moderate', 'high']);
const DELETION_REASONS = new Set(['sourceDeleted', 'sharingDisabled', 'friendRevoked']);
const LOAD_UNITS = new Set(['kg', 'bodyweight', 'assistedKg', 'none']);
const TRACKING_MODES = new Set([
  'loadRepetitions', 'bodyweightRepetitions', 'assistedRepetitions',
  'repetitions', 'duration', 'distance',
]);
const STRENGTH_SET_TYPES = new Set(['warmup', 'working', 'dropSet', 'failure', 'other']);
const MUSCLE_GROUPS = new Set([
  'pectorals', 'back', 'shoulders', 'biceps', 'triceps', 'quadriceps',
  'hamstrings', 'glutes', 'calves', 'abdominals', 'lowerBack', 'fullBody', 'other',
]);
const CHART_METRICS = new Set(['pace', 'speed', 'heartRate', 'cadence']);
const SUMMARY_FIELD_BY_KEY = {
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

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function addIssue(issues, path, message) {
  issues.push({ path, message });
}

function validateExactKeys(value, allowed, path, issues) {
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) addIssue(issues, `${path}.${key}`, 'Champ non prévu par le contrat.');
  });
}

function validateNonEmptyString(value, path, issues) {
  if (typeof value !== 'string' || !value.trim()) addIssue(issues, path, 'Chaîne non vide attendue.');
}

function validateOptionalNonEmptyString(value, path, issues) {
  if (value !== undefined) validateNonEmptyString(value, path, issues);
}

function validateNonNegativeNumber(value, path, issues) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    addIssue(issues, path, 'Nombre positif ou nul attendu.');
  }
}

function validateOptionalNonNegativeNumber(value, path, issues) {
  if (value !== undefined) validateNonNegativeNumber(value, path, issues);
}

function validatePositiveInteger(value, path, issues) {
  if (!Number.isInteger(value) || value < 1) addIssue(issues, path, 'Entier strictement positif attendu.');
}

function validateEnum(value, allowed, path, issues) {
  if (typeof value !== 'string' || !allowed.has(value)) addIssue(issues, path, 'Valeur inconnue.');
}

function validateOptionalEnum(value, allowed, path, issues) {
  if (value !== undefined) validateEnum(value, allowed, path, issues);
}

function validateMuscleGroups(value, path, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Liste de groupes musculaires attendue.');
    return;
  }
  value.forEach((group, index) => validateEnum(group, MUSCLE_GROUPS, `${path}[${index}]`, issues));
}

function validateFieldArray(value, allowed, path, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Liste de champs attendue.');
    return [];
  }
  const seen = new Set();
  value.forEach((field, index) => {
    if (typeof field !== 'string' || !allowed.has(field)) {
      addIssue(issues, `${path}[${index}]`, 'Champ de partage inconnu.');
    } else if (seen.has(field)) {
      addIssue(issues, `${path}[${index}]`, 'Champ de partage dupliqué.');
    }
    if (typeof field === 'string') seen.add(field);
  });
  return value;
}

function validateAllowedFields(value, family, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Sélection de champs attendue.');
    return undefined;
  }
  validateExactKeys(value, new Set(['common', 'cardio', 'strength']), path, issues);
  const common = validateFieldArray(value.common, COMMON_FIELDS, `${path}.common`, issues);
  const cardio = validateFieldArray(value.cardio, CARDIO_FIELDS, `${path}.cardio`, issues);
  const strength = validateFieldArray(value.strength, STRENGTH_FIELDS, `${path}.strength`, issues);

  if (!common.includes('activityType')) addIssue(issues, `${path}.common`, 'activityType est obligatoire.');
  if (!common.includes('date')) addIssue(issues, `${path}.common`, 'date est obligatoire.');
  if (family === 'cardio' && strength.length > 0) addIssue(issues, `${path}.strength`, 'Champs musculation interdits pour cardio.');
  if (family === 'strength' && cardio.length > 0) addIssue(issues, `${path}.cardio`, 'Champs cardio interdits pour musculation.');
  if (family === 'generic' && (cardio.length > 0 || strength.length > 0)) {
    addIssue(issues, path, 'Champs spécialisés interdits pour une activité générique.');
  }
  return { common, cardio, strength };
}

function validateSummaryFieldScope(selection, path, issues) {
  const groups = [
    ['common', selection.common, SUMMARY_COMMON_FIELDS],
    ['cardio', selection.cardio, SUMMARY_CARDIO_FIELDS],
    ['strength', selection.strength, SUMMARY_STRENGTH_FIELDS],
  ];
  groups.forEach(([group, fields, allowed]) => {
    fields.forEach((field, index) => {
      if (!allowed.has(field)) {
        addIssue(issues, `${path}.${group}[${index}]`, 'Champ trop détaillé pour une visibilité résumé.');
      }
    });
  });
}

function hasAllowedField(selection, field) {
  return selection.common.includes(field)
    || selection.cardio.includes(field)
    || selection.strength.includes(field);
}

function validateSummary(value, allowedFields, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Résumé structuré attendu.');
    return;
  }
  validateExactKeys(value, SUMMARY_KEYS, path, issues);
  Object.entries(value).forEach(([key, fieldValue]) => {
    const field = SUMMARY_FIELD_BY_KEY[key];
    if (field && !hasAllowedField(allowedFields, field)) {
      addIssue(issues, `${path}.${key}`, `Le champ ${field} n'est pas autorisé.`);
    }
    if (key === 'intensity') validateEnum(fieldValue, INTENSITIES, `${path}.${key}`, issues);
    else if (key === 'muscleGroups') validateMuscleGroups(fieldValue, `${path}.${key}`, issues);
    else validateNonNegativeNumber(fieldValue, `${path}.${key}`, issues);
  });
}

function validatePacePoints(value, path, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Série de rythme attendue.');
    return;
  }
  value.forEach((point, index) => {
    const pointPath = `${path}[${index}]`;
    if (!isRecord(point)) {
      addIssue(issues, pointPath, 'Point de rythme attendu.');
      return;
    }
    validateExactKeys(point, PACE_POINT_KEYS, pointPath, issues);
    validateNonNegativeNumber(point.elapsedSeconds, `${pointPath}.elapsedSeconds`, issues);
    validateNonNegativeNumber(point.paceMinutesPerKm, `${pointPath}.paceMinutesPerKm`, issues);
  });
}

function validateMetricBlocks(value, path, keys, identityKey, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Liste structurée attendue.');
    return;
  }
  value.forEach((item, index) => {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      addIssue(issues, itemPath, 'Élément structuré attendu.');
      return;
    }
    validateExactKeys(item, keys, itemPath, issues);
    if (identityKey === 'label') validateNonEmptyString(item.label, `${itemPath}.label`, issues);
    else validatePositiveInteger(item.lapNumber, `${itemPath}.lapNumber`, issues);
    Object.entries(item).forEach(([key, fieldValue]) => {
      if (key !== identityKey) validateOptionalNonNegativeNumber(fieldValue, `${itemPath}.${key}`, issues);
    });
  });
}

function validateChart(value, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Graphique structuré attendu.');
    return;
  }
  validateExactKeys(value, CHART_KEYS, path, issues);
  validateEnum(value.metric, CHART_METRICS, `${path}.metric`, issues);
  if (!Array.isArray(value.points)) {
    addIssue(issues, `${path}.points`, 'Liste de points attendue.');
    return;
  }
  value.points.forEach((point, index) => {
    const pointPath = `${path}.points[${index}]`;
    if (!isRecord(point)) {
      addIssue(issues, pointPath, 'Point de graphique attendu.');
      return;
    }
    validateExactKeys(point, CHART_POINT_KEYS, pointPath, issues);
    validateNonNegativeNumber(point.elapsedSeconds, `${pointPath}.elapsedSeconds`, issues);
    validateNonNegativeNumber(point.value, `${pointPath}.value`, issues);
  });
}

function validateCardioDetail(value, allowedFields, path, issues) {
  validateExactKeys(value, CARDIO_DETAIL_KEYS, path, issues);
  const simpleFields = [
    ['sessionType', 'sessionType'], ['terrainType', 'terrain'], ['mainStroke', 'stroke'],
    ['poolLengthMeters', 'poolLength'], ['bikeType', 'bikeType'], ['environment', 'environment'],
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
    if (!hasAllowedField(allowedFields, 'paceSeries')) addIssue(issues, `${path}.paceSeries`, 'paceSeries non autorisé.');
    validatePacePoints(value.paceSeries, `${path}.paceSeries`, issues);
  }
  if (value.intervals !== undefined) {
    if (!hasAllowedField(allowedFields, 'intervals')) addIssue(issues, `${path}.intervals`, 'intervals non autorisé.');
    validateMetricBlocks(value.intervals, `${path}.intervals`, INTERVAL_KEYS, 'label', issues);
  }
  if (value.laps !== undefined) {
    if (!hasAllowedField(allowedFields, 'laps')) addIssue(issues, `${path}.laps`, 'laps non autorisé.');
    validateMetricBlocks(value.laps, `${path}.laps`, LAP_KEYS, 'lapNumber', issues);
  }
  if (value.segments !== undefined) {
    if (!hasAllowedField(allowedFields, 'segments')) addIssue(issues, `${path}.segments`, 'segments non autorisé.');
    validateMetricBlocks(value.segments, `${path}.segments`, SEGMENT_KEYS, 'label', issues);
  }
  if (value.chart !== undefined) {
    if (!hasAllowedField(allowedFields, 'chart')) addIssue(issues, `${path}.chart`, 'chart non autorisé.');
    validateChart(value.chart, `${path}.chart`, issues);
  }
}

function validateStrengthSet(value, allowedFields, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Série de musculation attendue.');
    return;
  }
  validateExactKeys(value, STRENGTH_SET_KEYS, path, issues);
  validatePositiveInteger(value.setNumber, `${path}.setNumber`, issues);
  validateOptionalEnum(value.type, STRENGTH_SET_TYPES, `${path}.type`, issues);
  validateOptionalNonNegativeNumber(value.repetitions, `${path}.repetitions`, issues);
  validateOptionalNonNegativeNumber(value.loadKg, `${path}.loadKg`, issues);
  validateOptionalEnum(value.loadUnit, LOAD_UNITS, `${path}.loadUnit`, issues);
  validateOptionalNonNegativeNumber(value.durationSeconds, `${path}.durationSeconds`, issues);
  validateOptionalNonNegativeNumber(value.distanceMeters, `${path}.distanceMeters`, issues);
  validateOptionalNonNegativeNumber(value.rpe, `${path}.rpe`, issues);
  validateOptionalNonNegativeNumber(value.restSeconds, `${path}.restSeconds`, issues);

  if (value.repetitions !== undefined && !hasAllowedField(allowedFields, 'repetitions')) {
    addIssue(issues, `${path}.repetitions`, 'repetitions non autorisé.');
  }
  if (value.loadKg !== undefined && !hasAllowedField(allowedFields, 'loads')) {
    addIssue(issues, `${path}.loadKg`, 'loads non autorisé.');
  }
  if (value.loadUnit === 'bodyweight' && !hasAllowedField(allowedFields, 'bodyweight')) {
    addIssue(issues, `${path}.loadUnit`, 'bodyweight non autorisé.');
  }
  if (value.rpe !== undefined && !hasAllowedField(allowedFields, 'rpe')) {
    addIssue(issues, `${path}.rpe`, 'rpe non autorisé.');
  }
  if (value.restSeconds !== undefined && !hasAllowedField(allowedFields, 'restTimes')) {
    addIssue(issues, `${path}.restSeconds`, 'restTimes non autorisé.');
  }
}

function validateStrengthExercises(value, allowedFields, path, issues) {
  if (!Array.isArray(value)) {
    addIssue(issues, path, 'Liste d’exercices attendue.');
    return;
  }
  value.forEach((exercise, index) => {
    const exercisePath = `${path}[${index}]`;
    if (!isRecord(exercise)) {
      addIssue(issues, exercisePath, 'Exercice attendu.');
      return;
    }
    validateExactKeys(exercise, STRENGTH_EXERCISE_KEYS, exercisePath, issues);
    validateNonEmptyString(exercise.name, `${exercisePath}.name`, issues);
    if (exercise.muscleGroups !== undefined) {
      if (!hasAllowedField(allowedFields, 'muscleGroups')) addIssue(issues, `${exercisePath}.muscleGroups`, 'muscleGroups non autorisé.');
      validateMuscleGroups(exercise.muscleGroups, `${exercisePath}.muscleGroups`, issues);
    }
    validateOptionalEnum(exercise.trackingMode, TRACKING_MODES, `${exercisePath}.trackingMode`, issues);
    if (exercise.sets !== undefined) {
      if (!hasAllowedField(allowedFields, 'sets')) addIssue(issues, `${exercisePath}.sets`, 'sets non autorisé.');
      if (!Array.isArray(exercise.sets)) addIssue(issues, `${exercisePath}.sets`, 'Liste de séries attendue.');
      else exercise.sets.forEach((set, setIndex) => validateStrengthSet(set, allowedFields, `${exercisePath}.sets[${setIndex}]`, issues));
    }
  });
}

function validateDetail(value, family, allowedFields, path, issues) {
  if (!isRecord(value)) {
    addIssue(issues, path, 'Détail typé attendu.');
    return;
  }
  if (value.family !== family) {
    addIssue(issues, `${path}.family`, 'Famille du détail incohérente.');
    return;
  }
  if (family === 'cardio') validateCardioDetail(value, allowedFields, path, issues);
  else if (family === 'strength') {
    validateExactKeys(value, STRENGTH_DETAIL_KEYS, path, issues);
    if (value.sessionName !== undefined) {
      if (!hasAllowedField(allowedFields, 'sessionName')) addIssue(issues, `${path}.sessionName`, 'sessionName non autorisé.');
      validateNonEmptyString(value.sessionName, `${path}.sessionName`, issues);
    }
    if (value.exercises !== undefined) {
      if (!hasAllowedField(allowedFields, 'exercises')) addIssue(issues, `${path}.exercises`, 'exercises non autorisé.');
      validateStrengthExercises(value.exercises, allowedFields, `${path}.exercises`, issues);
    }
  } else validateExactKeys(value, GENERIC_DETAIL_KEYS, path, issues);
}

function validateIdentity(value, contractVersion, expectedSnapshotId, issues) {
  if (value.contractVersion !== contractVersion) addIssue(issues, '$.contractVersion', 'Version de contrat incompatible.');
  validateNonEmptyString(value.snapshotId, '$.snapshotId', issues);
  validateNonEmptyString(value.ownerUserId, '$.ownerUserId', issues);
  validateNonEmptyString(value.recipientUserId, '$.recipientUserId', issues);
  validateEnum(value.sourceKind, SOURCE_KINDS, '$.sourceKind', issues);
  validateNonEmptyString(value.sourceActivityId, '$.sourceActivityId', issues);
  validateNonEmptyString(value.sourceRevision, '$.sourceRevision', issues);
  validateNonEmptyString(value.createdAt, '$.createdAt', issues);
  validateNonEmptyString(value.updatedAt, '$.updatedAt', issues);
  if (typeof expectedSnapshotId === 'string' && value.snapshotId !== expectedSnapshotId) {
    addIssue(issues, '$.snapshotId', 'Identifiant déterministe incohérent.');
  }
}

export function validateSocialActivitySnapshotPayload(value, options) {
  if (!isRecord(value)) return { valid: false, issues: [{ path: '$', message: 'Snapshot social attendu.' }] };
  const issues = [];
  validateIdentity(value, options.contractVersion, options.expectedSnapshotId, issues);

  if (value.state === 'deleted') {
    validateExactKeys(value, DELETED_TOP_LEVEL_KEYS, '$', issues);
    validateNonEmptyString(value.deletedAt, '$.deletedAt', issues);
    validateEnum(value.deletionReason, DELETION_REASONS, '$.deletionReason', issues);
    return { valid: issues.length === 0, issues };
  }

  if (value.state !== 'active') {
    addIssue(issues, '$.state', 'État de snapshot inconnu.');
    return { valid: false, issues };
  }

  validateExactKeys(value, ACTIVE_TOP_LEVEL_KEYS, '$', issues);
  validateEnum(value.visibility, ACTIVE_VISIBILITIES, '$.visibility', issues);
  validateEnum(value.family, FAMILIES, '$.family', issues);
  validateEnum(value.activityType, ACTIVITY_TYPES, '$.activityType', issues);
  validateOptionalNonEmptyString(value.title, '$.title', issues);
  if (typeof value.occurredOn !== 'string' || !/^\d{4}-\d{2}-\d{2}$/u.test(value.occurredOn)) {
    addIssue(issues, '$.occurredOn', 'Date locale invalide.');
  }
  if (value.occurredTime !== undefined && (typeof value.occurredTime !== 'string' || !/^\d{2}:\d{2}$/u.test(value.occurredTime))) {
    addIssue(issues, '$.occurredTime', 'Heure locale invalide.');
  }
  if (value.occurredAt !== undefined && (typeof value.occurredAt !== 'string' || Number.isNaN(Date.parse(value.occurredAt)))) {
    addIssue(issues, '$.occurredAt', 'Horodatage invalide.');
  }

  if (value.family === 'strength' && (value.activityType !== 'strengthTraining' || value.sourceKind !== 'strengthSession')) {
    addIssue(issues, '$.sourceKind', 'Une séance de musculation doit provenir de strengthSession.');
  }
  if (value.family !== 'strength' && (value.activityType === 'strengthTraining' || value.sourceKind !== 'activity')) {
    addIssue(issues, '$.sourceKind', 'Une activité non musculation doit provenir de activity.');
  }

  if (!FAMILIES.has(value.family)) return { valid: false, issues };
  const allowedFields = validateAllowedFields(value.allowedFields, value.family, '$.allowedFields', issues);
  if (!allowedFields) return { valid: false, issues };
  if (value.visibility === 'summary') {
    validateSummaryFieldScope(allowedFields, '$.allowedFields', issues);
  }

  if (value.title !== undefined && !allowedFields.common.includes('title')) addIssue(issues, '$.title', 'title non autorisé.');
  if ((value.occurredTime !== undefined || value.occurredAt !== undefined) && !allowedFields.common.includes('time')) {
    addIssue(issues, '$.occurredTime', 'time non autorisé.');
  }
  validateSummary(value.summary, allowedFields, '$.summary', issues);

  if (value.visibility === 'summary' && value.detail !== undefined) {
    addIssue(issues, '$.detail', 'Un résumé ne doit pas contenir de détail.');
  } else if (value.detail !== undefined) {
    validateDetail(value.detail, value.family, allowedFields, '$.detail', issues);
  }

  return { valid: issues.length === 0, issues };
}
