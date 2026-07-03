import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";
import { VISUAL_THEME_STORAGE_KEY } from "@/domain/rewards/visualThemes";
import { RewardThemesPanel } from "@/features/settings/components/RewardThemesPanel";

const emptyThemeMetrics = {
  totalLoggedSessions: 0,
  enduranceActivities: 0,
  runningKm: 0,
  swimmingActivities: 0,
  swimmingMeters: 0,
  completedStrengthSessions: 0,
  strengthVolumeKg: 0,
  activeDays: 0,
};

describe("RewardThemesPanel", () => {
  beforeEach(() => {
    window.localStorage.removeItem(VISUAL_THEME_STORAGE_KEY);
  });

  it("affiche les thèmes débloqués et la progression restante", async () => {
    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot({
            ...emptyThemeMetrics,
            enduranceActivities: 2,
            activeDays: 3,
          })
        }
      />,
    );

    expect(await screen.findByText("1/15 débloqués")).toBeInTheDocument();
    expect(screen.getByText("Horizon endurance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Encore 3 à accomplir" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Prévisualiser Horizon endurance" }),
    ).toBeEnabled();
  });

  it("active immédiatement un thème déjà débloqué", async () => {
    const user = userEvent.setup();
    const activateTheme = vi.fn(() => true);

    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot(emptyThemeMetrics, ["classic", "power"])
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

  it("prévisualise un thème verrouillé sans le débloquer", async () => {
    const user = userEvent.setup();
    const previewTheme = vi.fn();
    const clearPreview = vi.fn(() => "classic" as const);

    render(
      <RewardThemesPanel
        loadSnapshot={async () => buildThemeAchievementSnapshot(emptyThemeMetrics)}
        previewTheme={previewTheme}
        clearPreview={clearPreview}
      />,
    );

    await user.click(
      await screen.findByRole("button", { name: "Prévisualiser Volcan" }),
    );

    expect(previewTheme).toHaveBeenCalledWith("volcan");
    expect(screen.getByText("Aperçu actif : Volcan")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitter l’aperçu" }));
    expect(clearPreview).toHaveBeenCalled();
  });
});
