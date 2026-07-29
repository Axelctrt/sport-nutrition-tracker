import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import {
  createOnboardingFlowState,
  getOnboardingProgress,
  goToOnboardingStep,
  moveOnboardingFlow,
  setOnboardingSubmissionStatus,
  type OnboardingFlowState,
  type OnboardingStepDefinition,
} from '@/features/onboarding/flow/onboardingFlow';

interface UseOnboardingFlowOptions<TStepId extends string> {
  steps: readonly OnboardingStepDefinition<TStepId>[];
  restoredStepId?: string | undefined;
  onStepChange?: ((stepId: TStepId) => void) | undefined;
}

interface UseOnboardingFlowResult<TStepId extends string> {
  state: OnboardingFlowState<TStepId>;
  progress: ReturnType<typeof getOnboardingProgress<TStepId>>;
  headingRef: RefObject<HTMLHeadingElement | null>;
  goBack: () => void;
  goNext: () => void;
  goTo: (stepId: TStepId) => void;
  runSubmission: (operation: () => Promise<void>) => Promise<boolean>;
}

function interactiveElementHasFocus(element: Element | null): boolean {
  return element instanceof HTMLInputElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLSelectElement
    || element instanceof HTMLButtonElement
    || element instanceof HTMLAnchorElement
    || (element instanceof HTMLElement && element.isContentEditable);
}

export function useOnboardingFlow<TStepId extends string>({
  steps,
  restoredStepId,
  onStepChange,
}: UseOnboardingFlowOptions<TStepId>): UseOnboardingFlowResult<TStepId> {
  const [state, setState] = useState(() => createOnboardingFlowState(steps, restoredStepId));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const submissionLockRef = useRef(false);
  const previousStepRef = useRef(state.currentStepId);

  const progress = useMemo(
    () => getOnboardingProgress(steps, state.currentStepId),
    [state.currentStepId, steps],
  );

  useEffect(() => {
    if (previousStepRef.current === state.currentStepId) {
      return;
    }

    previousStepRef.current = state.currentStepId;
    onStepChange?.(state.currentStepId);
    const focusedAtTransition = document.activeElement;

    const frameId = window.requestAnimationFrame(() => {
      const currentFocus = document.activeElement;
      const userSelectedAnotherControl = currentFocus !== focusedAtTransition
        && interactiveElementHasFocus(currentFocus);
      if (!userSelectedAnotherControl) {
        headingRef.current?.focus({ preventScroll: true });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [onStepChange, state.currentStepId]);

  const goBack = useCallback(() => {
    setState((current) => moveOnboardingFlow(current, steps, 'back'));
  }, [steps]);

  const goNext = useCallback(() => {
    setState((current) => moveOnboardingFlow(current, steps, 'next'));
  }, [steps]);

  const goTo = useCallback((stepId: TStepId) => {
    setState((current) => goToOnboardingStep(current, steps, stepId));
  }, [steps]);

  const runSubmission = useCallback(async (operation: () => Promise<void>) => {
    if (submissionLockRef.current) {
      return false;
    }

    submissionLockRef.current = true;
    setState((current) => setOnboardingSubmissionStatus(current, 'submitting'));

    try {
      await operation();
      return true;
    } finally {
      submissionLockRef.current = false;
      setState((current) => setOnboardingSubmissionStatus(current, 'idle'));
    }
  }, []);

  return {
    state,
    progress,
    headingRef,
    goBack,
    goNext,
    goTo,
    runSubmission,
  };
}
