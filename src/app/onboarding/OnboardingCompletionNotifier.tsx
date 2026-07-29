import { useEffect, useState } from 'react';
import {
  PROFILE_ONBOARDING_COMPLETED_EVENT,
  readProfileOnboardingCompletion,
} from '@/features/onboarding/storage/onboardingCompletionStorage';
import { SportPilotOnboardingCompleteReveal } from '@/shared/ui/SportPilotOnboardingCompleteReveal';

const SEEN_STORAGE_KEY = 'sportpilot:onboarding:completion-reveal:v1';
const RECENT_COMPLETION_WINDOW_MS = 2 * 60 * 1000;

function shouldRevealCompletion(): boolean {
  const completion = readProfileOnboardingCompletion();
  if (!completion) return false;
  const completedAt = Date.parse(completion.completedAt);
  if (Number.isNaN(completedAt) || Date.now() - completedAt > RECENT_COMPLETION_WINDOW_MS) {
    return false;
  }

  try {
    return window.sessionStorage.getItem(SEEN_STORAGE_KEY) !== completion.completedAt;
  } catch {
    return true;
  }
}

export function OnboardingCompletionNotifier() {
  const [open, setOpen] = useState(shouldRevealCompletion);

  useEffect(() => {
    const handleCompletion = () => setOpen(shouldRevealCompletion());
    window.addEventListener(PROFILE_ONBOARDING_COMPLETED_EVENT, handleCompletion);
    return () => window.removeEventListener(PROFILE_ONBOARDING_COMPLETED_EVENT, handleCompletion);
  }, []);

  useEffect(() => {
    if (!open) return;
    const completion = readProfileOnboardingCompletion();
    if (!completion) return;
    try {
      window.sessionStorage.setItem(SEEN_STORAGE_KEY, completion.completedAt);
    } catch {
      // Le reveal reste ponctuel dans le cycle React courant.
    }
  }, [open]);

  return open ? (
    <SportPilotOnboardingCompleteReveal onContinue={() => setOpen(false)} />
  ) : null;
}
