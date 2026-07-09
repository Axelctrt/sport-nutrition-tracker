export const ONBOARDING_DRAFT_STORAGE_KEY = 'sportpilot:onboarding:draft:v1';
export const ONBOARDING_DRAFT_VERSION = 1;

export interface OnboardingDraft<TValues> {
  version: typeof ONBOARDING_DRAFT_VERSION;
  stepId: string;
  values: TValues;
  updatedAt: string;
}

export type OnboardingDraftLoadResult<TValues> =
  | { status: 'empty' }
  | { status: 'restored'; draft: OnboardingDraft<TValues> }
  | { status: 'discarded' }
  | { status: 'unavailable' };

function getDefaultStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidDraftEnvelope(value: unknown): value is OnboardingDraft<unknown> {
  if (!isRecord(value)) return false;

  return value.version === ONBOARDING_DRAFT_VERSION
    && typeof value.stepId === 'string'
    && value.stepId.trim() !== ''
    && isRecord(value.values)
    && typeof value.updatedAt === 'string'
    && !Number.isNaN(Date.parse(value.updatedAt));
}

export function loadOnboardingDraft<TValues>(
  normalizeValues: (value: unknown) => TValues,
  storage = getDefaultStorage(),
): OnboardingDraftLoadResult<TValues> {
  if (!storage) return { status: 'unavailable' };

  try {
    const raw = storage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
    if (!raw) return { status: 'empty' };

    const parsed: unknown = JSON.parse(raw);
    if (!isValidDraftEnvelope(parsed)) {
      storage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
      return { status: 'discarded' };
    }

    return {
      status: 'restored',
      draft: {
        version: ONBOARDING_DRAFT_VERSION,
        stepId: parsed.stepId,
        values: normalizeValues(parsed.values),
        updatedAt: parsed.updatedAt,
      },
    };
  } catch {
    try {
      storage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
    } catch {
      return { status: 'unavailable' };
    }
    return { status: 'discarded' };
  }
}

export function saveOnboardingDraft<TValues>(
  stepId: string,
  values: TValues,
  storage = getDefaultStorage(),
): boolean {
  if (!storage) return false;

  const draft: OnboardingDraft<TValues> = {
    version: ONBOARDING_DRAFT_VERSION,
    stepId,
    values,
    updatedAt: new Date().toISOString(),
  };

  try {
    storage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function clearOnboardingDraft(storage = getDefaultStorage()): boolean {
  if (!storage) return false;

  try {
    storage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
