import { render, screen, waitFor } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { vi } from "vitest";

import { WeeklyMissionCompletionNotifier } from "@/app/rewards/WeeklyMissionCompletionNotifier";
import type { WeeklyMissionCompletionSnapshot } from "@/application/rewards/weeklyMissionCompletionService";
import { ToastProvider } from "@/shared/toast/ToastProvider";

function Wrapper({ children }: PropsWithChildren) {
  return <ToastProvider>{children}</ToastProvider>;
}

const completionSnapshot: WeeklyMissionCompletionSnapshot = {
  missions: {
    weekStart: "2026-06-22",
    weekEnd: "2026-06-28",
    completedCount: 5,
    totalCount: 5,
    completionPercentage: 100,
    missions: [],
  },
  history: {
    completedWeekCount: 1,
    currentWeeklyStreak: 1,
    bestWeeklyStreak: 1,
    latestCompletedWeekStart: "2026-06-22",
  },
  newlyCompletedWeek: {
    weekStart: "2026-06-22",
    completedAt: "2026-06-27T20:00:00.000Z",
  },
};

describe("WeeklyMissionCompletionNotifier", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("affiche une carte événementielle pour une nouvelle semaine terminée", async () => {
    const observeCompletions = vi.fn((onCompletion) => {
      onCompletion(completionSnapshot);
      return vi.fn();
    });

    render(
      <WeeklyMissionCompletionNotifier
        currentPathname="/"
        observeCompletions={observeCompletions}
      />,
      { wrapper: Wrapper },
    );

    expect(await screen.findByRole('dialog', { name: 'Semaine accomplie' })).toBeInTheDocument();
    expect(screen.getByText(/Cette semaine rejoint ton historique/)).toBeInTheDocument();
    expect(screen.getByText('5 sur 5')).toBeInTheDocument();
  });

  it("ne rend aucun contenu sans nouvelle complétion", async () => {
    const observeCompletions = vi.fn(() => vi.fn());

    const { container } = render(
      <WeeklyMissionCompletionNotifier
        currentPathname="/"
        observeCompletions={observeCompletions}
      />,
      { wrapper: Wrapper },
    );

    await waitFor(() => {
      expect(observeCompletions).toHaveBeenCalledTimes(1);
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
