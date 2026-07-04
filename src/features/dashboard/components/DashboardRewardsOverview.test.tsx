import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  buildAchievementSnapshot,
  type AchievementSnapshot,
} from "@/application/rewards/achievementService";
import { achievementCatalog } from "@/domain/rewards/achievements";
import { DashboardRewardsOverview } from "@/features/dashboard/components/DashboardRewardsOverview";
import type { AchievementSnapshotListener } from "@/features/dashboard/components/DashboardRewardsOverviewObserver";

function createSnapshot(): AchievementSnapshot {
  return buildAchievementSnapshot(
    {
      totalLoggedSessions: 4,
      enduranceActivities: 2,
      completedStrengthSessions: 1,
      activeDays: 3,
      disciplineCount: 2,
    },
    [
      {
        id: "first-session",
        earnedAt: "2026-06-25T10:00:00.000Z",
      },
    ],
  );
}

function getByTextContent(text: string) {
  return screen.getByText((_, node) => node?.textContent === text);
}

describe("DashboardRewardsOverview", () => {
  it("affiche le prochain badge et les derniers accomplissements", async () => {
    render(
      <MemoryRouter>
        <DashboardRewardsOverview
          observeSnapshot={(onSnapshot) => {
            onSnapshot(createSnapshot());
            return () => undefined;
          }}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Prochain badge : Rythme installé"),
    ).toBeInTheDocument();
    expect(getByTextContent("2/50")).toBeInTheDocument();
    expect(screen.getByText("Premier élan")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Progression Rythme installé",
      }),
    ).toHaveAttribute("aria-valuenow", "4");
    expect(
      screen.getByRole("link", { name: /Voir tous les badges et thèmes/ }),
    ).toHaveAttribute("href", "/rewards");
  });

  it("se met à jour lorsque les données sportives changent", async () => {
    let listener: AchievementSnapshotListener | undefined;

    render(
      <MemoryRouter>
        <DashboardRewardsOverview
          observeSnapshot={(onSnapshot) => {
            listener = onSnapshot;
            onSnapshot(createSnapshot());
            return () => undefined;
          }}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByText((_, node) => node?.textContent === "2/50")).toBeInTheDocument();

    const completedSnapshot = buildAchievementSnapshot(
      {
        totalLoggedSessions: 500,
        runningActivities: 100,
        runningTotalKm: 500,
        runningLongestKm: 42.195,
        runningFiveKmUnder30: 1,
        runningFiveKmUnder25: 1,
        runningSubFivePaceRuns: 1,
        runningElevationMetersTotal: 500,
        swimmingActivities: 100,
        swimmingTotalMeters: 100000,
        swimmingLongestMeters: 2000,
        completedStrengthSessions: 500,
        strengthCompletedSets: 1000,
        strengthVolumeKg: 50000,
        benchPressMaxKg: 100,
        squatMaxKg: 100,
        deadliftMaxKg: 150,
        maxDailySteps: 30000,
        totalSteps: 1000000,
        activeDays: 7,
        activeWeeksWithThreeSessions: 4,
        disciplineCount: 3,
        tripleDisciplineWeeks: 1,
        completedNutritionDays: 7,
      },
      achievementCatalog.map((achievement, index) => ({
        id: achievement.id,
        earnedAt: new Date(Date.UTC(2026, 0, 1 + index, 10, 0, 0)).toISOString(),
      })),
    );

    await act(async () => {
      listener?.(completedSnapshot);
    });

    expect(getByTextContent("50/50")).toBeInTheDocument();
    expect(screen.getByText("Tous les badges sont gagnés")).toBeInTheDocument();
  });
});
