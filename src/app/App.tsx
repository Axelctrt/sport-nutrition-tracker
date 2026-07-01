import { RouterProvider } from "react-router-dom";

import { DataSpaceAccountGate } from '@/app/data-spaces/DataSpaceAccountGate';
import { AppProviders } from "@/app/providers/AppProviders";
import { RoutineReminderNotifier } from "@/app/reminders/RoutineReminderNotifier";
import { RewardUnlockNotifier } from "@/app/rewards/RewardUnlockNotifier";
import { WeeklyMissionCompletionNotifier } from "@/app/rewards/WeeklyMissionCompletionNotifier";
import { WeightSyncCoordinator } from '@/app/sync/WeightSyncCoordinator';
import { router } from "@/app/router";
import { PwaUpdatePrompt } from "@/pwa/PwaUpdatePrompt";

export function App() {
  return (
    <DataSpaceAccountGate>
      <AppProviders>
        <RouterProvider router={router} />
        <RoutineReminderNotifier />
        <RewardUnlockNotifier />
        <WeeklyMissionCompletionNotifier />
        <WeightSyncCoordinator />
        <PwaUpdatePrompt />
      </AppProviders>
    </DataSpaceAccountGate>
  );
}
