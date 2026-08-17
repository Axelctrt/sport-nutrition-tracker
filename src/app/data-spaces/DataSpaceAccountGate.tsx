import { Cloud, LogOut, ShieldCheck } from "lucide-react";
import { lazy, Suspense, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import type { DataSpaceDescriptor } from "@/domain/data-spaces/dataSpace";
import { PROFILE_ONBOARDING_STEP_IDS } from "@/features/onboarding/profile/profileOnboardingSteps";
import { saveProfileOnboardingDraft } from "@/features/onboarding/storage/profileOnboardingDraft";
import { DEFAULT_PROFILE_FORM_VALUES } from "@/features/profile/utils/defaultProfileFormValues";
import { type DataSpaceStorage } from "@/infrastructure/data-spaces/dataSpaceRegistry";
import {
  inspectCloudAccountRestoreTarget,
  type CloudAccountRestoreServiceOptions,
  type CloudAccountRestoreTargetInspection,
} from "@/infrastructure/data-spaces/cloudAccountRestoreService";
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
  inspectRestoreTarget?: (
    accountFingerprint: string,
    options?: CloudAccountRestoreServiceOptions,
  ) => Promise<CloudAccountRestoreTargetInspection>;
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
      readonly canCreateEmpty: boolean;
    }
  | { readonly status: "working"; readonly message: string }
  | { readonly status: "error"; readonly message: string };

type AccountRecoveryState =
  | { readonly status: "running"; readonly promise: Promise<void> }
  | { readonly status: "resolved" }
  | { readonly status: "error" };

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

