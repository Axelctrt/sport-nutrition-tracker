import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { DataSpaceDescriptor } from "@/domain/data-spaces/dataSpace";
import { PROFILE_ONBOARDING_STEP_IDS } from "@/features/onboarding/profile/profileOnboardingSteps";
import { loadProfileOnboardingDraft } from "@/features/onboarding/storage/profileOnboardingDraft";
import { DataSpaceAccountGate } from "@/app/data-spaces/DataSpaceAccountGate";
import {
  createDefaultDataSpaceRegistry,
  detachAccountDataSpaceFromCurrentDevice,
  registerAccountDataSpace,
  type DataSpaceStorage,
} from "@/infrastructure/data-spaces/dataSpaceRegistry";
import type {
  CloudAccountRestoreResult,
  CloudAccountRestoreTargetInspection,
  PreparedCloudAccountRestore,
} from "@/infrastructure/data-spaces/cloudAccountRestoreService";
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from "@/infrastructure/sync-prototype/syncPrototypeClient";
import { createSyncPrototypeAccountFingerprint } from "@/infrastructure/sync-prototype/syncPrototypeDiagnostics";

class MemoryStorage implements DataSpaceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createSnapshot(
  account: Partial<SyncPrototypeSnapshot["account"]> = {},
): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: false,
      isLoading: false,
      ...account,
    },
    sync: {
      status: "disconnected",
      phase: "initial",
    },
    weights: {
      weights: [],
      deletedCount: 0,
      isLoading: false,
    },
    diagnostics: {
      databaseName: "test-cloud",
      databaseVersion: 1,
      visibleWeightCount: 0,
      deletedWeightCount: 0,
    },
  };
}

interface TestSyncPrototypeClient extends SyncPrototypeClient {
  notify(): void;
}

function createClient(initialSnapshot: SyncPrototypeSnapshot): TestSyncPrototypeClient {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

  const client: TestSyncPrototypeClient = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    logout: vi.fn(async () => {
      snapshot = createSnapshot();
      for (const listener of listeners) listener();
    }),
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    })),
    syncRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
      uploadedWeights: 0,
      downloadedWeights: 0,
      removedLocalWeights: 0,
      removedCloudWeights: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: "2026-07-01T08:00:00.000Z",
    })),
    saveWeight: vi.fn(async () => {
      throw new Error("not used");
    }),
    deleteWeight: vi.fn(async () => undefined),
    notify: () => {
      for (const listener of listeners) listener();
    },
  };

  return client;
}

const guestSpace = createDefaultDataSpaceRegistry("2026-07-01T08:00:00.000Z")
  .spaces[0]!;

const ACCOUNT_A_ID = "compte-a@example.com";
const ACCOUNT_A_FINGERPRINT =
  createSyncPrototypeAccountFingerprint(ACCOUNT_A_ID)!.toLowerCase();
const NEW_ACCOUNT_ID = "nouveau@example.com";
const NEW_ACCOUNT_FINGERPRINT =
  createSyncPrototypeAccountFingerprint(NEW_ACCOUNT_ID)!.toLowerCase();

const accountSpace: DataSpaceDescriptor = {
  id: `account:${ACCOUNT_A_FINGERPRINT}`,
  kind: "account",
  databaseName: `sportpilot-local-database--${ACCOUNT_A_FINGERPRINT}`,
  label: "Espace de compte",
  accountFingerprint: ACCOUNT_A_FINGERPRINT,
  createdAt: "2026-07-01T08:00:00.000Z",
  lastActivatedAt: "2026-07-01T08:00:00.000Z",
};

function inspectedTarget(
  accountFingerprint: string,
  localState: CloudAccountRestoreTargetInspection["localState"],
): CloudAccountRestoreTargetInspection {
  const missing = localState === "missing";
  return {
    accountFingerprint,
    targetDatabaseName: `sportpilot-local-database--${accountFingerprint}`,
    targetFingerprint: missing ? "missing" : `target-${localState}`,
    targetDatabaseExisted: !missing,
    localMeaningfulRecordCount: localState === "non-empty" ? 1 : 0,
    localState,
  };
}

function inspectTarget(
  localState: CloudAccountRestoreTargetInspection["localState"],
) {
  return vi.fn(async (accountFingerprint: string) =>
    inspectedTarget(accountFingerprint, localState),
  );
}

