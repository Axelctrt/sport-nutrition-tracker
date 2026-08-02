import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";
import {
  readVisualThemeState,
  resetVisualThemeStateRuntimeForTests,
  VISUAL_THEME_STORAGE_KEY,
  type VisualThemeState,
  writeVisualThemeState,
} from "@/domain/rewards/visualThemes";
import { RewardThemesPanel } from "@/features/settings/components/RewardThemesPanel";

const EMPTY_DATA = {
  activities: [],
  workoutSessions: [],
  checkIns: [],
  checkOuts: [],
  foodEntries: [],
  activityDecisions: [],
};
const REFERENCE_DATE = "2026-07-28";
const UNLOCKED_STATE: VisualThemeState = {
  activeThemeId: "core",
  unlockedThemeIds: ["core", "emerald-focus"],
  unlockMetadata: {
    "emerald-focus": {
      unlockedAt: "2026-07-20T08:00:00.000Z",
    },
  },
};
const MULTI_UNLOCKED_STATE: VisualThemeState = {
  activeThemeId: "core",
  unlockedThemeIds: ["core", "emerald-focus", "aurora"],
  unlockMetadata: {
    "emerald-focus": {
      unlockedAt: "2026-07-20T08:00:00.000Z",
    },
    aurora: {
      unlockedAt: "2026-07-21T08:00:00.000Z",
    },
  },
};

function snapshot(state: VisualThemeState = {
  activeThemeId: "core",
  unlockedThemeIds: ["core"],
  unlockMetadata: {},
}) {
  return buildThemeAchievementSnapshot(EMPTY_DATA, REFERENCE_DATE, state);
}

