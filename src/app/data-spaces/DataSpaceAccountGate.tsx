import { Cloud, LogOut, ShieldCheck } from "lucide-react";
import { lazy, Suspense, type ReactNode, useEffect, useMemo, useState } from "react";

import type { DataSpaceDescriptor } from "@/domain/data-spaces/dataSpace";
import {
  activateGuestDataSpace,
  type DataSpaceStorage,
} from "@/infrastructure/data-spaces/dataSpaceRegistry";
import {
  activateExistingAccountDataSpace,
  createEmptyAccountDataSpace,
  findAccountDataSpace,
} from "@/infrastructure/data-spaces/accountDataSpaceService";
import type {
  GuestDataImportResult,
  GuestDataImportServiceOptions,
  PreparedGuestDataImport,
} from "@/infrastructure/data-spaces/guestDataImportService";
import { activeDataSpace } from "@/infrastructure/database/database";
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from "@/infrastructure/sync-prototype/syncPrototypeClient";
import { readSyncPrototypeConfigSafely } from "@/infrastructure/sync-prototype/syncPrototypeConfig";
import { createSyncPrototypeAccountFingerprint } from "@/infrastructure/sync-prototype/syncPrototypeDiagnostics";
import { AppSplashScreen } from "@/shared/ui/AppSplashScreen";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

const GuestDataImportPanel = lazy(async () => {
  const module = await import(
    "@/features/account-devices/components/GuestDataImportPanel"
  );
  return { default: module.GuestDataImportPanel };
});

const CloudAccountRestorePanel = lazy(async () => {
  const module = await import(
    "@/features/account-devices/components/CloudAccountRestorePanel"
  );
  return { default: module.CloudAccountRestorePanel };
});

interface DataSpaceAccountGateProps {
  children: ReactNode;
  client?: SyncPrototypeClient | null;
  currentSpace?: DataSpaceDescriptor;
  storage?: DataSpaceStorage;
  reload?: () => void;
  prepareGuestImport?: (
    accountFingerprint: string,
    options?: GuestDataImportServiceOptions,
  ) => Promise<PreparedGuestDataImport>;
  applyGuestImport?: (
    prepared: PreparedGuestDataImport,
    options?: GuestDataImportServiceOptions,
  ) => Promise<GuestDataImportResult>;
  createEmptySpace?: typeof createEmptyAccountDataSpace;
  activateExistingSpace?: typeof activateExistingAccountDataSpace;
}

