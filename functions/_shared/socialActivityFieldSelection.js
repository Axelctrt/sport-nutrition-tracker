const COMMON_FIELDS = Object.freeze([
  'activityType',
  'title',
  'date',
  'time',
  'duration',
  'intensity',
  'calories',
]);

const CARDIO_FIELDS = Object.freeze([
  'distance',
  'sessionType',
  'terrain',
  'stroke',
  'poolLength',
  'bikeType',
  'environment',
  'pace',
  'speed',
  'paceSeries',
  'elevation',
  'heartRate',
  'cadence',
  'intervals',
  'laps',
  'segments',
  'chart',
]);

const STRENGTH_FIELDS = Object.freeze([
  'sessionName',
  'muscleGroups',
  'exerciseCount',
  'exercises',
  'sets',
  'repetitions',
  'loads',
  'bodyweight',
  'restTimes',
  'rpe',
  'volume',
]);

const commonFieldSet = new Set(COMMON_FIELDS);
const cardioFieldSet = new Set(CARDIO_FIELDS);
const strengthFieldSet = new Set(STRENGTH_FIELDS);

export const LEGACY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION = Object.freeze({
  common: Object.freeze([...COMMON_FIELDS]),
  cardio: Object.freeze([...CARDIO_FIELDS]),
  strength: Object.freeze([...STRENGTH_FIELDS]),
});

export const DEFAULT_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION = Object.freeze({
  common: Object.freeze(['activityType', 'title', 'date', 'duration']),
  cardio: Object.freeze(['distance', 'pace', 'speed', 'elevation']),
  strength: Object.freeze([
    'sessionName',
    'muscleGroups',
    'exerciseCount',
    'exercises',
    'sets',
    'repetitions',
    'loads',
    'volume',
  ]),
});

export const SUMMARY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION = Object.freeze({
  common: Object.freeze(['activityType', 'title', 'date', 'duration']),
  cardio: Object.freeze(['distance']),
  strength: Object.freeze(['sessionName', 'muscleGroups', 'exerciseCount']),
});

function cloneSelection(selection) {
  return {
    common: [...selection.common],
    cardio: [...selection.cardio],
    strength: [...selection.strength],
  };
}

function uniqueKnownFields(value, allowedFields) {
  if (!Array.isArray(value)) return undefined;
  const fields = [];
  const seen = new Set();
  for (const field of value) {
    if (typeof field !== 'string' || !allowedFields.has(field)) return undefined;
    if (!seen.has(field)) {
      seen.add(field);
      fields.push(field);
    }
  }
  return fields;
}

function addField(fields, field) {
  if (!fields.includes(field)) fields.push(field);
}

function normalizeDependencies(selection) {
  const normalized = cloneSelection(selection);
  addField(normalized.common, 'activityType');
  addField(normalized.common, 'date');

  if (normalized.cardio.includes('chart')) addField(normalized.cardio, 'paceSeries');
  if (normalized.cardio.includes('paceSeries')) addField(normalized.cardio, 'pace');

  if (
    normalized.strength.includes('sets')
    || normalized.strength.includes('repetitions')
    || normalized.strength.includes('loads')
    || normalized.strength.includes('bodyweight')
    || normalized.strength.includes('restTimes')
    || normalized.strength.includes('rpe')
  ) {
    addField(normalized.strength, 'exercises');
  }

  if (
    normalized.strength.includes('repetitions')
    || normalized.strength.includes('loads')
    || normalized.strength.includes('bodyweight')
    || normalized.strength.includes('rpe')
  ) {
    addField(normalized.strength, 'sets');
  }

  return normalized;
}

export function sanitizeSocialActivityPermissionFieldSelection(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const common = uniqueKnownFields(value.common, commonFieldSet);
  const cardio = uniqueKnownFields(value.cardio, cardioFieldSet);
  const strength = uniqueKnownFields(value.strength, strengthFieldSet);
  if (!common || !cardio || !strength) return undefined;
  return normalizeDependencies({ common, cardio, strength });
}

export function socialActivityPermissionFieldSelectionFromStored(value) {
  if (value === null || value === undefined || value === '') {
    return cloneSelection(LEGACY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION);
  }

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return sanitizeSocialActivityPermissionFieldSelection(parsed)
      ?? cloneSelection(SUMMARY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION);
  } catch {
    return cloneSelection(SUMMARY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION);
  }
}

export function serializeSocialActivityPermissionFieldSelection(selection) {
  const normalized = sanitizeSocialActivityPermissionFieldSelection(selection);
  if (!normalized) return undefined;
  return JSON.stringify(normalized);
}

export function intersectSocialActivityFieldSelections(left, right) {
  const normalizedLeft = sanitizeSocialActivityPermissionFieldSelection(left);
  const normalizedRight = sanitizeSocialActivityPermissionFieldSelection(right);
  if (!normalizedLeft || !normalizedRight) {
    return cloneSelection(SUMMARY_SOCIAL_ACTIVITY_PERMISSION_FIELD_SELECTION);
  }

  const common = new Set(normalizedRight.common);
  const cardio = new Set(normalizedRight.cardio);
  const strength = new Set(normalizedRight.strength);
  return normalizeDependencies({
    common: normalizedLeft.common.filter((field) => common.has(field)),
    cardio: normalizedLeft.cardio.filter((field) => cardio.has(field)),
    strength: normalizedLeft.strength.filter((field) => strength.has(field)),
  });
}

export function socialActivityFieldSelectionIsSubset(candidate, allowed) {
  const normalizedCandidate = sanitizeSocialActivityPermissionFieldSelection(candidate);
  const normalizedAllowed = sanitizeSocialActivityPermissionFieldSelection(allowed);
  if (!normalizedCandidate || !normalizedAllowed) return false;

  return normalizedCandidate.common.every((field) => normalizedAllowed.common.includes(field))
    && normalizedCandidate.cardio.every((field) => normalizedAllowed.cardio.includes(field))
    && normalizedCandidate.strength.every((field) => normalizedAllowed.strength.includes(field));
}

export const socialActivityFieldSelectionInternals = {
  COMMON_FIELDS,
  CARDIO_FIELDS,
  STRENGTH_FIELDS,
  normalizeDependencies,
};
