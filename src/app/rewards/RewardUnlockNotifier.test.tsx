import { render, screen } from "@testing-library/react";

import { RewardUnlockNotifier } from "@/app/rewards/RewardUnlockNotifier";
import { buildAchievementSnapshot } from "@/application/rewards/achievementService";
import type {
  RewardUnlockBatch,
  RewardUnlockListener,
} from "@/application/rewards/rewardUnlockObserver";
import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";
import { ToastProvider } from "@/shared/toast/ToastProvider";

function createObserver(batch: RewardUnlockBatch) {
  return (onUnlocks: RewardUnlockListener) => {
    onUnlocks(batch);
    return () => undefined;
  };
}

describe("RewardUnlockNotifier", () => {
  it("annonce un badge et un thème nouvellement débloqués", async () => {
    const achievementSnapshot = buildAchievementSnapshot({
      totalLoggedSessions: 1,
      enduranceActivities: 0,
      completedStrengthSessions: 0,
      activeDays: 1,
      disciplineCount: 1,
    });
    const themeSnapshot = buildThemeAchievementSnapshot({
      enduranceActivities: 5,
      completedStrengthSessions: 0,
      activeDays: 1,
    });

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
    expect(
      screen.getByText("Nouveau thème : Horizon endurance"),
    ).toBeInTheDocument();
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

    expect(
      await screen.findByText("5 nouveaux badges gagnés"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Premier élan/)).toBeInTheDocument();
  });
});
