import type { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { CenteredState } from '@/shared/ui/CenteredState';

export function OnboardingGuard({ children }: PropsWithChildren) {
  const { status, profile, errorMessage } = useProfile();

  if (status === 'loading') {
    return (
      <CenteredState
        title="Chargement du profil"
        description="SportPilot vérifie les données enregistrées sur cet appareil."
      />
    );
  }

  if (status === 'error') {
    return (
      <CenteredState
        tone="error"
        title="Profil local indisponible"
        description={errorMessage ?? 'Recharge la page pour réessayer.'}
      />
    );
  }

  if (!profile) {
    return <Navigate to={routePaths.onboarding} replace />;
  }

  return children;
}
