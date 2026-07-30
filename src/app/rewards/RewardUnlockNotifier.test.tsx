import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  RewardUnlockNotifier,
} from "@/app/rewards/RewardUnlockNotifier";
import { rewardRevealContextIsSafe } from "@/app/rewards/rewardRevealContext";
import { buildAchievementSnapshot } from "@/application/rewards/achievementService";
import type {
  RewardUnlockBatch,
  RewardUnlockListener,
} from "@/application/rewards/rewardUnlockObserver";
import { buildThemeAchievementSnapshot } from "@/application/rewards/themeAchievementService";
import type { Activity } from "@/domain/models/activity";
import {
  readVisualThemeState,
  resetVisualThemeStateRuntimeForTests,
  writeVisualThemeState,
} from "@/domain/rewards/visualThemes";
import { ToastProvider } from "@/shared/toast/ToastProvider";

function createObserver(batch: RewardUnlockBatch) {
  return (onUnlocks: RewardUnlockListener) => {
    onUnlocks(batch);
    return () => undefined;
  };
}

const noUnlocksObserver = () => () => undefined;

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

function prepareNeonUnlock() {
  writeVisualThemeState({
    activeThemeId: "core",
    unlockedThemeIds: ["core", "neon-pulse"],
    unlockMetadata: {
      "neon-pulse": { unlockedAt: "2026-07-28T12:30:00.000Z" },
    },
  });
}

describe("RewardUnlockNotifier", () => {
  beforeEach(() => {
    resetVisualThemeStateRuntimeForTests();
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-sport-theme");
  });

  it("ouvre le reveal sur l'accueil et enregistre revealSeenAt", async () => {
    prepareNeonUnlock();
    render(
      <ToastProvider>
        <RewardUnlockNotifier
          currentPathname="/"
          observeUnlocks={noUnlocksObserver}
        />
      </ToastProvider>,
    );

    expect(await screen.findByRole("dialog", { name: "Neon Pulse" }))
      .toBeInTheDocument();
    expect(screen.getByText("Ton rythme prend une nouvelle dimension."))
      .toBeInTheDocument();
    expect(readVisualThemeState().unlockMetadata["neon-pulse"]?.revealSeenAt)
      .toEqual(expect.any(String));
  });

  it("ne montre le reveal qu'une seule fois", async () => {
    prepareNeonUnlock();
    const first = render(
      <ToastProvider>
        <RewardUnlockNotifier
          currentPathname="/"
          observeUnlocks={noUnlocksObserver}
        />
      </ToastProvider>,
    );
    await screen.findByRole("dialog", { name: "Neon Pulse" });
    first.unmount();

    render(
      <ToastProvider>
        <RewardUnlockNotifier
          currentPathname="/"
          observeUnlocks={noUnlocksObserver}
        />
      </ToastProvider>,
    );
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Neon Pulse" }))
        .not.toBeInTheDocument();
    });
  });

  it("reporte silencieusement le reveal hors des contextes sûrs", async () => {
    prepareNeonUnlock();
    const rendered = render(
      <ToastProvider>
        <RewardUnlockNotifier
          currentPathname="/food/add"
          observeUnlocks={noUnlocksObserver}
        />
      </ToastProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText("Nouveau thème débloqué")).not.toBeInTheDocument();
      expect(screen.queryByRole("dialog", { name: "Neon Pulse" })).not.toBeInTheDocument();
    });

    rendered.rerender(
      <ToastProvider>
        <RewardUnlockNotifier
          currentPathname="/"
          observeUnlocks={noUnlocksObserver}
        />
      </ToastProvider>,
    );

    expect(await screen.findByRole("dialog", { name: "Neon Pulse" })).toBeInTheDocument();
  });

  it("reporte aussi le reveal lorsqu'un dialogue de saisie est ouvert sur l'accueil", () => {
    const host = document.createElement("div");
    host.setAttribute("role", "dialog");
    document.body.append(host);
    expect(rewardRevealContextIsSafe("/", document)).toBe(false);
    host.remove();
    expect(rewardRevealContextIsSafe("/", document)).toBe(true);
  });

  it("essaie le thème sans le persister puis le confirme explicitement", async () => {
    const user = userEvent.setup();
    const navigateToDashboard = vi.fn();
    prepareNeonUnlock();
    render(
      <ToastProvider>
        <RewardUnlockNotifier
          currentPathname="/"
          observeUnlocks={noUnlocksObserver}
          navigateToDashboard={navigateToDashboard}
        />
      </ToastProvider>,
    );

    await user.click(await screen.findByRole("button", {
      name: "Essayer maintenant",
    }));
    expect(navigateToDashboard).toHaveBeenCalledOnce();
    expect(document.documentElement.dataset.sportTheme).toBe("neon-pulse");
    expect(readVisualThemeState().activeThemeId).toBe("core");
    expect(screen.getByLabelText("Essai du thème Neon Pulse"))
      .toBeInTheDocument();

    await user.click(screen.getByRole("button", {
      name: "Conserver ce thème",
    }));
    expect(readVisualThemeState().activeThemeId).toBe("neon-pulse");
    expect(screen.queryByLabelText("Essai du thème Neon Pulse"))
      .not.toBeInTheDocument();
  });

  it("célèbre les badges après le reveal prioritaire d'un thème", async () => {
    const user = userEvent.setup();
    const achievementSnapshot = buildAchievementSnapshot({
      totalLoggedSessions: 1,
      enduranceActivities: 0,
      completedStrengthSessions: 0,
      activeDays: 1,
      disciplineCount: 1,
    });
    const themeSnapshot = createNeonThemeSnapshot();
    prepareNeonUnlock();

    render(
      <ToastProvider>
        <RewardUnlockNotifier
          currentPathname="/"
          observeUnlocks={createObserver({
            achievements: achievementSnapshot.newlyEarnedAchievements,
            themes: themeSnapshot.newlyUnlockedThemes,
          })}
        />
      </ToastProvider>,
    );

    expect(await screen.findByRole("dialog", { name: "Neon Pulse" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Premier élan" }))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole("button", {
      name: "Conserver mon thème actuel",
    }));

    expect(await screen.findByRole("dialog", { name: "Premier élan" }))
      .toBeInTheDocument();
    expect(screen.getByText("Badge débloqué")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continuer" }));
    expect(screen.queryByRole("dialog", { name: "Premier élan" }))
      .not.toBeInTheDocument();
  });
});
