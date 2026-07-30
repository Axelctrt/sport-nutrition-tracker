import type { DataSpaceId } from '@/domain/data-spaces/dataSpace';
import { activeDataSpace } from '@/infrastructure/database/database';

export const PROFILE_ONBOARDING_COMPLETION_VERSION = 1 as const;
export const PROFILE_ONBOARDING_COMPLETION_STORAGE_KEY = 'sportpilot:onboarding:completion:v1';
export const PROFILE_ONBOARDING_COMPLETED_EVENT = 'sportpilot:onboarding-completed';

export interface ProfileOnboardingCompletion {
  version: typeof PROFILE_ONBOARDING_COMPLETION_VERSION;
  completedAt: string;
}

function resolveStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage;
}

export function profileOnboardingCompletionStorageKey(
  dataSpaceId: DataSpaceId = activeDataSpace.id,
): string {
  return dataSpaceId === 'guest'
    ? PROFILE_ONBOARDING_COMPLETION_STORAGE_KEY
    : `${PROFILE_ONBOARDING_COMPLETION_STORAGE_KEY}:${dataSpaceId}`;
}

export function saveProfileOnboardingCompletion(
  dataSpaceId: DataSpaceId = activeDataSpace.id,
  storage: Storage | undefined = resolveStorage(),
  completedAt = new Date().toISOString(),
): boolean {
  if (!storage) return false;

  const completion: ProfileOnboardingCompletion = {
    version: PROFILE_ONBOARDING_COMPLETION_VERSION,
    completedAt,
  };

  try {
    storage.setItem(
      profileOnboardingCompletionStorageKey(dataSpaceId),
      JSON.stringify(completion),
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PROFILE_ONBOARDING_COMPLETED_EVENT, {
        detail: completion,
      }));
    }
    return true;
  } catch {
    return false;
  }
}

export function readProfileOnboardingCompletion(
  dataSpaceId: DataSpaceId = activeDataSpace.id,
  storage: Storage | undefined = resolveStorage(),
): ProfileOnboardingCompletion | undefined {
  if (!storage) return undefined;

  try {
    const raw = storage.getItem(profileOnboardingCompletionStorageKey(dataSpaceId));
    if (!raw) return undefined;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return undefined;

    const candidate = parsed as Partial<ProfileOnboardingCompletion>;
    if (
      candidate.version !== PROFILE_ONBOARDING_COMPLETION_VERSION
      || typeof candidate.completedAt !== 'string'
      || Number.isNaN(Date.parse(candidate.completedAt))
    ) {
      return undefined;
    }

    return {
      version: PROFILE_ONBOARDING_COMPLETION_VERSION,
      completedAt: candidate.completedAt,
    };
  } catch {
    return undefined;
  }
}
