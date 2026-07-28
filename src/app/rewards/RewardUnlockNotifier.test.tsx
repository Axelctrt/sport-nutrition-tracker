import { fireEvent, render, screen } from "@testing-library/react";

import { RewardUnlockNotifier } from "@/app/rewards/RewardUnlockNotifier";
import { buildAchievementSnapshot } from "@/application/rewards/achievementService";
import type {
  RewardUnlockBatch,
  RewardUnlockListener,
} from "@/application/rewards/rewardUnlockObserver";
import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";
import type { Activity } from "@/domain/models/activity";
import { ToastProvider } from "@/shared/toast/ToastProvider";

function createObserver(batch: RewardUnlockBatch) {
  return (onUnlocks: RewardUnlockListener) => {
    onUnlocks(batch);
    return () => undefined;
  };
}

function createNeonThemeSnapshot() {
  const dates = [
    "2026-06-01", "2026-06-02", "2026-06-03",
    "2026-06-15", "2026-06-16", "2026-06-17",
    ...Array.from({ length: 14 }, (_, index) => (
      `2026-07-0${index % 3 + 6}`
    )),
  ];
  const activities: Activity[] = dates.map((date, index) => ({
    id: `activity-${index}`,
    date,
    type: "walking",
    durationMinutes: 30,
    intensity: "moderate",
    met: 4,
    includedInDailySteps: true,
    calculation: {
      weightKg: 70,
      estimatedCaloriesKcal: 140,
      calculationVersion: 1,
    },
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  }));
  return buildThemeAchievementSnapshot(
    {
      activities,
      workoutSessions: [],
      checkIns: [],
      checkOuts: [],
      foodEntries: [],
      activityDecisions: [],
    },
    "2026-07-28",
    {
      activeThemeId: "core",
      unlockedThemeIds: ["core"],
      unlockMetadata: {},
    },
  );
}

describe("RewardUnlockNotifier", () => {
  it("annonce un badge puis le nouveau thème", async () => {
    const achievementSnapshot = buildAchievementSnapshot({
      totalLoggedSessions: 1,
      enduranceActivities: 0,
      completedStrengthSessions: 0,
      activeDays: 1,
      disciplineCount: 1,
    });
    const themeSnapshot = createNeonThemeSnapshot();

    render(
      <ToastProvider>
        <RewardUnlockNotifier
          observeUnlocks={createObserver({
            achievements: achievementSnapshot.newlyEarnedAchievements,
            themes: themeSnapshot.newlyUnlockedThemes,
          })}
        />
      </ToastProvider>,
    );

    expect(
      await screen.findByText("Nouveau badge : Premier élan"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Nouveau thème : Neon Pulse"))
      .not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", {
      name: "Fermer la notification : Nouveau badge : Premier élan",
    }));
    expect(screen.getByText("Nouveau thème : Neon Pulse")).toBeInTheDocument();
  });

  it("regroupe plusieurs badges dans une seule notification", async () => {
    const achievementSnapshot = buildAchievementSnapshot({
      totalLoggedSessions: 10,
      enduranceActivities: 5,
      completedStrengthSessions: 0,
      activeDays: 7,
      disciplineCount: 3,
    });

    render(
      <ToastProvider>
        <RewardUnlockNotifier
          observeUnlocks={createObserver({
            achievements: achievementSnapshot.newlyEarnedAchievements,
            themes: [],
          })}
        />
      </ToastProvider>,
    );

    expect(await screen.findByText("5 nouveaux badges gagnés"))
      .toBeInTheDocument();
    expect(screen.getByText(/Premier élan/)).toBeInTheDocument();
  });
});
