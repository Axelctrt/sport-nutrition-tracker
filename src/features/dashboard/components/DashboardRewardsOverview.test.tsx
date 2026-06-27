import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import {
  buildAchievementSnapshot,
  type AchievementSnapshot,
} from "@/application/rewards/achievementService";
import {
  DashboardRewardsOverview,
  type AchievementSnapshotListener,
} from "@/features/dashboard/components/DashboardRewardsOverview";

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
    expect(screen.getByText("1/8")).toBeInTheDocument();
    expect(screen.getByText("Premier élan")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", {
        name: "Progression Rythme installé",
      }),
    ).toHaveAttribute("aria-valuenow", "4");
    expect(
      screen.getByRole("link", { name: /Voir tous les badges et thèmes/ }),
    ).toHaveAttribute("href", "/settings");
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

    expect(await screen.findByText("1/8")).toBeInTheDocument();

    const completedSnapshot = buildAchievementSnapshot(
      {
        totalLoggedSessions: 25,
        enduranceActivities: 20,
        completedStrengthSessions: 20,
        activeDays: 14,
        disciplineCount: 4,
      },
      [
        { id: "first-session", earnedAt: "2026-06-20T10:00:00.000Z" },
        { id: "ten-sessions", earnedAt: "2026-06-21T10:00:00.000Z" },
        { id: "endurance-five", earnedAt: "2026-06-22T10:00:00.000Z" },
        { id: "endurance-twenty", earnedAt: "2026-06-23T10:00:00.000Z" },
        { id: "strength-five", earnedAt: "2026-06-24T10:00:00.000Z" },
        { id: "strength-twenty", earnedAt: "2026-06-25T10:00:00.000Z" },
        { id: "active-seven", earnedAt: "2026-06-26T10:00:00.000Z" },
        { id: "versatile-three", earnedAt: "2026-06-27T10:00:00.000Z" },
      ],
    );

    await act(async () => {
      listener?.(completedSnapshot);
    });

    expect(screen.getByText("8/8")).toBeInTheDocument();
    expect(screen.getByText("Tous les badges sont gagnés")).toBeInTheDocument();
  });
});
