import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { SportPilotAnimatedTabs } from "@/shared/ui/SportPilotAnimatedTabs";
import { SportPilotMultiStepLoader } from "@/shared/ui/SportPilotMultiStepLoader";
import {
  SportPilotActiveBorder,
  SportPilotProgressTransition,
} from "@/shared/ui/SportPilotMotion";
import { SportPilotStatefulButton } from "@/shared/ui/SportPilotStatefulButton";

describe("primitives Performance Glass", () => {
  it("garde un bouton stateful stable et annonce son etat", () => {
    const { rerender } = render(
      <SportPilotStatefulButton
        state="loading"
        idleLabel="Analyser avec l'IA"
        loadingLabel="Analyse en cours"
        successLabel="Analyse terminee"
      />,
    );

    expect(screen.getByRole("button", { name: "Analyse en cours" }))
      .toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button")).toBeDisabled();

    rerender(
      <SportPilotStatefulButton
        state="success"
        idleLabel="Analyser avec l'IA"
        loadingLabel="Analyse en cours"
        successLabel="Analyse terminee"
      />,
    );
    expect(screen.getByRole("button", { name: "Analyse terminee" }))
      .toHaveAttribute("data-state", "success");
  });

  it("pilote les onglets au clavier sans rendre le hover obligatoire", () => {
    const onChange = vi.fn();
    render(
      <SportPilotAnimatedTabs
        label="Domaines d'analyse"
        tabs={[
          { id: "overview", label: "Vue d'ensemble" },
          { id: "body", label: "Corps" },
          { id: "nutrition", label: "Nutrition" },
        ]}
        activeTab="overview"
        onChange={onChange}
      />,
    );

    const overview = screen.getByRole("tab", { name: "Vue d'ensemble" });
    fireEvent.keyDown(overview, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith("body");
    expect(screen.getByRole("tab", { name: "Corps" })).toHaveFocus();
  });

  it("expose les valeurs de progression et les etapes du loader", () => {
    render(
      <>
        <SportPilotProgressTransition
          value={3}
          max={4}
          label="Semaines equilibrees"
        />
        <SportPilotMultiStepLoader
          activeStep={1}
          steps={[
            { id: "prepare", label: "Preparation de la photo" },
            { id: "analyze", label: "Analyse du repas" },
            { id: "estimate", label: "Creation de l'estimation" },
          ]}
        />
      </>,
    );

    expect(screen.getByRole("progressbar", { name: "Semaines equilibrees" }))
      .toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByText("Preparation de la photo").closest("li"))
      .toHaveAttribute("data-status", "complete");
    expect(screen.getByText("Analyse du repas").closest("li"))
      .toHaveAttribute("aria-current", "step");
  });

  it("reserve les bordures accentuees aux etats actifs", () => {
    const { container } = render(
      <SportPilotActiveBorder active rarity="epic">
        Theme Aurora
      </SportPilotActiveBorder>,
    );
    expect(container.firstChild).toHaveClass(
      "sp-active-border--active",
      "sp-active-border--epic",
    );
  });
});

