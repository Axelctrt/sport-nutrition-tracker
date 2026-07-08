import type { ActivityType } from '@/domain/models/activity';
import type { FriendActivityShareScope } from '@/domain/friends/friendship';

export const SOCIAL_ACTIVITY_SHARING_CONTRACT_VERSION = '0.29.0-a1' as const;

export type SocialActivityVisibility = 'private' | 'summary' | 'detailed' | 'custom';
export type SocialActivityOverrideMode = 'inherit' | SocialActivityVisibility;
export type SocialActivityFamily = 'cardio' | 'strength' | 'generic';

export const SOCIAL_ACTIVITY_COMMON_FIELDS = [
  'activityType',
  'title',
  'date',
  'time',
  'duration',
  'intensity',
  'calories',
] as const;

export const SOCIAL_ACTIVITY_CARDIO_FIELDS = [
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
] as const;

export const SOCIAL_ACTIVITY_STRENGTH_FIELDS = [
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
] as const;

export const SOCIAL_ACTIVITY_FORBIDDEN_SOURCE_FIELDS = [
  'notes',
  'privateNotes',
  'manualCaloriesKcal',
  'calculation',
  'weightKg',
  'coefficientUsed',
  'metUsed',
  'rawActivity',
  'sourceActivity',
  'syncMetadata',
  'deletedPayload',
] as const;

export type SocialActivityCommonField = (typeof SOCIAL_ACTIVITY_COMMON_FIELDS)[number];
export type SocialActivityCardioField = (typeof SOCIAL_ACTIVITY_CARDIO_FIELDS)[number];
export type SocialActivityStrengthField = (typeof SOCIAL_ACTIVITY_STRENGTH_FIELDS)[number];
export type SocialActivityForbiddenSourceField = (typeof SOCIAL_ACTIVITY_FORBIDDEN_SOURCE_FIELDS)[number];
export type SocialActivityShareField =
  | SocialActivityCommonField
  | SocialActivityCardioField
  | SocialActivityStrengthField;

export interface SocialActivityFieldSelection {
  readonly common: readonly SocialActivityCommonField[];
  readonly cardio: readonly SocialActivityCardioField[];
  readonly strength: readonly SocialActivityStrengthField[];
}

export interface SocialActivityGlobalSharingPolicy {
  readonly visibility: SocialActivityVisibility;
  readonly fields: SocialActivityFieldSelection;
}

export type SocialActivitySharingOverride =
  | { readonly mode: Exclude<SocialActivityOverrideMode, 'custom'> }
  | { readonly mode: 'custom'; readonly fields: SocialActivityFieldSelection };

export interface ResolvedSocialActivitySharingPolicy {
  readonly contractVersion: typeof SOCIAL_ACTIVITY_SHARING_CONTRACT_VERSION;
  readonly source: 'global' | 'activity';
  readonly visibility: SocialActivityVisibility;
  readonly publishSnapshot: boolean;
  readonly fields: SocialActivityFieldSelection;
}

export interface RecipientScopedSocialActivitySharingPolicy
  extends ResolvedSocialActivitySharingPolicy {
  readonly recipientScope: FriendActivityShareScope;
  readonly permissionLimited: boolean;
}

export interface SocialActivitySharingPolicyValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface SocialActivitySharingPolicyValidationResult {
  readonly valid: boolean;
  readonly issues: readonly SocialActivitySharingPolicyValidationIssue[];
}

export type SocialActivitySnapshotLifecycleAction = 'none' | 'upsert' | 'delete';

export const EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION: SocialActivityFieldSelection = {
  common: [],
  cardio: [],
  strength: [],
};

export const SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION: SocialActivityFieldSelection = {
  common: ['activityType', 'title', 'date', 'duration'],
  cardio: ['distance'],
  strength: ['sessionName', 'muscleGroups', 'exerciseCount'],
};

export const ALL_SOCIAL_ACTIVITY_FIELD_SELECTION: SocialActivityFieldSelection = {
  common: [...SOCIAL_ACTIVITY_COMMON_FIELDS],
  cardio: [...SOCIAL_ACTIVITY_CARDIO_FIELDS],
  strength: [...SOCIAL_ACTIVITY_STRENGTH_FIELDS],
};

export const DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION: SocialActivityFieldSelection = {
  common: ['activityType', 'title', 'date', 'duration'],
  cardio: ['distance', 'pace', 'speed', 'elevation'],
  strength: [
    'sessionName',
    'muscleGroups',
    'exerciseCount',
    'exercises',
    'sets',
    'repetitions',
    'loads',
    'volume',
  ],
};

export const DEFAULT_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY: SocialActivityGlobalSharingPolicy = {
  visibility: 'summary',
  fields: DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
};


