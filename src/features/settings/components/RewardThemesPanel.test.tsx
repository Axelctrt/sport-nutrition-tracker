import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";
import {
  VISUAL_THEME_STORAGE_KEY,
  VISUAL_THEME_STYLE_STORAGE_KEY,
} from "@/domain/rewards/visualThemes";
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
    window.localStorage.removeItem(VISUAL_THEME_STYLE_STORAGE_KEY);
    document.documentElement.removeAttribute("data-sport-theme");
    document.documentElement.removeAttribute("data-sport-theme-style");
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
    expect(screen.getByRole("button", { name: "Complet" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Minimaliste" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByText("Horizon endurance")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Encore 3 à accomplir" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", {
        name: "Voir un aperçu rapide de Horizon endurance",
      }),
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

  it("ouvre une mini pop-up d’aperçu sans appliquer le thème à toute l’app", async () => {
    const user = userEvent.setup();

    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot(emptyThemeMetrics)
        }
      />,
    );

    await user.click(
      await screen.findByRole("button", {
        name: "Voir un aperçu rapide de Volcan",
      }),
    );

    const dialog = screen.getByRole("dialog", { name: "Volcan" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute("data-theme-preview-dialog", "true");
    expect(
      screen.getByText(
        "Aperçu indicatif du fond et des cartes, sans appliquer le thème à l’application.",
      ),
    ).toBeInTheDocument();
    expect(document.documentElement.dataset.sportTheme).toBeUndefined();

    await user.click(
      screen.getByRole("button", { name: "Fermer l’aperçu du thème" }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "Volcan" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("ne propose plus d’aperçu complet appliqué à toute l’app", async () => {
    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot(emptyThemeMetrics)
        }
      />,
    );

    await screen.findByText("Volcan");

    expect(
      screen.queryByRole("button", {
        name: /Prévisualiser tout le thème/,
      }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Aperçu complet temporaire")).not.toBeInTheDocument();
    expect(document.documentElement.dataset.sportTheme).toBeUndefined();
  });

  it("permet de choisir un style complet ou minimaliste pour les thèmes", async () => {
    const user = userEvent.setup();

    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot(emptyThemeMetrics)
        }
      />,
    );

    await screen.findByText("Thèmes récompenses");
    await user.click(screen.getByRole("button", { name: "Minimaliste" }));

    expect(document.documentElement.dataset.sportThemeStyle).toBe("minimal");
    expect(screen.getByRole("button", { name: "Minimaliste" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    expect(document.documentElement.dataset.sportThemeStyle).toBe("minimal");
    expect(
      screen.queryByRole("button", {
        name: /Prévisualiser tout le thème/,
      }),
    ).not.toBeInTheDocument();
  });

  it("grise SportPilot classique en style complet mais le conserve en minimaliste", async () => {
    const user = userEvent.setup();

    render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot(emptyThemeMetrics)
        }
      />,
    );

    await screen.findByText("SportPilot classique");

    expect(
      screen.getByRole("button", {
        name: "SportPilot classique n’a pas d’aperçu complet",
      }),
    ).toBeDisabled();
    expect(
      screen.getAllByRole("button", { name: "Minimaliste uniquement" })
        .length,
    ).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "Minimaliste" }));

    expect(
      screen.getByRole("button", {
        name: "Voir un aperçu rapide de SportPilot classique",
      }),
    ).toBeEnabled();
  });

  it("affiche des miniatures thématiques dédiées aux décors spectaculaires", async () => {
    const { container } = render(
      <RewardThemesPanel
        loadSnapshot={async () =>
          buildThemeAchievementSnapshot(emptyThemeMetrics)
        }
      />,
    );

    await screen.findByText("Volcan");

    expect(
      container.querySelector('[data-sport-preview="volcan"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-sport-preview="abysses"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-sport-preview="nexus-vivant"]'),
    ).not.toBeNull();
  });
});
