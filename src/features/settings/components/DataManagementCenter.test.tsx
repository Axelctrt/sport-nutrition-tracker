import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { routePaths } from "@/app/routePaths";
import { DataManagementCenter } from "@/features/settings/components/DataManagementCenter";

describe("DataManagementCenter", () => {
  it("regroupe le stockage, la sauvegarde et les outils de maintenance", () => {
    render(
      <MemoryRouter>
        <DataManagementCenter
          storageStatus="persisted"
          lastBackupExportedAt={undefined}
          integrityPanel={<div>Diagnostic d’intégrité intégré</div>}
          consistencyPanel={<p>Contrôle de cohérence intégré</p>}
          selectiveResetPanel={<div>Réinitialisation sélective intégrée</div>}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Centre de gestion des données" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Stockage persistant actif")).toBeInTheDocument();
    expect(screen.getByText("Aucune sauvegarde enregistrée")).toBeInTheDocument();
    expect(screen.getByText(/IndexedDB\s*·\s*schéma\s*v\s*11/u)).toBeInTheDocument();
    expect(screen.getByText(/JSON v\s*10/u)).toBeInTheDocument();
    expect(screen.getByText("Diagnostic d’intégrité intégré")).toBeInTheDocument();
    expect(
      screen.getByText("Réinitialisation sélective intégrée"),
    ).toBeInTheDocument();

    expect(
      screen.getByRole("link", { name: /Sauvegarder ou restaurer/ }),
    ).toHaveAttribute("href", routePaths.backup);
    expect(
      screen.getByRole("link", {
        name: /Confidentialité et stockage local/,
      }),
    ).toHaveAttribute("href", routePaths.privacy);
  });

  it("signale lorsque la persistance du stockage n’est pas accordée", () => {
    render(
      <MemoryRouter>
        <DataManagementCenter
          storageStatus="notPersisted"
          lastBackupExportedAt="2026-06-27T12:00:00.000Z"
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByText("Stockage persistant non accordé"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Aucune sauvegarde enregistrée")).not.toBeInTheDocument();
  });
});
