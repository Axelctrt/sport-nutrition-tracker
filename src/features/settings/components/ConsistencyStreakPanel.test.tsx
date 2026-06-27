import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { ConsistencyStreakSnapshot } from "@/application/rewards/consistencyStreakService";
import { ConsistencyStreakPanel } from "@/features/settings/components/ConsistencyStreakPanel";

const snapshot: ConsistencyStreakSnapshot = {
  activeDates: [
    "2026-06-23",
    "2026-06-24",
    "2026-06-25",
    "2026-06-26",
    "2026-06-27",
  ],
  currentStreak: 5,
  bestStreak: 8,
  activeDaysLast7: 5,
  activeDaysLast30: 12,
  latestActiveDate: "2026-06-27",
};

describe("ConsistencyStreakPanel", () => {
  it("affiche les séries et les fenêtres de régularité", async () => {
    const unsubscribe = vi.fn();
    const observeSnapshot = vi.fn((onSnapshot) => {
      onSnapshot(snapshot);
      return unsubscribe;
    });

    const { unmount } = render(
      <ConsistencyStreakPanel observeSnapshot={observeSnapshot} />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Séries de régularité",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("5 j")).toBeInTheDocument();
    expect(screen.getByText("8 j")).toBeInTheDocument();
    expect(screen.getByText("5/7")).toBeInTheDocument();
    expect(screen.getByText("12/30")).toBeInTheDocument();
    expect(
      screen.getByText(/Dernière journée active : 27 juin 2026/),
    ).toBeInTheDocument();

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("affiche une erreur sans masquer le titre du panneau", async () => {
    const observeSnapshot = vi.fn((_onSnapshot, onError) => {
      onError?.(new Error("Base indisponible"));
      return vi.fn();
    });

    render(<ConsistencyStreakPanel observeSnapshot={observeSnapshot} />);

    expect(
      await screen.findByRole("heading", {
        name: "Séries de régularité",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Base indisponible",
    );
  });
});
