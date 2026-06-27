import { render, screen } from "@testing-library/react";

import { buildAchievementSnapshot } from "@/application/rewards/achievementService";
import { AchievementsPanel } from "@/features/settings/components/AchievementsPanel";

describe("AchievementsPanel", () => {
  it("affiche les badges gagnés et le prochain objectif", async () => {
    render(
      <AchievementsPanel
        loadSnapshot={async () =>
          buildAchievementSnapshot(
            {
              totalLoggedSessions: 1,
              enduranceActivities: 1,
              completedStrengthSessions: 0,
              activeDays: 1,
              disciplineCount: 1,
            },
            [],
            "2026-06-27T12:00:00.000Z",
          )
        }
      />,
    );

    expect(await screen.findByText("1/8 badges gagnés")).toBeInTheDocument();
    expect(screen.getByText("Premier élan")).toBeInTheDocument();
    expect(
      screen.getByText(/Prochain objectif : Rythme installé/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Progression Cap endurance" }),
    ).toHaveAttribute("aria-valuenow", "1");
  });

  it("conserve l’affichage d’un badge déjà gagné sans progression actuelle", async () => {
    render(
      <AchievementsPanel
        loadSnapshot={async () =>
          buildAchievementSnapshot(
            {
              totalLoggedSessions: 0,
              enduranceActivities: 0,
              completedStrengthSessions: 0,
              activeDays: 0,
              disciplineCount: 0,
            },
            [
              {
                id: "strength-five",
                earnedAt: "2026-06-20T08:00:00.000Z",
              },
            ],
          )
        }
      />,
    );

    expect(await screen.findByText("1/8 badges gagnés")).toBeInTheDocument();
    expect(screen.getByText(/Gagné le/)).toBeInTheDocument();
    expect(screen.getAllByLabelText("Badge gagné")).toHaveLength(1);
  });
});
