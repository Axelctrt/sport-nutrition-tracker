import { RouterProvider } from "react-router-dom";

import { DataSpaceAccountGate } from '@/app/data-spaces/DataSpaceAccountGate';
import { OnboardingCompletionNotifier } from '@/app/onboarding/OnboardingCompletionNotifier';
import { AppProviders } from "@/app/providers/AppProviders";
import { RoutineReminderNotifier } from "@/app/reminders/RoutineReminderNotifier";
import { RewardUnlockNotifier } from "@/app/rewards/RewardUnlockNotifier";
import { router } from "@/app/router";
import { SocialIdentityAccountGate } from '@/app/social-identity/SocialIdentityAccountGate';
import { AutomaticSyncCoordinator } from '@/app/sync/AutomaticSyncCoordinator';
import { WeightSyncCoordinator } from '@/app/sync/WeightSyncCoordinator';
import { WeeklyMissionCompletionNotifier } from "@/app/rewards/WeeklyMissionCompletionNotifier";
import '@/features/onboarding/styles/onboardingMotion.css';
import { PwaUpdatePrompt } from "@/pwa/PwaUpdatePrompt";
import { GlobalBannerCoordinatorProvider } from '@/shared/global-banner/GlobalBannerCoordinator';

export function App() {
  return (
    <DataSpaceAccountGate>
      <AppProviders>
        <GlobalBannerCoordinatorProvider>
          <SocialIdentityAccountGate>
            <RouterProvider router={router} />
            <OnboardingCompletionNotifier />
            <RoutineReminderNotifier />
            <RewardUnlockNotifier />
            <WeeklyMissionCompletionNotifier />
            <WeightSyncCoordinator />
            <AutomaticSyncCoordinator />
            <PwaUpdatePrompt />
          </SocialIdentityAccountGate>
        </GlobalBannerCoordinatorProvider>
      </AppProviders>
    </DataSpaceAccountGate>
  );
}
