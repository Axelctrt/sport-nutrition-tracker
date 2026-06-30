import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DatabaseIntegrityPanel } from "@/features/settings/components/DatabaseIntegrityPanel";
import type { DatabaseIntegrityReport } from "@/infrastructure/database/databaseIntegrityModels";

function createReport(
  overrides: Partial<DatabaseIntegrityReport> = {},
): DatabaseIntegrityReport {
  return {
    id: "latest",
    checkedAt: "2026-06-27T10:00:00.000Z",
    databaseName: "sportpilot-local-database",
    schemaVersion: 3,
    expectedSchemaVersion: 3,
    expectedTableCount: 24,
    accessibleTableCount: 24,
    totalRecordCount: 12,
    status: "healthy",
    tableChecks: [],
    latestMigration: {
      id: "schema-version-3",
      version: 3,
      previousVersion: 2,
      status: "succeeded",
      source: "migration",
      appliedAt: "2026-06-27T09:00:00.000Z",
      description: "Migration de test.",
    },
    issues: [],
    ...overrides,
  };
}

describe("DatabaseIntegrityPanel", () => {
  it("affiche un diagnostic sain et permet de le relancer", async () => {
    const checkIntegrity = vi.fn().mockResolvedValue(createReport());

    render(<DatabaseIntegrityPanel checkIntegrity={checkIntegrity} />);

    expect(await screen.findByText("Base locale intègre")).toBeInTheDocument();
    expect(screen.getByText("24/24")).toBeInTheDocument();
    expect(screen.getByText("v3 · réussie")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revérifier" }));

    await waitFor(() => {
      expect(checkIntegrity).toHaveBeenCalledTimes(2);
    });
  });

  it("affiche les anomalies sans proposer de suppression", async () => {
    const checkIntegrity = vi.fn().mockResolvedValue(
      createReport({
        status: "error",
        accessibleTableCount: 23,
        issues: [
          {
            code: "missing-table",
            severity: "error",
            message: "La table test est absente.",
            tableName: "test",
          },
        ],
      }),
    );

    render(<DatabaseIntegrityPanel checkIntegrity={checkIntegrity} />);

    expect(await screen.findByText("Anomalie détectée")).toBeInTheDocument();
    expect(
      screen.getByText(/La table test est absente\./),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Aucune donnée n’est supprimée ou réinitialisée/),
    ).toBeInTheDocument();
  });
});
