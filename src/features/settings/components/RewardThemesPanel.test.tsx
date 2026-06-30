import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";
import { VISUAL_THEME_STORAGE_KEY } from "@/domain/rewards/visualThemes";
import { RewardThemesPanel } from "@/features/settings/components/RewardThemesPanel";

describe("RewardThemesPanel", () => {
  beforeEach(() => {
    window.localStorage.removeItem(VISUAL_THEME_STORAGE_KEY);
  });
  it("affiche les thèmes débloqués et la progression restante", async () => {
    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot({
            enduranceActivities: 2,
            completedStrengthSessions: 0,
            activeDays: 3,
          })
        }
      />,
    );

    expect(await screen.findByText("1/4 débloqués")).toBeInTheDocument();
    expect(screen.getByText("Horizon endurance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Encore 3 à accomplir" }),
    ).toBeDisabled();
  });

  it("active immédiatement un thème déjà débloqué", async () => {
    const user = userEvent.setup();
    const activateTheme = vi.fn(() => true);

    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot(
            {
              enduranceActivities: 0,
              completedStrengthSessions: 0,
              activeDays: 0,
            },
            ["classic", "power"],
          )
        }
        activateTheme={activateTheme}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Utiliser ce thème" }),
    );

    expect(activateTheme).toHaveBeenCalledWith("power");
    expect(screen.getAllByRole("button", { name: "Thème actif" })).toHaveLength(
      1,
    );
  });
});
