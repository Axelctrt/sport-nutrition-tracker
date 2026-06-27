import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { WeeklyMissionSnapshot } from "@/application/rewards/weeklyMissionService";
import { DashboardWeeklyMissions } from "@/features/dashboard/components/DashboardWeeklyMissions";

const snapshot: WeeklyMissionSnapshot = {
  weekStart: "2026-06-22",
  weekEnd: "2026-06-28",
  completedCount: 2,
  totalCount: 5,
  completionPercentage: 40,
  missions: [
    {
      id: "activeDays",
      title: "Bouger 3 jours",
      description: "Mission activité",
      current: 3,
      target: 3,
      remaining: 0,
      percentage: 100,
      completed: true,
    },
    {
      id: "enduranceActivities",
      title: "Faire 2 séances d’endurance",
      description: "Mission endurance",
      current: 1,
      target: 2,
      remaining: 1,
      percentage: 50,
      completed: false,
    },
    {
      id: "strengthSessions",
      title: "Terminer 2 séances de musculation",
      description: "Mission musculation",
      current: 2,
      target: 2,
      remaining: 0,
      percentage: 100,
      completed: true,
    },
    {
      id: "nutritionDays",
      title: "Compléter 5 journées nutritionnelles",
      description: "Mission nutrition",
      current: 2,
      target: 5,
      remaining: 3,
      percentage: 40,
      completed: false,
    },
    {
      id: "weighInDays",
      title: "Enregistrer une pesée",
      description: "Mission pesée",
      current: 0,
      target: 1,
      remaining: 1,
      percentage: 0,
      completed: false,
    },
  ],
};

describe("DashboardWeeklyMissions", () => {
  it("affiche les cinq missions et la progression hebdomadaire", async () => {
    const unsubscribe = vi.fn();
    const observeSnapshot = vi.fn((onSnapshot) => {
      onSnapshot(snapshot);
      return unsubscribe;
    });

    const { unmount } = render(
      <DashboardWeeklyMissions
        observeSnapshot={observeSnapshot}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Missions de la semaine",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Missions terminées : 2 sur 5"),
    ).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
    expect(screen.getByText("Bouger 3 jours")).toBeInTheDocument();
    expect(
      screen.getByText("Compléter 5 journées nutritionnelles"),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(6);

    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("affiche l’erreur de calcul sans masquer le titre", async () => {
    const observeSnapshot = vi.fn((_onSnapshot, onError) => {
      onError?.(new Error("Base indisponible"));
      return vi.fn();
    });

    render(
      <DashboardWeeklyMissions
        observeSnapshot={observeSnapshot}
      />,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Missions de la semaine",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Base indisponible",
    );
  });
});