function isOnboardingRoute(): boolean {
  return typeof window !== 'undefined'
    && window.location.hash.startsWith('#/onboarding');
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
  inspectRestoreTarget = inspectCloudAccountRestoreTarget,
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
  const [onboardingRouteActive, setOnboardingRouteActive] = useState(isOnboardingRoute);
  const [state, setState] = useState<GateState>(() =>
    onboardingRouteActive || !runtimeClient
      ? { status: "ready" }
      : { status: "loading", message: "Vérification du compte connecté" },
  );
  const recoveryByFingerprintRef = useRef(
    new Map<string, AccountRecoveryState>(),
  );
  const activeAccountFingerprintRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const syncRoute = () => setOnboardingRouteActive(isOnboardingRoute());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  useEffect(() => {
    if (onboardingRouteActive) {
      setState({ status: "ready" });
      return;
    }

    if (!runtimeClient) {
      setState({ status: "ready" });
      return;
    }

    let disposed = false;
    let initialized = false;

    const serviceOptions = storage ? { storage } : {};

    const showLocalAccess = (
      accountFingerprint: string,
      inspection: CloudAccountRestoreTargetInspection,
      cloudConfirmedEmpty: boolean,
    ) => {
      if (disposed) return;

      if (
        currentSpace.kind === "account" &&
        currentSpace.accountFingerprint === accountFingerprint
      ) {
        setState({ status: "ready" });
        return;
      }

      const existingSpace = findAccountDataSpace(accountFingerprint, storage);
      setState({
        status: "choice",
        accountFingerprint,
        hasExistingSpace: Boolean(existingSpace),
        existingSpaceLinkedToDevice:
          existingSpace?.linkedToCurrentDevice !== false,
        canAttachCurrentData: currentSpace.kind === "guest",
        canCreateEmpty:
          cloudConfirmedEmpty && inspection.localState === "missing",
      });
    };

    const startRecovery = (accountFingerprint: string) => {
      if (recoveryByFingerprintRef.current.has(accountFingerprint)) return;

      const isStale = () =>
        disposed || activeAccountFingerprintRef.current !== accountFingerprint;

      const recoveryPromise = (async () => {
        setState({
          status: "loading",
          message: "Vérification de l’espace local du compte",
        });

        const initialTarget = await inspectRestoreTarget(
          accountFingerprint,
          serviceOptions,
        );
        if (isStale()) return;

        if (initialTarget.localState === "non-empty") {
          showLocalAccess(accountFingerprint, initialTarget, false);
          recoveryByFingerprintRef.current.set(accountFingerprint, {
            status: "resolved",
          });
          return;
        }

        if (!runtimeClient.prepareCloudRestore || !runtimeClient.applyCloudRestore) {
          throw new Error(
            "La récupération automatique du compte n’est pas disponible dans cette version.",
          );
        }

        setState({
          status: "loading",
          message: "Recherche des données du compte",
        });
        const prepared = await runtimeClient.prepareCloudRestore(accountFingerprint);
        if (isStale()) return;

        if (prepared.preview.hasCloudData && prepared.preview.canRestore) {
          setState({
            status: "working",
            message: "Récupération des données du compte",
          });
          await runtimeClient.applyCloudRestore(prepared);
          if (isStale()) return;
          recoveryByFingerprintRef.current.set(accountFingerprint, {
            status: "resolved",
          });
          reload();
          return;
        }

        if (!prepared.preview.hasCloudData) {
          showLocalAccess(accountFingerprint, initialTarget, true);
          recoveryByFingerprintRef.current.set(accountFingerprint, {
            status: "resolved",
          });
          return;
        }

        const latestTarget = await inspectRestoreTarget(
          accountFingerprint,
          serviceOptions,
        );
        if (isStale()) return;
        if (latestTarget.localState === "non-empty") {
          showLocalAccess(accountFingerprint, latestTarget, false);
          recoveryByFingerprintRef.current.set(accountFingerprint, {
            status: "resolved",
          });
          return;
        }

        throw new Error(
          "Les données du compte existent mais la restauration initiale n’est plus sûre. Relance l’application pour réessayer.",
        );
      })().catch(async (error: unknown) => {
        if (isStale()) return;

        try {
          const latestTarget = await inspectRestoreTarget(
            accountFingerprint,
            serviceOptions,
          );
          if (disposed) return;
          if (latestTarget.localState === "non-empty") {
            showLocalAccess(accountFingerprint, latestTarget, false);
            recoveryByFingerprintRef.current.set(accountFingerprint, {
              status: "resolved",
            });
            return;
          }
        } catch {
          // L’erreur de récupération initiale reste prioritaire.
        }

        recoveryByFingerprintRef.current.set(accountFingerprint, {
          status: "error",
        });
        setState({ status: "error", message: errorMessage(error) });
      });

      recoveryByFingerprintRef.current.set(accountFingerprint, {
        status: "running",
        promise: recoveryPromise,
      });
      void recoveryPromise.finally(() => {
        const current = recoveryByFingerprintRef.current.get(accountFingerprint);
        if (current?.status === "running" && current.promise === recoveryPromise) {
          recoveryByFingerprintRef.current.delete(accountFingerprint);
        }
      });
    };

    const reconcile = () => {
      if (disposed || !initialized) return;

      const snapshot = runtimeClient.getSnapshot();
      if (snapshot.account.isLoading) {
        if (currentSpace.kind === "account") {
          const currentFingerprint = currentSpace.accountFingerprint;
          if (!currentFingerprint) {
            setState({ status: "ready" });
            return;
          }
          if (!recoveryByFingerprintRef.current.has(currentFingerprint)) {
            const localInspectionPromise = inspectRestoreTarget(
              currentFingerprint,
              serviceOptions,
            )
              .then((inspection) => {
                if (disposed) return;
                if (inspection.localState === "non-empty") {
                  showLocalAccess(currentFingerprint, inspection, false);
                  recoveryByFingerprintRef.current.set(currentFingerprint, {
                    status: "resolved",
                  });
                  return;
                }
                recoveryByFingerprintRef.current.delete(currentFingerprint);
                setState({
                  status: "loading",
                  message: "Vérification du compte connecté",
                });
              })
              .catch(() => {
                if (disposed) return;
                recoveryByFingerprintRef.current.delete(currentFingerprint);
                setState({
                  status: "loading",
                  message: "Vérification du compte connecté",
                });
              });
            recoveryByFingerprintRef.current.set(currentFingerprint, {
              status: "running",
              promise: localInspectionPromise,
            });
          }
        } else {
          setState({
            status: "loading",
            message: "Vérification du compte connecté",
          });
        }
        return;
      }

      if (!snapshot.account.isLoggedIn) {
        activeAccountFingerprintRef.current = undefined;
        recoveryByFingerprintRef.current.clear();
        if (currentSpace.kind === "account") {
          setState({ status: "ready" });
          return;
        }

        setState({ status: "ready" });
        return;
      }

      const accountFingerprint = accountFingerprintFromSnapshot(snapshot);
      if (!accountFingerprint) {
        activeAccountFingerprintRef.current = undefined;
        if (currentSpace.kind === "account") {
          setState({ status: "ready" });
        } else {
          setState({
            status: "error",
            message:
              "Le compte connecté ne fournit pas d’identifiant local exploitable. Déconnecte-toi puis réessaie.",
          });
        }
        return;
      }

      activeAccountFingerprintRef.current = accountFingerprint;

      startRecovery(accountFingerprint);
    };

    const unsubscribe = runtimeClient.subscribe(reconcile);

    void runtimeClient
      .initialize()
      .then(() => {
        if (disposed) return;
        initialized = true;
        reconcile();
      })
      .catch(async (error: unknown) => {
        if (disposed) return;
        if (currentSpace.kind === "account") {
          const currentFingerprint = currentSpace.accountFingerprint;
          if (!currentFingerprint) {
            setState({ status: "ready" });
            return;
          }

          try {
            const inspection = await inspectRestoreTarget(
              currentFingerprint,
              serviceOptions,
            );
            if (disposed) return;
            if (inspection.localState === "non-empty") {
              setState({ status: "ready" });
              return;
            }
          } catch {
            // L’erreur d’initialisation cloud reste la cause visible.
          }
        }

        setState({
          status: "error",
          message: errorMessage(error),
        });
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [
    currentSpace,
    inspectRestoreTarget,
    onboardingRouteActive,
    reload,
    runtimeClient,
    storage,
  ]);

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

  const createEmpty = async () => {
    setState({
      status: "working",
      message: "Création d’un espace vide et isolé",
    });

    try {
      const result = await createEmptySpace(
        state.accountFingerprint,
        serviceOptions,
      );
      const draftSaved = saveProfileOnboardingDraft(
        DEFAULT_PROFILE_FORM_VALUES,
        PROFILE_ONBOARDING_STEP_IDS.name,
        result.space.id,
      );

      if (!draftSaved) {
        throw new Error(
          "La reprise du formulaire de profil n’a pas pu être préparée.",
        );
      }

      reload();
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  };

  return (
    <main className="fixed inset-0 h-[100dvh] overflow-hidden bg-slate-50 px-4 py-2 dark:bg-slate-950 sm:grid sm:place-items-center sm:px-6 sm:py-4">
      <Card className="mx-auto grid h-full w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-3 sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:p-5">
        <header className="flex items-start gap-2.5 pb-2">
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Données du compte
            </p>
            <h1 className="mt-0.5 text-xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-2xl">
              Comment souhaitez-vous commencer ?
            </h1>
          </div>
        </header>

        <div className="grid min-h-0 content-start gap-1.5 overflow-hidden">
          {state.hasExistingSpace ? (
            <>
              <section className="rounded-2xl border border-sky-200 p-2.5 dark:border-sky-900">
                <div className="flex items-start gap-3">
                  <Cloud aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-sky-700 dark:text-sky-300" />
                  <div className="min-w-0">
                    <h2 className="font-semibold text-slate-950 dark:text-white">
                      Reprendre mes données
                    </h2>
                    <p className="mt-0.5 text-xs leading-4 text-slate-600 dark:text-slate-300">
                      {state.existingSpaceLinkedToDevice
                        ? "Ouvre le profil déjà associé à ce compte sur cet appareil."
                        : "Réassocie cet appareil au profil local conservé pour ce compte."}
                    </p>
                  </div>
                </div>
                <Button className="mt-2 w-full" size="sm" onClick={() => void openExisting()}>
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

              {state.canCreateEmpty ? (
                <section className="rounded-2xl border border-slate-200 p-2.5 dark:border-slate-800">
                  <h2 className="font-semibold text-slate-950 dark:text-white">
                    Créer un nouveau profil
                  </h2>
                  <p className="mt-0.5 text-xs leading-4 text-slate-600 dark:text-slate-300">
                    Commence avec un espace vierge. Les autres données ne sont pas supprimées.
                  </p>
                  <Button
                    className="mt-2 w-full"
                    variant="secondary"
                    size="sm"
                    onClick={() => void createEmpty()}
                  >
                    Créer un nouveau profil
                  </Button>
                </section>
              ) : null}
            </>
          )}
        </div>

        <Button
          className="mt-2 w-full shrink-0"
          size="sm"
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
