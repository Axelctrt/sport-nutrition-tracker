import {
  clearOnboardingDraft,
  loadOnboardingDraft,
  ONBOARDING_DRAFT_STORAGE_KEY,
  saveOnboardingDraft,
} from '@/features/onboarding/storage/onboardingDraftStorage';

const normalize = (value: unknown) => value as { name: string };

describe('onboardingDraftStorage', () => {
  it('enregistre, recharge puis supprime un brouillon versionné', () => {
    expect(saveOnboardingDraft('profile', { name: 'Maya' })).toBe(true);

    const result = loadOnboardingDraft(normalize);
    expect(result).toMatchObject({
      status: 'restored',
      draft: {
        version: 1,
        stepId: 'profile',
        values: { name: 'Maya' },
      },
    });

    expect(clearOnboardingDraft()).toBe(true);
    expect(loadOnboardingDraft(normalize)).toEqual({ status: 'empty' });
  });

  it('écarte un JSON corrompu ou une version incompatible', () => {
    window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, '{invalide');
    expect(loadOnboardingDraft(normalize)).toEqual({ status: 'discarded' });
    expect(window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY)).toBeNull();

    window.localStorage.setItem(
      ONBOARDING_DRAFT_STORAGE_KEY,
      JSON.stringify({ version: 99, stepId: 'profile', values: {}, updatedAt: new Date().toISOString() }),
    );
    expect(loadOnboardingDraft(normalize)).toEqual({ status: 'discarded' });
  });

  it('signale un stockage indisponible sans bloquer le parcours', () => {
    const unavailableStorage = {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
      removeItem: () => { throw new Error('blocked'); },
    } as unknown as Storage;

    expect(saveOnboardingDraft('profile', {}, unavailableStorage)).toBe(false);
    expect(clearOnboardingDraft(unavailableStorage)).toBe(false);
    expect(loadOnboardingDraft(normalize, unavailableStorage)).toEqual({ status: 'unavailable' });
  });
});
