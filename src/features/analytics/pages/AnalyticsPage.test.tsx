import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

import type { PerformanceAnalyticsSnapshot } from "@/application/analytics/performanceAnalyticsService";
import { AnalyticsPage } from "@/features/analytics/pages/AnalyticsPage";
import { createProfileInput } from "@/test/factories/profileFactory";
import { createEntity } from "@/shared/utils/entities";

const profile = createEntity(createProfileInput());
const weeks = Array.from({ length: 12 }, (_, index) => {
  const day = String(index + 1).padStart(2, "0");
  return {
    weekStart: `2026-05-${day}`,
    weekEnd: `2026-05-${day}`,
    label: `S${index + 1}`,
  };
});
const analytics = {
  base: {
    from: weeks[0]?.weekStart,
    to: weeks.at(-1)?.weekEnd,
    running: [],
    swimming: [],
    cycling: [],
    enduranceRecords: {},
    nutrition: weeks.map((week) => ({
      ...week,
      trackedDayCount: 0,
      completedDayCount: 0,
    })),
    activity: weeks.map((week) => ({
      ...week,
      totalSportMinutes: 0,
      sessionCount: 0,
      recordedStepDays: 0,
      breakdown: [],
    })),
    weight: { movingAverage: [], weekly: [] },
    activityBreakdown: [],
  },
  allWeightPoints: [],
  regularity: weeks.map((week) => ({
    ...week,
    trackingDays: 0,
    nutritionDays: 0,
    completedActivities: 0,
    confirmedRestDays: 0,
    balanced: false,
  })),
  plannedActual: weeks.map((week) => ({
    ...week,
    plannedActivities: 0,
    realizedPlannedActivities: 0,
    completedActivities: 0,
    confirmedRestDays: 0,
    checkInDays: 0,
    nutritionDays: 0,
  })),
  strengthExercises: [],
  macroWeeks: weeks.map((week) => ({ ...week, trackedDays: 0 })),
  nutritionDays: [],
  recoveryDays: [],
  muscleGroupCells: [],
  themeProgress: [],
  heatmap: [],
} as unknown as PerformanceAnalyticsSnapshot;

vi.mock("@/app/providers/profile/useProfile", () => ({
  useProfile: () => ({ profile }),
}));

vi.mock("@/features/analytics/hooks/usePerformanceAnalytics", () => ({
  usePerformanceAnalytics: () => ({
    data: analytics,
    status: "ready",
    refresh: vi.fn(),
  }),
}));

function LocationProbe() {
  return <output aria-label="Adresse courante">{useLocation().search}</output>;
}

it("conserve le domaine et la période dans l’URL", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/analytics?tab=nutrition&weeks=8"]}>
      <AnalyticsPage />
      <LocationProbe />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Analyses" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Nutrition" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("heading", { name: "Calories contre cible" }))
    .toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Période"), "4");
  expect(screen.getByLabelText("Adresse courante")).toHaveTextContent(
    "?tab=nutrition&weeks=4",
  );

  await user.click(screen.getByRole("tab", { name: "Activité" }));
  expect(screen.getByLabelText("Adresse courante")).toHaveTextContent(
    "?tab=activity&weeks=4",
  );
  expect(screen.getByRole("heading", { name: "Durée sportive" }))
    .toBeInTheDocument();
  expect(screen.getByText("Aucune répartition disponible")).toBeInTheDocument();
});

it("conserve aussi la période longue du poids dans une route profonde", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={["/analytics?tab=body&weeks=12&bodyPeriod=30"]}>
      <AnalyticsPage />
      <LocationProbe />
    </MemoryRouter>,
  );

  expect(screen.getByRole("tab", { name: "Corps" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByLabelText("Période du poids")).toHaveValue("30");
  await user.selectOptions(screen.getByLabelText("Période du poids"), "180");
  expect(screen.getByLabelText("Adresse courante")).toHaveTextContent(
    "?tab=body&weeks=12&bodyPeriod=180",
  );
});
