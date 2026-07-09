import {
  createOnboardingFlowState,
  getOnboardingProgress,
  goToOnboardingStep,
  moveOnboardingFlow,
  setOnboardingSubmissionStatus,
} from '@/features/onboarding/flow/onboardingFlow';

const steps = [
  { id: 'storage' },
  { id: 'profile' },
  { id: 'summary' },
] as const;

describe('onboardingFlow', () => {
  it('démarre sur la première étape ou reprend une étape connue', () => {
    expect(createOnboardingFlowState(steps).currentStepId).toBe('storage');
    expect(createOnboardingFlowState(steps, 'profile').currentStepId).toBe('profile');
    expect(createOnboardingFlowState(steps, 'unknown').currentStepId).toBe('storage');
  });

  it('avance, mémorise les étapes visitées et marque l’étape quittée comme terminée', () => {
    const initial = createOnboardingFlowState(steps);
    const next = moveOnboardingFlow(initial, steps, 'next');

    expect(next).toMatchObject({
      currentStepId: 'profile',
      visitedStepIds: ['storage', 'profile'],
      completedStepIds: ['storage'],
    });

    const back = moveOnboardingFlow(next, steps, 'back');
    expect(back.currentStepId).toBe('storage');
    expect(back.completedStepIds).toEqual(['storage']);
  });

  it('ne dépasse jamais les bornes et permet une correction ciblée', () => {
    const initial = createOnboardingFlowState(steps);
    expect(moveOnboardingFlow(initial, steps, 'back')).toBe(initial);

    const summary = goToOnboardingStep(initial, steps, 'summary');
    expect(summary.currentStepId).toBe('summary');
    expect(moveOnboardingFlow(summary, steps, 'next')).toBe(summary);
  });

  it('bloque les transitions pendant une soumission', () => {
    const submitting = setOnboardingSubmissionStatus(
      createOnboardingFlowState(steps),
      'submitting',
    );

    expect(moveOnboardingFlow(submitting, steps, 'next')).toBe(submitting);
    expect(goToOnboardingStep(submitting, steps, 'summary')).toBe(submitting);
  });

  it('calcule une progression bornée et explicite', () => {
    const progress = getOnboardingProgress(steps, 'profile');
    expect(progress).toMatchObject({
      currentIndex: 1,
      currentPosition: 2,
      totalSteps: 3,
      isFirstStep: false,
      isLastStep: false,
    });
    expect(progress.percentage).toBeCloseTo(200 / 3);
  });

  it('refuse un parcours vide ou des identifiants dupliqués', () => {
    expect(() => createOnboardingFlowState([])).toThrow(/au moins une étape/);
    expect(() => createOnboardingFlowState([{ id: 'same' }, { id: 'same' }])).toThrow(
      /identifiant unique/,
    );
  });
});