export const PRIVATE_SOCIAL_ACTIVITY_GLOBAL_SHARING_POLICY: SocialActivityGlobalSharingPolicy = {
  visibility: 'private',
  fields: DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
};

export const SOCIAL_ACTIVITY_VISIBILITY_LABELS: Record<SocialActivityVisibility, string> = {
  private: 'Privé',
  summary: 'Résumé',
  detailed: 'Détaillé',
  custom: 'Personnalisé',
};

export const SOCIAL_ACTIVITY_OVERRIDE_MODE_LABELS: Record<SocialActivityOverrideMode, string> = {
  inherit: 'Utiliser les réglages globaux',
  private: 'Privée',
  summary: 'Résumé',
  detailed: 'Détaillée',
  custom: 'Personnalisée',
};

export function cloneSocialActivityFieldSelection(
  selection: SocialActivityFieldSelection,
): SocialActivityFieldSelection {
  return {
    common: [...selection.common],
    cardio: [...selection.cardio],
    strength: [...selection.strength],
  };
}

export function createSocialActivityGlobalSharingPolicy(
  visibility: SocialActivityVisibility,
  fields: SocialActivityFieldSelection = DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
): SocialActivityGlobalSharingPolicy {
  return {
    visibility,
    fields: cloneSocialActivityFieldSelection(fields),
  };
}

export function createSocialActivitySharingOverride(
  mode: SocialActivityOverrideMode,
  fields: SocialActivityFieldSelection = DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
): SocialActivitySharingOverride {
  return mode === 'custom'
    ? { mode, fields: cloneSocialActivityFieldSelection(fields) }
    : { mode };
}

export function legacyFriendActivitySharingForPolicy(
  policy: SocialActivityGlobalSharingPolicy,
): 'disabled' | 'summary-only' | 'detailed' {
  if (policy.visibility === 'private') return 'disabled';
  if (policy.visibility === 'summary') return 'summary-only';
  return 'detailed';
}

export function socialActivityGlobalPolicyFromLegacyPrivacy(input: {
  readonly profileVisibility: 'private' | 'friends' | 'public';
  readonly activitySharing: 'disabled' | 'summary-only' | 'detailed';
}): SocialActivityGlobalSharingPolicy {
  if (input.profileVisibility === 'private' || input.activitySharing === 'disabled') {
    return createSocialActivityGlobalSharingPolicy('private');
  }

  return createSocialActivityGlobalSharingPolicy(
    input.activitySharing === 'summary-only' ? 'summary' : 'detailed',
  );
}

const commonFieldSet = new Set<string>(SOCIAL_ACTIVITY_COMMON_FIELDS);
const cardioFieldSet = new Set<string>(SOCIAL_ACTIVITY_CARDIO_FIELDS);
const strengthFieldSet = new Set<string>(SOCIAL_ACTIVITY_STRENGTH_FIELDS);
const visibilitySet = new Set<string>(['private', 'summary', 'detailed', 'custom']);
const overrideModeSet = new Set<string>(['inherit', 'private', 'summary', 'detailed', 'custom']);
const forbiddenSourceFieldSet = new Set<string>(SOCIAL_ACTIVITY_FORBIDDEN_SOURCE_FIELDS);

function uniqueFields<T extends string>(fields: readonly T[]): readonly T[] {
  return [...new Set(fields)];
}

function intersectFields<T extends string>(
  fields: readonly T[],
  allowedFields: readonly T[],
): readonly T[] {
  const allowed = new Set<string>(allowedFields);
  return fields.filter((field) => allowed.has(field));
}

export function intersectSocialActivityFieldSelections(
  selection: SocialActivityFieldSelection,
  allowedFields: SocialActivityFieldSelection,
): SocialActivityFieldSelection {
  const normalizedSelection = normalizeSocialActivityFieldSelection(selection);
  const normalizedAllowedFields = normalizeSocialActivityFieldSelection(allowedFields);

  return normalizeSocialActivityFieldSelection({
    common: intersectFields(normalizedSelection.common, normalizedAllowedFields.common),
    cardio: intersectFields(normalizedSelection.cardio, normalizedAllowedFields.cardio),
    strength: intersectFields(normalizedSelection.strength, normalizedAllowedFields.strength),
  });
}

function addField<T extends string>(fields: readonly T[], field: T): readonly T[] {
  return fields.includes(field) ? fields : [...fields, field];
}

function normalizeCommonDependencies(
  fields: readonly SocialActivityCommonField[],
): readonly SocialActivityCommonField[] {
  let normalized = uniqueFields(fields);
  normalized = addField(normalized, 'activityType');
  normalized = addField(normalized, 'date');
  return normalized;
}