function preparedCloudRestore({
  accountFingerprint = NEW_ACCOUNT_FINGERPRINT,
  localState = "missing",
  hasCloudData = true,
}: {
  accountFingerprint?: string;
  localState?: "missing" | "empty" | "non-empty";
  hasCloudData?: boolean;
} = {}): PreparedCloudAccountRestore {
  const missing = localState === "missing";
  return {
    accountFingerprint,
    targetDatabaseName: `sportpilot-local-database--${accountFingerprint}`,
    sourceFingerprint: "cloud-source",
    targetFingerprint: missing ? "missing" : `target-${localState}`,
    targetDatabaseExisted: !missing,
    analyzedAt: "2026-07-01T08:00:00.000Z",
    preview: {
      hasCloudData,
      cloudRecordCount: hasCloudData ? 2 : 0,
      cloudDeletionMarkerCount: 0,
      localMeaningfulRecordCount: localState === "non-empty" ? 1 : 0,
      localState,
      canRestore: hasCloudData && localState !== "non-empty",
      categories: hasCloudData ? [
        {
          key: "weights",
          label: "Pesées",
          description: "Historique des pesées synchronisées.",
          recordCount: 2,
        },
      ] : [],
    },
  };
}

function restoreResult(accountFingerprint: string): CloudAccountRestoreResult {
  return {
    restoredRecords: 2,
    restoredDeletionMarkers: 0,
    sourcePreserved: true,
    space: {
      id: `account:${accountFingerprint}`,
      kind: "account",
      databaseName: `sportpilot-local-database--${accountFingerprint}`,
      label: "Espace de compte",
      accountFingerprint,
      createdAt: "2026-07-01T08:00:00.000Z",
      lastActivatedAt: "2026-07-01T08:00:00.000Z",
    },
    completedAt: "2026-07-01T08:01:00.000Z",
  };
}

function configureRestore(
  client: TestSyncPrototypeClient,
  prepared: PreparedCloudAccountRestore,
) {
  client.prepareCloudRestore = vi.fn(async () => prepared);
  client.applyCloudRestore = vi.fn(async () =>
    restoreResult(prepared.accountFingerprint),
  );
  return client;
}

