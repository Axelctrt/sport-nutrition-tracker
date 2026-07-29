import { RouterProvider } from "react-router-dom";

import { DataSpaceAccountGate } from '@/app/data-spaces/DataSpaceAccountGate';
import { SocialIdentityAccountGate } from '@/app/social-identity/SocialIdentityAccountGate';
import { AppProviders } from "@/app/providers/AppProviders";
import { RoutineReminderNotifier } from "@/app/reminders/RoutineReminderNotifier";
import { RewardUnlockNotifier } from "@/app/rewards/RewardUnlockNotifier";
import { WeeklyMissionCompletionNotifier } from "@/app/rewards/WeeklyMissionCompletionNotifier";
import { AutomaticSyncCoordinator } from '@/app/sync/AutomaticSyncCoordinator';
import { WeightSyncCoordinator } from '@/app/sync/WeightSyncCoordinator';
import { router } from "@/app/router";
import '@/features/onboarding/styles/onboardingMotion.css';
import { PwaUpdatePrompt } from "@/pwa/PwaUpdatePrompt";

function AppRuntime() {
  return (
    <AppProviders>
      <SocialIdentityAccountGate>
        <RouterProvider router={router} />
        <RoutineReminderNotifier />
        <RewardUnlockNotifier />
        <WeeklyMissionCompletionNotifier />
        <WeightSyncCoordinator />
        <AutomaticSyncCoordinator />
        <PwaUpdatePrompt />
      </SocialIdentityAccountGate>
    </AppProviders>
  );
}

export function App() {
  const onboardingRouteActive = window.location.hash.startsWith('#/onboarding');

  if (onboardingRouteActive) return <AppRuntime />;

  return (
    <DataSpaceAccountGate>
      <AppRuntime />
    </DataSpaceAccountGate>
  );
}