function normalizeCardioDependencies(
  fields: readonly SocialActivityCardioField[],
): readonly SocialActivityCardioField[] {
  let normalized = uniqueFields(fields);

  if (normalized.includes('chart')) {
    normalized = addField(normalized, 'paceSeries');
  }

  if (normalized.includes('paceSeries')) {
    normalized = addField(normalized, 'pace');
  }

  return normalized;
}

function normalizeStrengthDependencies(
  fields: readonly SocialActivityStrengthField[],
): readonly SocialActivityStrengthField[] {
  let normalized = uniqueFields(fields);

  if (
    normalized.includes('sets')
    || normalized.includes('repetitions')
    || normalized.includes('loads')
    || normalized.includes('bodyweight')
    || normalized.includes('restTimes')
    || normalized.includes('rpe')
  ) {
    normalized = addField(normalized, 'exercises');
  }

  if (
    normalized.includes('repetitions')
    || normalized.includes('loads')
    || normalized.includes('bodyweight')
    || normalized.includes('rpe')
  ) {
    normalized = addField(normalized, 'sets');
  }

  return normalized;
}

export function normalizeSocialActivityFieldSelection(
  selection: SocialActivityFieldSelection,
): SocialActivityFieldSelection {
  return {
    common: normalizeCommonDependencies(selection.common),
    cardio: normalizeCardioDependencies(selection.cardio),
    strength: normalizeStrengthDependencies(selection.strength),
  };
}

export function socialActivityFamilyForType(activityType: ActivityType): SocialActivityFamily {
  return activityType === 'strengthTraining' ? 'strength' : 'cardio';
}

export function selectSocialActivityFieldsForFamily(
  selection: SocialActivityFieldSelection,
  family: SocialActivityFamily,
): SocialActivityFieldSelection {
  const normalized = normalizeSocialActivityFieldSelection(selection);

  if (family === 'cardio') {
    return {
      common: normalized.common,
      cardio: normalized.cardio,
      strength: [],
    };
  }

  if (family === 'strength') {
    return {
      common: normalized.common,
      cardio: [],
      strength: normalized.strength,
    };
  }

  return {
    common: normalized.common,
    cardio: [],
    strength: [],
  };
}

function fieldsForVisibility(
  visibility: SocialActivityVisibility,
  configuredFields: SocialActivityFieldSelection,
): SocialActivityFieldSelection {
  if (visibility === 'private') return EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION;
  if (visibility === 'summary') return SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION;

  const normalized = normalizeSocialActivityFieldSelection(configuredFields);
  const requiredCommon = addField(addField(normalized.common, 'activityType'), 'date');

  return {
    ...normalized,
    common: requiredCommon,
  };
}

export function resolveSocialActivitySharingPolicy(
  globalPolicy: SocialActivityGlobalSharingPolicy,
  override: SocialActivitySharingOverride = { mode: 'inherit' },
): ResolvedSocialActivitySharingPolicy {
  const inherited = override.mode === 'inherit';
  const visibility = inherited ? globalPolicy.visibility : override.mode;
  const configuredFields = override.mode === 'custom'
    ? override.fields ?? EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION
    : globalPolicy.fields;
  const fields = fieldsForVisibility(visibility, configuredFields);

  return {
    contractVersion: SOCIAL_ACTIVITY_SHARING_CONTRACT_VERSION,
    source: inherited ? 'global' : 'activity',
    visibility,
    publishSnapshot: visibility !== 'private',
    fields,
  };
}

function limitSelectionToSummary(
  selection: SocialActivityFieldSelection,
): SocialActivityFieldSelection {
  return {
    common: intersectFields(selection.common, SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION.common),
    cardio: intersectFields(selection.cardio, SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION.cardio),
    strength: intersectFields(selection.strength, SUMMARY_SOCIAL_ACTIVITY_FIELD_SELECTION.strength),
  };
}

export function applyFriendScopeToSocialActivitySharingPolicy(
  policy: ResolvedSocialActivitySharingPolicy,
  recipientScope: FriendActivityShareScope,
  recipientFields?: SocialActivityFieldSelection,
): RecipientScopedSocialActivitySharingPolicy {
  if (!policy.publishSnapshot || recipientScope === 'none') {
    return {
      ...policy,
      visibility: 'private',
      publishSnapshot: false,
      fields: EMPTY_SOCIAL_ACTIVITY_FIELD_SELECTION,
      recipientScope,
      permissionLimited: policy.publishSnapshot,
    };
  }

  const permissionScopedFields = recipientFields
    ? intersectSocialActivityFieldSelections(policy.fields, recipientFields)
    : policy.fields;
  const fieldSelectionLimited = JSON.stringify(permissionScopedFields) !== JSON.stringify(policy.fields);

  if (recipientScope === 'summary') {
    const summaryFields = limitSelectionToSummary(permissionScopedFields);
    return {
      ...policy,
      visibility: 'summary',
      fields: summaryFields,
      recipientScope,
      permissionLimited: policy.visibility !== 'summary' || fieldSelectionLimited,
    };
  }

  return {
    ...policy,
    fields: permissionScopedFields,
    recipientScope,
    permissionLimited: fieldSelectionLimited,
  };
}