describe("DataSpaceAccountGate", () => {
  it("ouvre normalement l’espace invité lorsqu’aucun compte n’est connecté", async () => {
    render(
      <DataSpaceAccountGate
        client={createClient(createSnapshot())}
        currentSpace={guestSpace}
        reload={vi.fn()}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données privées")).toBeInTheDocument();
  });

  it("masque les données et demande un choix pour un nouveau compte", async () => {
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID })),
      preparedCloudRestore({ hasCloudData: false }),
    );
    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={guestSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("missing")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Comment souhaitez-vous commencer ?",
      }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Reprenez les données du compte ou démarrez avec un profil vierge.",
      ),
    ).not.toBeInTheDocument();
    expect(document.querySelector("main")).toHaveClass(
      "fixed",
      "h-[100dvh]",
      "overflow-hidden",
    );
    expect(screen.queryByText("Données privées")).not.toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "Analyser les données invitées",
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "Créer un nouveau profil",
      }),
    ).toBeInTheDocument();
  });

  it("restaure automatiquement un compte cloud quand la cible locale est absente", async () => {
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID })),
      preparedCloudRestore(),
    );
    const reload = vi.fn();
    const prepareGuestImport = vi.fn();
    const applyGuestImport = vi.fn();

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={guestSpace}
        reload={reload}
        inspectRestoreTarget={inspectTarget("missing")}
        prepareGuestImport={prepareGuestImport}
        applyGuestImport={applyGuestImport}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    await waitFor(() => expect(client.prepareCloudRestore).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(client.applyCloudRestore).toHaveBeenCalledTimes(1));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(prepareGuestImport).not.toHaveBeenCalled();
    expect(applyGuestImport).not.toHaveBeenCalled();
  });

  it("restaure automatiquement un espace de compte existant mais vide", async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace(NEW_ACCOUNT_FINGERPRINT, storage);
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID })),
      preparedCloudRestore({ localState: "empty" }),
    );

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={guestSpace}
        storage={storage}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("empty")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    await waitFor(() => expect(client.applyCloudRestore).toHaveBeenCalledTimes(1));
  });

  it("restaure automatiquement currentSpace quand le même compte est encore vide", async () => {
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: ACCOUNT_A_ID })),
      preparedCloudRestore({
        accountFingerprint: ACCOUNT_A_FINGERPRINT,
        localState: "empty",
      }),
    );

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("empty")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    await waitFor(() => expect(client.applyCloudRestore).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("Données du compte A")).not.toBeInTheDocument();
  });

  it("préserve un espace local non vide sans restauration initiale", async () => {
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: ACCOUNT_A_ID })),
      preparedCloudRestore({
        accountFingerprint: ACCOUNT_A_FINGERPRINT,
        localState: "non-empty",
      }),
    );

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données du compte A")).toBeInTheDocument();
    expect(client.prepareCloudRestore).not.toHaveBeenCalled();
    expect(client.applyCloudRestore).not.toHaveBeenCalled();
  });

  it("ouvre immédiatement un espace local non vide quand le cloud est hors ligne", async () => {
    const client = createClient(
      createSnapshot({ isLoggedIn: true, userId: ACCOUNT_A_ID }),
    );
    client.prepareCloudRestore = vi.fn(async () => {
      throw new Error("offline");
    });

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données du compte A")).toBeInTheDocument();
    expect(client.prepareCloudRestore).not.toHaveBeenCalled();
    expect(client.applyCloudRestore).toBeUndefined();
  });

  it.each(["missing", "empty"] as const)(
    "ne crée rien si le cloud est inconnu pour une cible %s",
    async (localState) => {
      const storage = new MemoryStorage();
      if (localState === "empty") {
        registerAccountDataSpace(NEW_ACCOUNT_FINGERPRINT, storage);
      }
      const client = createClient(
        createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID }),
      );
      client.prepareCloudRestore = vi.fn(async () => {
        throw new Error("Cloud indisponible");
      });
      client.applyCloudRestore = vi.fn(async () => restoreResult(NEW_ACCOUNT_FINGERPRINT));

      render(
        <DataSpaceAccountGate
          client={client}
          currentSpace={guestSpace}
          storage={storage}
          reload={vi.fn()}
          inspectRestoreTarget={inspectTarget(localState)}
        >
          <p>Données privées</p>
        </DataSpaceAccountGate>,
      );

      expect(await screen.findByText("Cloud indisponible")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Créer un nouveau profil" }),
      ).not.toBeInTheDocument();
      expect(client.applyCloudRestore).not.toHaveBeenCalled();
    },
  );

  it("autorise un profil vierge seulement après confirmation que le cloud est vide", async () => {
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID })),
      preparedCloudRestore({ hasCloudData: false }),
    );

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={guestSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("missing")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByRole("button", { name: "Créer un nouveau profil" }),
    ).toBeEnabled();
    expect(client.applyCloudRestore).not.toHaveBeenCalled();
  });

  it("ouvre currentSpace vide quand le cloud est confirmé vide", async () => {
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: ACCOUNT_A_ID })),
      preparedCloudRestore({
        accountFingerprint: ACCOUNT_A_FINGERPRINT,
        localState: "empty",
        hasCloudData: false,
      }),
    );

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("empty")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données du compte A")).toBeInTheDocument();
    expect(client.applyCloudRestore).not.toHaveBeenCalled();
  });

  it("reprend un espace vide existant quand le cloud est confirmé vide", async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace(NEW_ACCOUNT_FINGERPRINT, storage);
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID })),
      preparedCloudRestore({ localState: "empty", hasCloudData: false }),
    );

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={guestSpace}
        storage={storage}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("empty")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Reprendre mes données")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Créer un nouveau profil" }),
    ).not.toBeInTheDocument();
  });

  it("verrouille la récupération par fingerprint pendant les notifications client", async () => {
    let resolveApply: ((value: CloudAccountRestoreResult) => void) | undefined;
    const client = createClient(
      createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID }),
    );
    client.prepareCloudRestore = vi.fn(async () => preparedCloudRestore());
    client.applyCloudRestore = vi.fn(
      () => new Promise<CloudAccountRestoreResult>((resolve) => {
        resolveApply = resolve;
      }),
    );
    const reload = vi.fn();

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={guestSpace}
        reload={reload}
        inspectRestoreTarget={inspectTarget("missing")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    await waitFor(() => expect(client.applyCloudRestore).toHaveBeenCalledTimes(1));
    act(() => {
      client.notify();
      client.notify();
    });
    expect(client.prepareCloudRestore).toHaveBeenCalledTimes(1);
    expect(client.applyCloudRestore).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveApply!(restoreResult(NEW_ACCOUNT_FINGERPRINT));
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("crée un espace vide puis prépare directement l’étape du nom", async () => {
    const createEmptySpace = vi.fn(async () => ({
      space: accountSpace,
      copiedRecords: 0,
      copiedTables: 0,
    }));
    const reload = vi.fn();
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID })),
      preparedCloudRestore({ hasCloudData: false }),
    );

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={guestSpace}
        reload={reload}
        createEmptySpace={createEmptySpace}
        inspectRestoreTarget={inspectTarget("missing")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    await userEvent.click(
      await screen.findByRole("button", {
        name: "Créer un nouveau profil",
      }),
    );

    await waitFor(() => expect(createEmptySpace).toHaveBeenCalledTimes(1));
    expect(loadProfileOnboardingDraft(accountSpace.id, window.localStorage)).toMatchObject({
      status: "restored",
      draft: {
        stepId: PROFILE_ONBOARDING_STEP_IDS.name,
        values: { firstName: "" },
      },
    });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("ouvre un espace déjà associé et permet aussi une fusion analysée", async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace(NEW_ACCOUNT_FINGERPRINT, storage);
    const activateExistingSpace = vi.fn(() => accountSpace);
    const reload = vi.fn();

    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: NEW_ACCOUNT_ID,
          }),
        )}
        currentSpace={guestSpace}
        storage={storage}
        reload={reload}
        activateExistingSpace={activateExistingSpace}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByText("Reprendre mes données"),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: "Analyser les données invitées",
      }),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Reprendre ce profil",
      }),
    );

    expect(activateExistingSpace).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("propose une réassociation explicite après désassociation locale", async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace(NEW_ACCOUNT_FINGERPRINT, storage);
    detachAccountDataSpaceFromCurrentDevice(NEW_ACCOUNT_FINGERPRINT, storage);
    const activateExistingSpace = vi.fn(() => accountSpace);

    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: NEW_ACCOUNT_ID,
          }),
        )}
        currentSpace={guestSpace}
        storage={storage}
        reload={vi.fn()}
        activateExistingSpace={activateExistingSpace}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByText("Reprendre mes données"),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", {
        name: "Réassocier et reprendre",
      }),
    );
    expect(activateExistingSpace).toHaveBeenCalledTimes(1);
  });

  it("ouvre uniquement l’espace correspondant au compte connecté", async () => {
    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: ACCOUNT_A_ID,
          }),
        )}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données du compte A")).toBeInTheDocument();
  });

  it("masque immédiatement les données du compte A lorsque le compte B est connecté", async () => {
    const client = configureRestore(
      createClient(createSnapshot({ isLoggedIn: true, userId: NEW_ACCOUNT_ID })),
      preparedCloudRestore({ hasCloudData: false }),
    );
    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("missing")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByRole("heading", {
        name: "Comment souhaitez-vous commencer ?",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Données du compte A")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Rattacher mes données" }),
    ).not.toBeInTheDocument();
  });

  it("conserve l’espace du compte après une déconnexion sans action implicite", async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace("acct-A1B2C3D4", storage);
    const reload = vi.fn();
    const client = createClient(createSnapshot());
    const ensureValidCloudCredentials = vi.fn();
    client.ensureValidCloudCredentials = ensureValidCloudCredentials;

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        storage={storage}
        reload={reload}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données privées")).toBeInTheDocument();
    expect(reload).not.toHaveBeenCalled();
    expect(client.logout).not.toHaveBeenCalled();
    expect(ensureValidCloudCredentials).not.toHaveBeenCalled();
  });

  it("laisse le renouvellement au consommateur cloud sans bloquer les données locales", async () => {
    const client = createClient(
      createSnapshot({
        isLoggedIn: true,
        userId: ACCOUNT_A_ID,
      }),
    );
    const ensureValidCloudCredentials = vi.fn();
    client.ensureValidCloudCredentials = ensureValidCloudCredentials;

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>Données du compte</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données du compte")).toBeInTheDocument();
    expect(ensureValidCloudCredentials).not.toHaveBeenCalled();
    expect(client.logout).not.toHaveBeenCalled();
  });

  it("conserve un currentSpace non vide si l’initialisation cloud échoue", async () => {
    const client = createClient(
      createSnapshot({ isLoggedIn: true, userId: ACCOUNT_A_ID }),
    );
    client.initialize = vi.fn(async () => {
      throw new Error("Cloud indisponible");
    });

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Données du compte A")).toBeInTheDocument();
    expect(client.prepareCloudRestore).toBeUndefined();
  });

  it("bloque un currentSpace vide si l’initialisation cloud échoue", async () => {
    const client = createClient(
      createSnapshot({ isLoggedIn: true, userId: ACCOUNT_A_ID }),
    );
    client.initialize = vi.fn(async () => {
      throw new Error("Cloud indisponible");
    });

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={vi.fn()}
        inspectRestoreTarget={inspectTarget("empty")}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText("Cloud indisponible")).toBeInTheDocument();
    expect(screen.queryByText("Données du compte A")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Créer un nouveau profil" }),
    ).not.toBeInTheDocument();
  });

  it("reste dans la base locale du compte pendant les événements réseau et de visibilité", async () => {
    const client = createClient(
      createSnapshot({
        isLoggedIn: true,
        userId: ACCOUNT_A_ID,
      }),
    );
    const ensureValidCloudCredentials = vi.fn();
    client.ensureValidCloudCredentials = ensureValidCloudCredentials;
    const reload = vi.fn();

    render(
      <DataSpaceAccountGate
        client={client}
        currentSpace={accountSpace}
        reload={reload}
        inspectRestoreTarget={inspectTarget("non-empty")}
      >
        <p>{accountSpace.databaseName}</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText(accountSpace.databaseName)).toBeInTheDocument();
    await act(async () => {
      window.dispatchEvent(new Event("online"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByText(accountSpace.databaseName)).toBeInTheDocument();
    expect(ensureValidCloudCredentials).not.toHaveBeenCalled();
    expect(client.logout).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });
});
