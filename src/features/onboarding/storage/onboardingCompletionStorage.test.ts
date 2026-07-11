import {
  PROFILE_ONBOARDING_COMPLETION_VERSION,
  profileOnboardingCompletionStorageKey,
  readProfileOnboardingCompletion,
  saveProfileOnboardingCompletion,
} from '@/features/onboarding/storage/onboardingCompletionStorage';

describe('onboardingCompletionStorage', () => {
  beforeEach(() => window.localStorage.clear());

  it('mémorise la version terminée dans l’espace actif', () => {
    expect(saveProfileOnboardingCompletion(
      'guest',
      window.localStorage,
      '2026-07-10T08:00:00.000Z',
    )).toBe(true);

    expect(readProfileOnboardingCompletion('guest', window.localStorage)).toEqual({
      version: PROFILE_ONBOARDING_COMPLETION_VERSION,
      completedAt: '2026-07-10T08:00:00.000Z',
    });
  });

  it('cloisonne le marqueur entre invité et compte', () => {
    const accountSpaceId = 'account:acct-test' as const;
    expect(profileOnboardingCompletionStorageKey('guest')).not.toBe(
      profileOnboardingCompletionStorageKey(accountSpaceId),
    );

    saveProfileOnboardingCompletion('guest', window.localStorage, '2026-07-10T08:00:00.000Z');
    expect(readProfileOnboardingCompletion(accountSpaceId, window.localStorage)).toBeUndefined();
  });

  it('ignore un marqueur illisible sans bloquer les profils existants', () => {
    window.localStorage.setItem(profileOnboardingCompletionStorageKey('guest'), '{invalid');
    expect(readProfileOnboardingCompletion('guest', window.localStorage)).toBeUndefined();
  });
});