export function decideSocialActivitySnapshotLifecycleAction(input: {
  readonly hadPublishedSnapshot: boolean;
  readonly sourceDeleted: boolean;
  readonly nextPolicy: ResolvedSocialActivitySharingPolicy;
}): SocialActivitySnapshotLifecycleAction {
  if (input.sourceDeleted || !input.nextPolicy.publishSnapshot) {
    return input.hadPublishedSnapshot ? 'delete' : 'none';
  }

  return 'upsert';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validateFieldArray(
  value: unknown,
  path: string,
  allowedFields: ReadonlySet<string>,
): readonly SocialActivitySharingPolicyValidationIssue[] {
  if (!Array.isArray(value)) {
    return [{ path, message: 'Une liste de champs est attendue.' }];
  }

  const issues: SocialActivitySharingPolicyValidationIssue[] = [];
  const seen = new Set<string>();

  value.forEach((field, index) => {
    if (typeof field !== 'string' || !allowedFields.has(field)) {
      issues.push({ path: `${path}[${index}]`, message: 'Champ de partage inconnu.' });
      return;
    }

    if (seen.has(field)) {
      issues.push({ path: `${path}[${index}]`, message: 'Champ de partage dupliqué.' });
      return;
    }

    seen.add(field);
  });

  return issues;
}

function validateFieldSelection(
  value: unknown,
  path: string,
): readonly SocialActivitySharingPolicyValidationIssue[] {
  if (!isRecord(value)) {
    return [{ path, message: 'Une sélection de champs est attendue.' }];
  }

  return [
    ...validateFieldArray(value.common, `${path}.common`, commonFieldSet),
    ...validateFieldArray(value.cardio, `${path}.cardio`, cardioFieldSet),
    ...validateFieldArray(value.strength, `${path}.strength`, strengthFieldSet),
  ];
}

export function validateSocialActivityGlobalSharingPolicy(
  value: unknown,
): SocialActivitySharingPolicyValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ path: '$', message: 'Une politique globale de partage est attendue.' }],
    };
  }

  const issues: SocialActivitySharingPolicyValidationIssue[] = [];
  if (typeof value.visibility !== 'string' || !visibilitySet.has(value.visibility)) {
    issues.push({ path: '$.visibility', message: 'Niveau de partage global invalide.' });
  }
  issues.push(...validateFieldSelection(value.fields, '$.fields'));

  return { valid: issues.length === 0, issues };
}

export function validateSocialActivitySharingOverride(
  value: unknown,
): SocialActivitySharingPolicyValidationResult {
  if (!isRecord(value)) {
    return {
      valid: false,
      issues: [{ path: '$', message: 'Une surcharge de partage est attendue.' }],
    };
  }

  const issues: SocialActivitySharingPolicyValidationIssue[] = [];
  if (typeof value.mode !== 'string' || !overrideModeSet.has(value.mode)) {
    issues.push({ path: '$.mode', message: 'Mode de surcharge invalide.' });
  }

  if (value.mode === 'custom') {
    issues.push(...validateFieldSelection(value.fields, '$.fields'));
  } else if (value.fields !== undefined) {
    issues.push({
      path: '$.fields',
      message: 'Une sélection spécifique est autorisée uniquement en mode personnalisé.',
    });
  }

  return { valid: issues.length === 0, issues };
}

export function findForbiddenSocialActivitySourceFields(value: unknown): readonly string[] {
  const matches = new Set<string>();

  const visit = (candidate: unknown) => {
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }

    if (!isRecord(candidate)) return;

    Object.entries(candidate).forEach(([key, nestedValue]) => {
      if (forbiddenSourceFieldSet.has(key)) matches.add(key);
      visit(nestedValue);
    });
  };

  visit(value);
  return [...matches].sort();
}

export function assertNoForbiddenSocialActivitySourceFields(value: unknown): void {
  const forbiddenFields = findForbiddenSocialActivitySourceFields(value);
  if (forbiddenFields.length > 0) {
    throw new Error(
      `Projection sociale invalide : champs source interdits détectés (${forbiddenFields.join(', ')}).`,
    );
  }
}
