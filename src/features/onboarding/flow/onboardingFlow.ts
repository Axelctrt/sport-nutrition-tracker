export type OnboardingSubmissionStatus = 'idle' | 'submitting';

export interface OnboardingStepDefinition<TStepId extends string> {
  id: TStepId;
}

export interface OnboardingFlowState<TStepId extends string> {
  currentStepId: TStepId;
  visitedStepIds: TStepId[];
  completedStepIds: TStepId[];
  submissionStatus: OnboardingSubmissionStatus;
}

function getStepIds<TStepId extends string>(
  steps: readonly OnboardingStepDefinition<TStepId>[],
): TStepId[] {
  if (steps.length === 0) {
    throw new Error('Le parcours d’onboarding doit contenir au moins une étape.');
  }

  const stepIds = steps.map((step) => step.id);
  if (new Set(stepIds).size !== stepIds.length) {
    throw new Error('Chaque étape d’onboarding doit avoir un identifiant unique.');
  }

  return stepIds;
}

function appendUnique<TValue>(values: readonly TValue[], value: TValue): TValue[] {
  return values.includes(value) ? [...values] : [...values, value];
}

export function createOnboardingFlowState<TStepId extends string>(
  steps: readonly OnboardingStepDefinition<TStepId>[],
  restoredStepId?: string,
): OnboardingFlowState<TStepId> {
  const stepIds = getStepIds(steps);
  const restoredStep = stepIds.find((stepId) => stepId === restoredStepId);
  const currentStepId = restoredStep ?? stepIds[0]!;

  return {
    currentStepId,
    visitedStepIds: [currentStepId],
    completedStepIds: [],
    submissionStatus: 'idle',
  };
}

export function getOnboardingStepIndex<TStepId extends string>(
  steps: readonly OnboardingStepDefinition<TStepId>[],
  stepId: TStepId,
): number {
  const stepIds = getStepIds(steps);
  const index = stepIds.indexOf(stepId);

  if (index < 0) {
    throw new Error(`Étape d’onboarding inconnue : ${stepId}`);
  }

  return index;
}

export function getOnboardingProgress<TStepId extends string>(
  steps: readonly OnboardingStepDefinition<TStepId>[],
  stepId: TStepId,
) {
  const currentIndex = getOnboardingStepIndex(steps, stepId);

  return {
    currentIndex,
    currentPosition: currentIndex + 1,
    totalSteps: steps.length,
    percentage: ((currentIndex + 1) / steps.length) * 100,
    isFirstStep: currentIndex === 0,
    isLastStep: currentIndex === steps.length - 1,
  };
}

export function moveOnboardingFlow<TStepId extends string>(
  state: OnboardingFlowState<TStepId>,
  steps: readonly OnboardingStepDefinition<TStepId>[],
  direction: 'back' | 'next',
): OnboardingFlowState<TStepId> {
  if (state.submissionStatus === 'submitting') {
    return state;
  }

  const currentIndex = getOnboardingStepIndex(steps, state.currentStepId);
  const targetIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
  const targetStep = steps[targetIndex];

  if (!targetStep) {
    return state;
  }

  return {
    ...state,
    currentStepId: targetStep.id,
    visitedStepIds: appendUnique(state.visitedStepIds, targetStep.id),
    completedStepIds: direction === 'next'
      ? appendUnique(state.completedStepIds, state.currentStepId)
      : [...state.completedStepIds],
  };
}

export function goToOnboardingStep<TStepId extends string>(
  state: OnboardingFlowState<TStepId>,
  steps: readonly OnboardingStepDefinition<TStepId>[],
  stepId: TStepId,
): OnboardingFlowState<TStepId> {
  if (state.submissionStatus === 'submitting') {
    return state;
  }

  getOnboardingStepIndex(steps, stepId);

  return {
    ...state,
    currentStepId: stepId,
    visitedStepIds: appendUnique(state.visitedStepIds, stepId),
  };
}

export function setOnboardingSubmissionStatus<TStepId extends string>(
  state: OnboardingFlowState<TStepId>,
  submissionStatus: OnboardingSubmissionStatus,
): OnboardingFlowState<TStepId> {
  return {
    ...state,
    submissionStatus,
  };
}
