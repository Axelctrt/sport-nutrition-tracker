import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { CenteredState } from '@/shared/ui/CenteredState';

export function OnboardingRoute({ children }: PropsWithChildren) {
  const { status, profile, errorMessage } = useProfile();

  if (status === 'loading') {
    return (
      <CenteredState
        title="Préparation de SportPilot"
        description="La base locale est en cours d’ouverture."
      />
    );
  }

  if (status === 'error') {
    return (
      <CenteredState
        tone="error"
        title="Initialisation impossible"
        description={errorMessage ?? 'Recharge la page pour réessayer.'}
      />
    );
  }

  if (profile) {
    return <Navigate to={routePaths.dashboard} replace />;
  }

  return children;
}