type GateState =
  | { readonly status: "loading"; readonly message: string }
  | { readonly status: "ready" }
  | {
      readonly status: "choice";
      readonly accountFingerprint: string;
      readonly hasExistingSpace: boolean;
      readonly existingSpaceLinkedToDevice: boolean;
      readonly canAttachCurrentData: boolean;
    }
  | { readonly status: "working"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

function accountFingerprintFromSnapshot(
  snapshot: SyncPrototypeSnapshot,
): string | undefined {
  return createSyncPrototypeAccountFingerprint(
    snapshot.account.userId ?? snapshot.account.email,
  )?.toLowerCase();
}

function defaultReload(): void {
  window.location.reload();
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "L’espace de données n’a pas pu être préparé.";
}

export function DataSpaceAccountGate({
  children,
  client: clientOverride,
  currentSpace = activeDataSpace,
  storage,
  reload = defaultReload,
  prepareGuestImport,
  applyGuestImport,
  createEmptySpace = createEmptyAccountDataSpace,
  activateExistingSpace = activateExistingAccountDataSpace,
}: DataSpaceAccountGateProps) {
  const runtimeClient = useMemo<SyncPrototypeClient | null>(() => {
    if (clientOverride !== undefined) return clientOverride;

    const { config } = readSyncPrototypeConfigSafely();
    if (!config.enabled) return null;

    try {
      return getSyncPrototypeClient();
    } catch {
      return null;
    }
  }, [clientOverride]);

  const [state, setState] = useState<GateState>(() =>
    runtimeClient
      ? { status: "loading", message: "Vérification du compte connecté" }
      : { status: "ready" },
  );

  const [cloudAnalysisStatus, setCloudAnalysisStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");

  useEffect(() => {
    if (!runtimeClient) {
      setState({ status: "ready" });
      return;
    }

    let disposed = false;
    let initialized = false;
    let switchingToGuest = false;
    let cloudCheckFingerprint: string | undefined;

    const reconcile = () => {
      if (disposed || !initialized || switchingToGuest) return;

      const snapshot = runtimeClient.getSnapshot();
      if (snapshot.account.isLoading) {
        setState({
          status: "loading",
          message: "Vérification du compte connecté",
        });
        return;
      }

      if (!snapshot.account.isLoggedIn) {
        cloudCheckFingerprint = undefined;
        setCloudAnalysisStatus("idle");
        if (currentSpace.kind === "account") {
          switchingToGuest = true;
          setState({
            status: "working",
            message: "Retour à l’espace local invité",
          });
          activateGuestDataSpace(storage);
          reload();
          return;
        }

        setState({ status: "ready" });
        return;
      }

      const accountFingerprint = accountFingerprintFromSnapshot(snapshot);
      if (!accountFingerprint) {
        setState({
          status: "error",
          message:
            "Le compte connecté ne fournit pas d’identifiant local exploitable. Déconnecte-toi puis réessaie.",
        });
        return;
      }

      if (
        currentSpace.kind === "account" &&
        currentSpace.accountFingerprint === accountFingerprint
      ) {
        setState({ status: "ready" });
        return;
      }

      const existingSpace = findAccountDataSpace(accountFingerprint, storage);
      if (existingSpace) {
        setCloudAnalysisStatus("ready");
      } else if (cloudCheckFingerprint !== accountFingerprint) {
        cloudCheckFingerprint = accountFingerprint;
        setCloudAnalysisStatus("loading");
      }

      setState({
        status: "choice",
        accountFingerprint,
        hasExistingSpace: Boolean(existingSpace),
        existingSpaceLinkedToDevice:
          existingSpace?.linkedToCurrentDevice !== false,
        canAttachCurrentData: currentSpace.kind === "guest",
      });
    };

    const unsubscribe = runtimeClient.subscribe(reconcile);

    void runtimeClient
      .initialize()
      .then(() => {
        if (disposed) return;
        initialized = true;
        reconcile();
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setState({
          status: "error",
          message: errorMessage(error),
        });
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [currentSpace, reload, runtimeClient, storage]);

  const runAction = async (
    message: string,
    action: () => Promise<unknown> | unknown,
  ) => {
    setState({ status: "working", message });
    try {
      await action();
      reload();
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  };

  if (state.status === "ready") return children;

  if (state.status === "loading" || state.status === "working") {
    return <AppSplashScreen message={state.message} />;
  }

  if (state.status === "error") {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-10">
        <div className="w-full max-w-xl">
          <InlineNotice tone="error" title="Espace de données indisponible">
            {state.message}
          </InlineNotice>
          {runtimeClient ? (
            <Button
              className="mt-4 w-full"
              variant="secondary"
              onClick={() => void runtimeClient.logout()}
            >
              <LogOut aria-hidden="true" className="size-4" />
              Se déconnecter du compte
            </Button>
          ) : null}
        </div>
      </main>
    );
  }

  const serviceOptions = storage ? { storage } : {};

  const openExisting = () =>
    runAction("Ouverture de l’espace du compte", () =>
      activateExistingSpace(state.accountFingerprint, serviceOptions),
    );

  const createEmpty = () =>
    runAction("Création d’un espace vide et isolé", () =>
      createEmptySpace(state.accountFingerprint, serviceOptions),
    );

  return (
    <main className="fixed inset-0 h-[100dvh] overflow-hidden bg-slate-50 px-4 py-3 dark:bg-slate-950 sm:grid sm:place-items-center sm:px-6 sm:py-5">
      <Card className="mx-auto grid h-full w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-4 sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:p-6">
        <header className="flex items-start gap-3 pb-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <ShieldCheck aria-hidden="true" className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Données du compte
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Comment souhaitez-vous commencer ?
            </h1>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Reprenez les données du compte ou démarrez avec un profil vierge.
            </p>
          </div>
        </header>

        <div className="grid min-h-0 content-start gap-2 overflow-hidden">
          {state.hasExistingSpace ? (
            <>
              <section className="rounded-2xl border border-sky-200 p-3 dark:border-sky-900">
                <div className="flex items-start gap-3">
                  <Cloud aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300" />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      Reprendre mes données
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                      {state.existingSpaceLinkedToDevice
                        ? "Ouvrez le profil déjà associé à ce compte sur cet appareil."
                        : "Réassociez cet appareil au profil local conservé pour ce compte."}
                    </p>
                  </div>
                </div>
                <Button className="mt-3 w-full" onClick={() => void openExisting()}>
                  {state.existingSpaceLinkedToDevice
                    ? "Reprendre ce profil"
                    : "Réassocier et reprendre"}
                </Button>
              </section>

              {state.canAttachCurrentData ? (
                <Suspense
                  fallback={
                    <InlineNotice tone="info" title="Préparation de l’import">
                      Analyse des données locales en cours.
                    </InlineNotice>
                  }
                >
                  <GuestDataImportPanel
                    accountFingerprint={state.accountFingerprint}
                    compact
                    reload={reload}
                    {...(prepareGuestImport
                      ? {
                          prepareImport: (fingerprint: string) =>
                            prepareGuestImport(fingerprint, serviceOptions),
                        }
                      : {})}
                    {...(applyGuestImport
                      ? {
                          applyImport: (prepared: PreparedGuestDataImport) =>
                            applyGuestImport(prepared, serviceOptions),
                        }
                      : {})}
                  />
                </Suspense>
              ) : null}
            </>
          ) : (
            <>
              <Suspense
                fallback={
                  <InlineNotice tone="info" title="Recherche des données">
                    Vérification du compte en cours.
                  </InlineNotice>
                }
              >
                <CloudAccountRestorePanel
                  accountFingerprint={state.accountFingerprint}
                  client={runtimeClient!}
                  autoAnalyze
                  compact
                  reload={reload}
                  onAnalysisChange={(status) => setCloudAnalysisStatus(status)}
                />
              </Suspense>

              {state.canAttachCurrentData ? (
                <Suspense
                  fallback={
                    <InlineNotice tone="info" title="Préparation de l’import">
                      Analyse des données locales en cours.
                    </InlineNotice>
                  }
                >
                  <GuestDataImportPanel
                    accountFingerprint={state.accountFingerprint}
                    compact
                    reload={reload}
                    {...(prepareGuestImport
                      ? {
                          prepareImport: (fingerprint: string) =>
                            prepareGuestImport(fingerprint, serviceOptions),
                        }
                      : {})}
                    {...(applyGuestImport
                      ? {
                          applyImport: (prepared: PreparedGuestDataImport) =>
                            applyGuestImport(prepared, serviceOptions),
                        }
                      : {})}
                  />
                </Suspense>
              ) : null}

              <section className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  Créer un nouveau profil
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  Commencez avec un espace vierge. Les autres données ne sont pas supprimées.
                </p>
                <Button
                  className="mt-3 w-full"
                  variant="secondary"
                  disabled={cloudAnalysisStatus === "loading"}
                  onClick={() => void createEmpty()}
                >
                  {cloudAnalysisStatus === "loading"
                    ? "Vérification du compte…"
                    : "Créer un nouveau profil"}
                </Button>
              </section>
            </>
          )}
        </div>

        <Button
          className="mt-3 w-full shrink-0"
          variant="ghost"
          onClick={() => void runtimeClient?.logout()}
        >
          <LogOut aria-hidden="true" className="size-4" />
          Utiliser un autre compte
        </Button>
      </Card>
    </main>
  );
}
