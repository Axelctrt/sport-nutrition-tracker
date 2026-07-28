import { act, render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import {
  SportPilotAccessibleSummary,
  SportPilotEmptyChart,
  SportPilotHeatmap,
} from "@/shared/charts/SportPilotCharts";
import { useSportPilotChartAnimation } from "@/shared/charts/useSportPilotChartAnimation";

describe("SportPilotCharts", () => {
  it("propose une action utile dans un état vide", () => {
    render(
      <MemoryRouter>
        <SportPilotEmptyChart
          title="Tendance indisponible"
          description="Ajoute deux données."
          action={{ label: "Ajouter", to: "/weight" }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Tendance indisponible")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ajouter" }))
      .toHaveAttribute("href", "/weight");
  });

  it("fournit une alternative tabulaire au graphique", () => {
    render(
      <SportPilotAccessibleSummary
        caption="Poids"
        rows={[{
          label: "Semaine 1",
          values: [{ label: "Moyenne", value: "80 kg" }],
        }]}
      />,
    );

    expect(screen.getByRole("table", { name: "Poids" })).toBeInTheDocument();
    expect(screen.getByText("80 kg")).toBeInTheDocument();
  });

  it("rend la heatmap tactile et décrit la sélection sans dépendre de la couleur", async () => {
    const user = userEvent.setup();
    render(
      <SportPilotHeatmap
        label="Continuité"
        days={[
          {
            date: "2026-07-07",
            label: "7 juillet",
            score: 2,
            detail: "suivi quotidien, nutrition",
          },
        ]}
      />,
    );

    await user.click(screen.getByRole("gridcell", {
      name: "7 juillet : suivi quotidien, nutrition",
    }));
    expect(screen.getByText("suivi quotidien, nutrition")).toBeInTheDocument();
  });

  it("arrête les animations quand l’onglet devient masqué", () => {
    let visibility: DocumentVisibilityState = "visible";
    const visibilitySpy = vi.spyOn(document, "visibilityState", "get")
      .mockImplementation(() => visibility);
    const { result } = renderHook(useSportPilotChartAnimation);

    expect(result.current).toBe(true);
    visibility = "hidden";
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    expect(result.current).toBe(false);

    visibilitySpy.mockRestore();
  });

  it("désactive les animations en réduction de mouvement", () => {
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockImplementation(
      (query) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    );

    const { result } = renderHook(useSportPilotChartAnimation);
    expect(result.current).toBe(false);
    matchMediaSpy.mockRestore();
  });
});
