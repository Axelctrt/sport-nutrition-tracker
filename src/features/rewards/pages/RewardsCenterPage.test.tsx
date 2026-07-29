import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { RewardsCenterPage } from "@/features/rewards/pages/RewardsCenterPage";

vi.mock("@/features/dashboard/components/DashboardWeeklyMissions", () => ({
  DashboardWeeklyMissions: () => <section>Missions de la semaine</section>,
}));

vi.mock("@/features/settings/components/ConsistencyStreakPanel", () => ({
  ConsistencyStreakPanel: () => <section>Séries de régularité</section>,
}));

vi.mock("@/features/settings/components/AchievementsPanel", () => ({
  AchievementsPanel: () => <section>Accomplissements</section>,
}));

vi.mock("@/features/settings/components/RewardThemesPanel", () => ({
  RewardThemesPanel: () => <section>Collection de thèmes</section>,
}));

describe("RewardsCenterPage", () => {
  it("ouvre sur la collection de thèmes", () => {
    render(<RewardsCenterPage />);

    expect(screen.getByRole("heading", { name: "Récompenses" }))
      .toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Thèmes" }))
      .toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Collection de thèmes")).toBeVisible();
    expect(screen.getByText("Accomplissements")).not.toBeVisible();
  });

  it("regroupe badges, missions et séries dans le second onglet", async () => {
    const user = userEvent.setup();
    render(<RewardsCenterPage />);

    await user.click(screen.getByRole("tab", { name: "Badges" }));

    expect(screen.getByText("Accomplissements")).toBeVisible();
    expect(screen.getByText("Missions de la semaine")).toBeInTheDocument();
    expect(screen.getByText("Séries de régularité", { selector: "section" }))
      .toBeInTheDocument();
    expect(screen.getByText("Collection de thèmes")).not.toBeVisible();
  });
});
