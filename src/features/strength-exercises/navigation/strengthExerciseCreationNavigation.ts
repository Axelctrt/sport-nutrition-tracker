import {
  editWorkoutTemplatePath,
  routePaths,
  workoutSessionPath,
} from '@/app/routePaths';

export type StrengthExerciseCreationContext =
  | {
      readonly returnTo: 'library';
      readonly query: string;
    }
  | {
      readonly returnTo: 'session';
      readonly query: string;
      readonly sessionId: string;
      readonly plannedSets: number;
    }
  | {
      readonly returnTo: 'template';
      readonly query: string;
      readonly templateId?: string;
      readonly insertionIndex: number;
      readonly draftKey: string;
    };

export interface StrengthExerciseCreatedNavigationState {
  readonly strengthExerciseCreationContext?: StrengthExerciseCreationContext;
  readonly strengthExerciseCreated?: {
    readonly exerciseId: string;
    readonly context: StrengthExerciseCreationContext;
  };
}

const ID_PATTERN = /^[a-zA-Z0-9#:_-]{1,160}$/;
const DRAFT_KEY_PATTERN = /^strength-template-draft:[a-zA-Z0-9-]{1,80}$/;

function usefulQuery(value: string | null): string | undefined {
  const normalized = value?.trim().replace(/\s+/g, ' ');
  if (!normalized || normalized.length < 2) return undefined;
  return normalized.slice(0, 120);
}

function safeId(value: string | null): string | undefined {
  return value && ID_PATTERN.test(value) ? value : undefined;
}

export function newStrengthExercisePath(
  context?: StrengthExerciseCreationContext,
): string {
  if (!context) return routePaths.newStrengthExercise;
  const params = new URLSearchParams({
    returnTo: context.returnTo,
    query: context.query.trim().slice(0, 120),
  });
  if (context.returnTo === 'session') {
    params.set('sessionId', context.sessionId);
    params.set('plannedSets', String(context.plannedSets));
  }
  if (context.returnTo === 'template') {
    if (context.templateId) params.set('templateId', context.templateId);
    params.set('insertionIndex', String(context.insertionIndex));
    params.set('draftKey', context.draftKey);
  }
  return `${routePaths.newStrengthExercise}?${params.toString()}`;
}

export function readStrengthExerciseCreationContext(
  params: URLSearchParams,
): StrengthExerciseCreationContext | undefined {
  const returnTo = params.get('returnTo');
  const query = usefulQuery(params.get('query'));
  if (!query) return undefined;
  if (returnTo === 'library') return { returnTo, query };
  if (returnTo === 'session') {
    const sessionId = safeId(params.get('sessionId'));
    const plannedSets = Number.parseInt(params.get('plannedSets') ?? '', 10);
    if (!sessionId || !Number.isInteger(plannedSets)) return undefined;
    return {
      returnTo,
      query,
      sessionId,
      plannedSets: Math.max(1, Math.min(12, plannedSets)),
    };
  }
  if (returnTo === 'template') {
    const templateIdValue = params.get('templateId');
    const templateId = templateIdValue ? safeId(templateIdValue) : undefined;
    const insertionIndex = Number.parseInt(
      params.get('insertionIndex') ?? '',
      10,
    );
    const draftKey = params.get('draftKey');
    if (
      (templateIdValue && !templateId)
      || !Number.isInteger(insertionIndex)
      || !draftKey
      || !DRAFT_KEY_PATTERN.test(draftKey)
    ) return undefined;
    return {
      returnTo,
      query,
      ...(templateId ? { templateId } : {}),
      insertionIndex: Math.max(0, Math.min(100, insertionIndex)),
      draftKey,
    };
  }
  return undefined;
}

export function strengthExerciseCreationReturnPath(
  context: StrengthExerciseCreationContext,
): string {
  switch (context.returnTo) {
    case 'library':
      return routePaths.strengthExercises;
    case 'session':
      return workoutSessionPath(context.sessionId);
    case 'template':
      return context.templateId
        ? editWorkoutTemplatePath(context.templateId)
        : routePaths.newWorkoutTemplate;
  }
}

export function strengthExerciseCreatedState(
  exerciseId: string,
  context: StrengthExerciseCreationContext,
): StrengthExerciseCreatedNavigationState {
  return {
    strengthExerciseCreationContext: context,
    strengthExerciseCreated: { exerciseId, context },
  };
}

export function strengthExerciseCancelledState(
  context: StrengthExerciseCreationContext,
): StrengthExerciseCreatedNavigationState {
  return { strengthExerciseCreationContext: context };
}