describe("RewardThemesPanel", () => {
  beforeEach(() => {
    resetVisualThemeStateRuntimeForTests();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-sport-theme");
  });

  it("affiche Core, la collection complète et la progression réelle", async () => {
    const { container } = render(
      <RewardThemesPanel loadSnapshot={async () => snapshot()} />,
    );

    expect(await screen.findByRole("heading", { name: "Thèmes" }))
      .toBeInTheDocument();
    expect(screen.getByText("1 / 5")).toBeInTheDocument();
    expect(screen.getAllByText("Core").length).toBeGreaterThan(0);
    expect(screen.getByText("Neon Pulse")).toBeInTheDocument();
    expect(screen.getByText("20 activités terminées")).toBeInTheDocument();
    for (const themeId of [
      "core",
      "neon-pulse",
      "emerald-focus",
      "aurora",
      "zenith-gold",
    ]) {
      expect(container.querySelector(`[data-theme-preview="${themeId}"]`))
        .not.toBeNull();
    }
  });

  it("ouvre la progression d'un thème verrouillé sans l'appliquer", async () => {
    const user = userEvent.setup();
    render(<RewardThemesPanel loadSnapshot={async () => snapshot()} />);

    const neonTitle = await screen.findByRole("heading", { name: "Neon Pulse" });
    const neonCard = neonTitle.closest("article");
    expect(neonCard).not.toBeNull();
    await user.click(within(neonCard!).getByRole("button", {
      name: "Voir ma progression",
    }));

    expect(screen.getByRole("dialog", { name: "Neon Pulse" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Essayer maintenant" }))
      .not.toBeInTheDocument();
    expect(document.documentElement.dataset.sportTheme).toBeUndefined();
  });

  it("active immédiatement un thème déjà débloqué", async () => {
    const user = userEvent.setup();
    const activateTheme = vi.fn(() => true);
    writeVisualThemeState(UNLOCKED_STATE);

    render(
      <RewardThemesPanel
        loadSnapshot={async () => snapshot(UNLOCKED_STATE)}
        activateTheme={activateTheme}
      />,
    );

    const emeraldTitle = await screen.findByRole("heading", {
      name: "Emerald Focus",
    });
    await user.click(within(emeraldTitle.closest("article")!).getByRole(
      "button",
      { name: "Appliquer" },
    ));

    expect(activateTheme).toHaveBeenCalledWith("emerald-focus");
    await waitFor(() => {
      expect(within(emeraldTitle.closest("article")!).getByText("Actif"))
        .toBeInTheDocument();
    });
  });

  it("isole le chargement et le succès du thème en cours d’application", async () => {
    const user = userEvent.setup();
    let resolveActivation: ((applied: boolean) => void) | undefined;
    const activateTheme = vi.fn(() => new Promise<boolean>((resolve) => {
      resolveActivation = resolve;
    }));
    writeVisualThemeState(MULTI_UNLOCKED_STATE);

    render(
      <RewardThemesPanel
        loadSnapshot={async () => snapshot(MULTI_UNLOCKED_STATE)}
        activateTheme={activateTheme}
      />,
    );

    const emeraldCard = (await screen.findByRole("heading", {
      name: "Emerald Focus",
    })).closest("article")!;
    const auroraCard = screen.getByRole("heading", {
      name: "Aurora",
    }).closest("article")!;

    await user.click(within(emeraldCard).getByRole("button", {
      name: "Appliquer",
    }));

    expect(within(emeraldCard).getByRole("button", {
      name: "Application…",
    })).toHaveAttribute("data-state", "loading");
    expect(within(auroraCard).getByRole("button", {
      name: "Appliquer",
    })).toHaveAttribute("data-state", "idle");

    resolveActivation?.(true);

    await waitFor(() => {
      expect(within(emeraldCard).getByRole("button", {
        name: "Thème appliqué",
      })).toHaveAttribute("data-state", "success");
    });
    expect(within(auroraCard).getByRole("button", {
      name: "Appliquer",
    })).toHaveAttribute("data-state", "idle");
  });

  it("isole aussi l’erreur d’application d’un thème", async () => {
    const user = userEvent.setup();
    writeVisualThemeState(MULTI_UNLOCKED_STATE);

    render(
      <RewardThemesPanel
        loadSnapshot={async () => snapshot(MULTI_UNLOCKED_STATE)}
        activateTheme={() => false}
      />,
    );

    const emeraldCard = (await screen.findByRole("heading", {
      name: "Emerald Focus",
    })).closest("article")!;
    const auroraCard = screen.getByRole("heading", {
      name: "Aurora",
    }).closest("article")!;

    await user.click(within(emeraldCard).getByRole("button", {
      name: "Appliquer",
    }));

    await waitFor(() => {
      expect(within(emeraldCard).getByRole("button", {
        name: "Indisponible",
      })).toHaveAttribute("data-state", "error");
    });
    expect(within(auroraCard).getByRole("button", {
      name: "Appliquer",
    })).toHaveAttribute("data-state", "idle");
  });

  it("essaie un thème sans persister puis restaure Core à l'annulation", async () => {
    const user = userEvent.setup();
    writeVisualThemeState(UNLOCKED_STATE);
    render(
      <RewardThemesPanel loadSnapshot={async () => snapshot(UNLOCKED_STATE)} />,
    );

    const emeraldTitle = await screen.findByRole("heading", {
      name: "Emerald Focus",
    });
    await user.click(within(emeraldTitle.closest("article")!).getByRole(
      "button",
      { name: "Prévisualiser" },
    ));
    await user.click(screen.getByRole("button", { name: "Essayer maintenant" }));

    expect(screen.getByText("Thème en essai")).toBeInTheDocument();
    expect(document.documentElement.dataset.sportTheme).toBe("emerald-focus");
    expect(readVisualThemeState().activeThemeId).toBe("core");

    await user.click(screen.getByRole("button", {
      name: "Revenir à l’ancien thème",
    }));
    expect(document.documentElement.dataset.sportTheme).toBe("core");
    expect(JSON.parse(
      window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY) ?? "{}",
    )).toMatchObject({ activeThemeId: "core" });
  });
});
