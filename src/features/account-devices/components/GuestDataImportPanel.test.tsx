import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { GuestDataImportPanel } from "@/features/account-devices/components/GuestDataImportPanel";
import { accountDataSpaceId } from "@/domain/data-spaces/dataSpace";
import type { PreparedGuestDataImport } from "@/infrastructure/data-spaces/guestDataImportService";

function preparedImport(
  overrides: Partial<PreparedGuestDataImport["preview"]> = {},
): PreparedGuestDataImport {
  return {
    accountFingerprint: "acct-d2f00baa",
    sourceDatabaseName: "guest",
    targetDatabaseName: "account",
    sourceFingerprint: "guest-fingerprint",
    targetFingerprint: "account-fingerprint",
    targetDatabaseExisted: true,
    mergedSnapshot: {} as PreparedGuestDataImport["mergedSnapshot"],
    preview: {
      guestRecordCount: 5,
      accountRecordCount: 3,
      recordsToAdd: 2,
      recordsToUpdate: 1,
      recordsToRemove: 1,
      unchangedAccountRecords: 2,
      hasGuestData: true,
      categories: [
        {
          key: "nutrition",
          label: "Nutrition",
          description: "Nutrition",
          guestRecords: 5,
          accountRecords: 3,
          recordsToAdd: 2,
          recordsToUpdate: 1,
          recordsToRemove: 1,
        },
      ],
      ...overrides,
    },
  };
}

describe("GuestDataImportPanel", () => {
  it("impose une analyse avant de permettre l’import", async () => {
    const prepared = preparedImport();
    const prepareImport = vi.fn(async () => prepared);
    const applyImport = vi.fn(async () => ({
      importedRecords: 2,
      updatedRecords: 1,
      removedDuplicates: 1,
      sourcePreserved: true as const,
      space: {
        id: accountDataSpaceId("acct-d2f00baa"),
        kind: "account" as const,
        databaseName: "account",
        label: "Espace de compte",
        accountFingerprint: "acct-d2f00baa",
        linkedToCurrentDevice: true,
        createdAt: "2026-07-01T08:00:00.000Z",
        lastActivatedAt: "2026-07-01T08:00:00.000Z",
      },
    }));
    const reload = vi.fn();

    render(
      <GuestDataImportPanel
        accountFingerprint="acct-d2f00baa"
        prepareImport={prepareImport}
        applyImport={applyImport}
        reload={reload}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "Importer dans mon compte" }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Analyser les données invitées" }),
    );

    expect(await screen.findByText("2")).toBeInTheDocument();
    expect(screen.getByText("Nutrition")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Importer dans mon compte" }),
    ).toBeEnabled();

    await userEvent.click(
      screen.getByRole("button", { name: "Importer dans mon compte" }),
    );
    expect(
      screen.getByRole("heading", { name: "Importer les données invitées ?" }),
    ).toBeInTheDocument();

    const dialog = screen.getByRole("alertdialog");
    await userEvent.click(
      within(dialog).getByRole("button", { name: "Importer dans mon compte" }),
    );

    await waitFor(() => expect(applyImport).toHaveBeenCalledWith(prepared));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("signale un espace invité vide sans proposer d’import", async () => {
    const prepareImport = vi.fn(async () =>
      preparedImport({
        guestRecordCount: 0,
        hasGuestData: false,
        recordsToAdd: 0,
        recordsToUpdate: 0,
        recordsToRemove: 0,
        categories: [],
      }),
    );

    render(
      <GuestDataImportPanel
        accountFingerprint="acct-d2f00baa"
        prepareImport={prepareImport}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Analyser les données invitées" }),
    );

    expect(
      await screen.findByText(
        "Aucune donnée utilisateur n’est disponible dans l’espace invité.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Importer dans mon compte" }),
    ).not.toBeInTheDocument();
  });
});
