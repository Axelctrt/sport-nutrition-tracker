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

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
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

    const frameId = window.requestAnimationFrame(() => {
      headingRef.current?.focus({ preventScroll: true });
      headingRef.current?.scrollIntoView({
        block: 'start',
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      });
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
