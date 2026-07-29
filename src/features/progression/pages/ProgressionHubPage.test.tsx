import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

import { ProgressionHubPage } from "@/features/progression/pages/ProgressionHubPage";
import { createProfileInput } from "@/test/factories/profileFactory";
import { createEntity } from "@/shared/utils/entities";

const profile = createEntity(createProfileInput());

vi.mock("@/app/providers/profile/useProfile", () => ({
  useProfile: () => ({ profile }),
}));

vi.mock("@/features/progression/hooks/useProgressionHubSummary", () => ({
  useProgressionHubSummary: () => ({
    status: "ready",
    data: {
      activity: { sessionCount: 0, totalMinutes: 0, recordedStepDays: 0 },
      weight: { state: "empty" },
      nutrition: { trackedDays: 0 },
      strength: { state: "empty" },
      week: {
        plannedActivities: 0,
        realizedPlannedActivities: 0,
        completedActivities: 0,
        confirmedRestDays: 0,
        checkInDays: 0,
        nutritionDays: 0,
      },
      series: { weight: [], activity: [], nutrition: [], strength: [] },
      signal: {
        tone: "neutral",
        title: "Encore un peu de suivi pour dégager un signal",
        detail: "Ajoute quelques données.",
        destination: "regularity",
      },
      goal: { state: "empty" },
      review: { state: "empty" },
    },
    refresh: vi.fn(),
  }),
}));

it("hiérarchise le signal, la synthèse puis les destinations secondaires", () => {
  function LocationProbe() {
    return <output aria-label="Adresse courante">{useLocation().search}</output>;
  }

  render(
    <MemoryRouter>
      <ProgressionHubPage />
      <LocationProbe />
    </MemoryRouter>,
  );

  expect(screen.getByRole("heading", { name: "Progression" })).toBeInTheDocument();
  expect(
    screen.getByRole("heading", {
      name: "Encore un peu de suivi pour dégager un signal",
    }),
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Vue d’ensemble" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Cette semaine" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Tes domaines" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "30 jours" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  fireEvent.click(screen.getByRole("tab", { name: "7 jours" }));
  expect(screen.getByLabelText("Adresse courante")).toHaveTextContent("?range=7");
  expect(screen.getByRole("link", { name: /Ajouter une pesée/ })).toHaveAttribute(
    "href",
    "/weight",
  );
  expect(screen.getByRole("link", { name: /Ouvrir le bilan/ })).toHaveAttribute(
    "href",
    "/weekly-review",
  );
  expect(screen.getByRole("link", { name: /Créer un objectif/ })).toHaveAttribute(
    "href",
    "/goals",
  );
  expect(screen.getByRole("link", { name: "Rapports" })).toHaveAttribute(
    "href",
    "/reports",
  );
  expect(screen.getByRole("link", { name: "Bilan hebdomadaire" })).toHaveAttribute(
    "href",
    "/weekly-review",
  );
  expect(screen.getByRole("link", { name: "Historique détaillé" })).toHaveAttribute(
    "href",
    "/history",
  );
  expect(screen.queryByRole("link", { name: "Récompenses" })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Analyses détaillées" })).not.toBeInTheDocument();
});
