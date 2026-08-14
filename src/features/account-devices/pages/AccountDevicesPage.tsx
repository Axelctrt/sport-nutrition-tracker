import {
  Cloud,
  DatabaseBackup,
  Laptop,
  Link2Off,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { routePaths } from "@/app/routePaths";
import {
  cloudAccountStatusLabel,
  cloudLicenseLabel,
  resolveCloudAccountAccess,
  type CloudAccountAccessSnapshot,
} from "@/application/account/cloudAccountAccess";
import { createAndDownloadSafetyBackup } from "@/application/backup/safetyBackupService";
import {
  readSyncOperationHistory,
  resolveLastSuccessfulSyncAt,
  summarizeSyncOperationHistory,
} from "@/application/sync/syncOperationHistory";
import { CloudAccountRestorePanel } from "@/features/account-devices/components/CloudAccountRestorePanel";
import { GuestDataImportPanel } from "@/features/account-devices/components/GuestDataImportPanel";
import type { DataSpaceDescriptor } from "@/domain/data-spaces/dataSpace";
import {
  deleteCloudAndLocalAccountData,
  deleteLocalAccountData,
  detachCurrentDeviceFromAccount,
  disconnectAccount,
} from "@/infrastructure/data-spaces/accountDeviceManagementService";
import type { DataSpaceStorage } from "@/infrastructure/data-spaces/dataSpaceRegistry";
import { activeDataSpace } from "@/infrastructure/database/database";
import {
  getOrCreateCurrentDevice,
  type CurrentDeviceDescriptor,
} from "@/infrastructure/devices/currentDeviceRegistry";
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from "@/infrastructure/sync-prototype/syncPrototypeClient";
import { readSyncPrototypeConfigSafely } from "@/infrastructure/sync-prototype/syncPrototypeConfig";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { ConfirmationDialog } from "@/shared/ui/ConfirmationDialog";
import { InlineNotice } from "@/shared/ui/InlineNotice";
import { PageSkeleton } from "@/shared/ui/PageSkeleton";
import { useActionToast } from "@/shared/toast/useActionToast";

interface AccountDevicesPageProps {
  client?: SyncPrototypeClient | null;
  currentSpace?: DataSpaceDescriptor;
  currentDevice?: CurrentDeviceDescriptor;
  storage?: DataSpaceStorage;
  reload?: () => void;
  disconnect?: typeof disconnectAccount;
  detachDevice?: typeof detachCurrentDeviceFromAccount;
  deleteLocalData?: typeof deleteLocalAccountData;
  deleteCloudAndLocalData?: typeof deleteCloudAndLocalAccountData;
  createSafetyBackup?: typeof createAndDownloadSafetyBackup;
}

type PendingAction =
  | "disconnect"
  | "detach"
  | "delete"
  | "deleteRemote"
  | undefined;

type Feedback = {
  readonly tone: "success" | "error" | "info";
  readonly title: string;
  readonly message: string;
};

function defaultReload(): void {
  window.location.reload();
}

function formatDateTime(value: string | undefined): string {
  if (!value) return "Jamais";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function syncStatusLabel(
  snapshot: SyncPrototypeSnapshot,
  access: CloudAccountAccessSnapshot,
): string {
  if (!access.isOperational) return cloudAccountStatusLabel(access);
  if (snapshot.sync.status === "error" || snapshot.sync.phase === "error") {
    return "Erreur";
  }
  if (snapshot.sync.phase === "in-sync") return "À jour";
  if (snapshot.sync.phase === "pushing") return "Envoi en cours";
  if (snapshot.sync.phase === "pulling") return "Réception en cours";
  return "Connexion en cours";
}

function pendingChangesLabel(snapshot: SyncPrototypeSnapshot): string {
  if (!snapshot.account.isLoggedIn) return "Synchronisation arrêtée";
  if (snapshot.sync.phase === "in-sync") return "0";
  if (snapshot.sync.phase === "pushing" || snapshot.sync.phase === "pulling") {
    return "En cours";
  }
  return "À vérifier";
}

function accountLabel(snapshot: SyncPrototypeSnapshot): string {
  return (
    snapshot.account.email ??
    snapshot.account.displayName ??
    snapshot.diagnostics.accountFingerprint ??
    "Aucun compte connecté"
  );
}

export function AccountDevicesPage({
  client: clientOverride,
  currentSpace = activeDataSpace,
  currentDevice: currentDeviceOverride,
  storage,
  reload = defaultReload,
  disconnect = disconnectAccount,
  detachDevice = detachCurrentDeviceFromAccount,
  deleteLocalData = deleteLocalAccountData,
  deleteCloudAndLocalData = deleteCloudAndLocalAccountData,
  createSafetyBackup = createAndDownloadSafetyBackup,
}: AccountDevicesPageProps = {}) {
  const actionToast = useActionToast();
  const safeConfig = useMemo(() => readSyncPrototypeConfigSafely(), []);
  const runtimeClient = useMemo<SyncPrototypeClient | null>(() => {
    if (clientOverride !== undefined) return clientOverride;
    if (!safeConfig.config.enabled) return null;

    try {
      return getSyncPrototypeClient();
    } catch {
      return null;
    }
  }, [clientOverride, safeConfig.config.enabled]);

  const [snapshot, setSnapshot] = useState<SyncPrototypeSnapshot | undefined>(
    () => runtimeClient?.getSnapshot(),
  );
  const [isInitializing, setIsInitializing] = useState(Boolean(runtimeClient));
  const [isOnline, setIsOnline] = useState(
    () => typeof navigator === "undefined" || navigator.onLine !== false,
  );
  const [feedback, setFeedback] = useState<Feedback>();
  const [pendingAction, setPendingAction] = useState<PendingAction>();
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [detachDialogOpen, setDetachDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [remoteDeleteDialogOpen, setRemoteDeleteDialogOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [remoteDeleteConfirmation, setRemoteDeleteConfirmation] = useState("");
  const [currentDevice] = useState<CurrentDeviceDescriptor>(
    () => currentDeviceOverride ?? getOrCreateCurrentDevice(),
  );

  useEffect(() => {
    if (!runtimeClient) {
      setIsInitializing(false);
      return;
    }

    let disposed = false;
    const refresh = () => {
      if (!disposed) setSnapshot(runtimeClient.getSnapshot());
    };
    const unsubscribe = runtimeClient.subscribe(refresh);

    void runtimeClient
      .initialize()
      .then(() => {
        if (disposed) return;
        refresh();
        setIsInitializing(false);
      })
      .catch((error: unknown) => {
        if (disposed) return;
        setFeedback({
          tone: "error",
          title: "Compte indisponible",
          message:
            error instanceof Error
              ? error.message
              : "Le compte de synchronisation n’a pas pu être chargé.",
        });
        setIsInitializing(false);
      });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [runtimeClient]);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine !== false);
    window.addEventListener("online", updateOnlineState);
    window.addEventListener("offline", updateOnlineState);
    return () => {
      window.removeEventListener("online", updateOnlineState);
      window.removeEventListener("offline", updateOnlineState);
    };
  }, []);

  const runAction = async (
    action: Exclude<PendingAction, undefined>,
    operation: () => Promise<unknown>,
  ) => {
    setPendingAction(action);
    setFeedback(undefined);
    try {
      await operation();
      const successMessages = {
        disconnect: {
          title: 'Compte déconnecté',
          description: 'La synchronisation est arrêtée et les données locales restent accessibles.',
        },
        detach: {
          title: 'Appareil désassocié',
          description: 'L’espace local est conservé sur cet appareil.',
        },
        delete: {
          title: 'Données locales supprimées',
          description: 'Les données cloud de ce compte restent intactes.',
        },
        deleteRemote: {
          title: 'Données du compte supprimées',
          description: 'Les données cloud, sociales et locales ont été effacées.',
        },
      } as const;
      const success = successMessages[action];
      actionToast.successAfterReload({
        key: `account-device-${action}`,
        title: success.title,
        description: success.description,
      });
      reload();
    } catch (error) {
      const fallback = "L’action demandée n’a pas pu être terminée.";
      setFeedback({
        tone: "error",
        title: "Action interrompue",
        message: error instanceof Error ? error.message : fallback,
      });
      setPendingAction(undefined);
    }
  };

  if (isInitializing) {
    return <PageSkeleton variant="detail" />;
  }

  if (!runtimeClient || !snapshot) {
    return (
      <section className="mx-auto w-full max-w-4xl space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
            Compte
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Compte et appareils
          </h1>
        </div>
        <InlineNotice tone="error" title="Compte cloud indisponible">
          {safeConfig.errorMessage ??
            "Le service de compte ne peut pas être initialisé. Les données locales restent accessibles et exportables."}
        </InlineNotice>
        <Link
          to={routePaths.backup}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 py-2 font-semibold text-white"
        >
          <DatabaseBackup aria-hidden="true" className="size-4" />
          Exporter les données locales
        </Link>
      </section>
    );
  }

  const loggedIn = snapshot.account.isLoggedIn;
  const cloudAccess = runtimeClient.getCloudAccessState?.()
    ?? resolveCloudAccountAccess({
      ...snapshot.account,
      hasAccessToken:
        snapshot.account.hasAccessToken ?? snapshot.account.isLoggedIn,
    }, { isOnline });
  const accountKey =
    snapshot.diagnostics.accountFingerprint?.toLowerCase();
  const operationSummary = summarizeSyncOperationHistory(
    readSyncOperationHistory(accountKey),
  );
  const lastSuccessfulSyncAt = resolveLastSuccessfulSyncAt(
    operationSummary.lastSuccessfulSync?.completedAt,
    snapshot.diagnostics.lastSyncCompletedAt,
  );
  const cloudDatabaseLabel = safeConfig.config.enabled
    ? new URL(safeConfig.config.databaseUrl).hostname
    : "Non configuré";
  const accountSpaceActive = currentSpace.kind === "account";
  const actionPending = pendingAction !== undefined;
  const managementOptions = storage
    ? { space: currentSpace, storage }
    : { space: currentSpace };

  return (
    <section className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">
          Confidentialité et accès
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Compte et appareils
        </h1>
        <p className="mt-2 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          Vérifie le compte actif, l’état des échanges et les données conservées
          sur cet appareil. Chaque action ci-dessous possède un effet distinct.
        </p>
      </div>

      {!loggedIn ? (
        <InlineNotice tone="info" title="Aucun compte connecté">
          Les données de l’espace local actif restent sur cet appareil. Connecte
          un compte pour reprendre la synchronisation ou utiliser un autre
          compte.
        </InlineNotice>
      ) : null}

      {loggedIn && !cloudAccess.isOperational && isOnline ? (
        <InlineNotice tone="info" title="Compte connecté, accès cloud indisponible">
          {cloudAccess.message}
        </InlineNotice>
      ) : null}

      {feedback ? (
        <InlineNotice tone={feedback.tone} title={feedback.title}>
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <Cloud
              aria-hidden="true"
              className="mt-0.5 size-6 text-brand-700 dark:text-brand-300"
            />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Compte de synchronisation
              </h2>
              <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
                {accountLabel(snapshot)}
              </p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                État
              </dt>
              <dd className="mt-1 font-bold text-slate-950 dark:text-white">
                {syncStatusLabel(snapshot, cloudAccess)}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Modifications en attente
              </dt>
              <dd className="mt-1 font-bold text-slate-950 dark:text-white">
                {pendingChangesLabel(snapshot)}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Service cloud
              </dt>
              <dd className="mt-1 break-all font-bold text-slate-950 dark:text-white">
                {cloudDatabaseLabel}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Licence
              </dt>
              <dd className="mt-1 font-bold text-slate-950 dark:text-white">
                {cloudLicenseLabel(snapshot.account.license)}
              </dd>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Dernier échange réussi
              </dt>
              <dd className="mt-1 font-bold text-slate-950 dark:text-white">
                {formatDateTime(lastSuccessfulSyncAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link
              to={routePaths.syncPrototype}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2 text-sm font-semibold text-white"
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Connexion et changement de compte
            </Link>
            <Link
              to={routePaths.backup}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <DatabaseBackup aria-hidden="true" className="size-4" />
              Exporter les données
            </Link>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-start gap-3">
            <Laptop
              aria-hidden="true"
              className="mt-0.5 size-6 text-brand-700 dark:text-brand-300"
            />
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Appareil actuel
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {currentDevice.label}
              </p>
            </div>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
              <dt className="text-slate-600 dark:text-slate-300">
                Identifiant local
              </dt>
              <dd className="font-mono font-semibold text-slate-950 dark:text-white">
                …{currentDevice.id.slice(-8).toUpperCase()}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3 dark:border-slate-800">
              <dt className="text-slate-600 dark:text-slate-300">
                Espace actif
              </dt>
              <dd className="text-right font-semibold text-slate-950 dark:text-white">
                {currentSpace.label}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-slate-600 dark:text-slate-300">
                Dernière activité locale
              </dt>
              <dd className="text-right font-semibold text-slate-950 dark:text-white">
                {formatDateTime(currentDevice.lastSeenAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-5 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck
                aria-hidden="true"
                className="size-5 text-emerald-700 dark:text-emerald-300"
              />
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Appareils connus
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Cette installation connaît actuellement cet appareil. La liste et
              la révocation des appareils distants seront activées lorsque le
              service cloud exposera ces métadonnées.
            </p>
          </div>
        </Card>
      </div>

      {loggedIn &&
      currentSpace.kind === "account" &&
      currentSpace.accountFingerprint ? (
        <>
          <Card className="p-5">
            <CloudAccountRestorePanel
              accountFingerprint={currentSpace.accountFingerprint}
              client={runtimeClient}
              reload={reload}
            />
          </Card>
          <Card className="p-5">
            <GuestDataImportPanel
              accountFingerprint={currentSpace.accountFingerprint}
              reload={reload}
            />
          </Card>
        </>
      ) : null}

      <Card className="p-5">
        <h2 className="text-lg font-bold text-slate-950 dark:text-white">
          Actions du compte sur cet appareil
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
            <LogOut
              aria-hidden="true"
              className="size-5 text-slate-700 dark:text-slate-200"
            />
            <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">
              Déconnecter le compte
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Arrête la synchronisation. L’espace et les données locales du
              compte restent connus sur cet appareil.
            </p>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              disabled={!loggedIn || actionPending}
              onClick={() => setDisconnectDialogOpen(true)}
            >
              Déconnecter
            </Button>
          </div>

          <div className="rounded-2xl border border-amber-200 p-4 dark:border-amber-900">
            <Link2Off
              aria-hidden="true"
              className="size-5 text-amber-700 dark:text-amber-300"
            />
            <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">
              Utiliser le mode invité
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Déconnecte le compte et ouvre l’espace invité séparé. Les données
              locales restent conservées dans l’espace du compte pour une reprise ultérieure.
            </p>
            <Button
              className="mt-4 w-full"
              variant="secondary"
              disabled={!loggedIn || !accountSpaceActive || actionPending}
              onClick={() => setDetachDialogOpen(true)}
            >
              Utiliser le mode invité
            </Button>
          </div>

          <div className="rounded-2xl border border-red-200 p-4 dark:border-red-900">
            <Trash2
              aria-hidden="true"
              className="size-5 text-red-700 dark:text-red-300"
            />
            <h3 className="mt-3 font-semibold text-slate-950 dark:text-white">
              Supprimer les données locales
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Efface uniquement la base locale de ce compte. Les données cloud
              et les autres appareils ne sont pas supprimés.
            </p>
            <label className="mt-3 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Saisis SUPPRIMER
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                autoComplete="off"
              />
            </label>
            <Button
              className="mt-3 w-full"
              variant="danger"
              disabled={
                deleteConfirmation !== "SUPPRIMER" ||
                !accountSpaceActive ||
                actionPending
              }
              onClick={() => setDeleteDialogOpen(true)}
            >
              Supprimer sur cet appareil
            </Button>
          </div>
        </div>
      </Card>

      <Card className="border-red-300 p-5 dark:border-red-900">
        <div className="flex items-start gap-3">
          <Trash2
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-red-700 dark:text-red-300"
          />
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Effacer les données du compte
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Supprime les données synchronisées, le profil social et les relations
              associées, puis efface cet espace sur l’appareil. Une sauvegarde JSON
              est téléchargée avant toute suppression.
            </p>
          </div>
        </div>
        <label className="mt-4 block max-w-md text-sm font-semibold text-red-950 dark:text-red-100">
          Saisis EFFACER LE COMPTE
          <input
            type="text"
            value={remoteDeleteConfirmation}
            onChange={(event) => setRemoteDeleteConfirmation(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-red-300 bg-white px-3 text-slate-950 dark:border-red-800 dark:bg-slate-950 dark:text-white"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <Button
          className="mt-4 w-full sm:w-auto"
          variant="danger"
          disabled={
            remoteDeleteConfirmation !== "EFFACER LE COMPTE"
            || !loggedIn
            || !accountSpaceActive
            || actionPending
          }
          onClick={() => setRemoteDeleteDialogOpen(true)}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Effacer partout
        </Button>
      </Card>

      <ConfirmationDialog
        open={disconnectDialogOpen}
        title="Déconnecter le compte ?"
        description="La synchronisation s’arrête, mais les données locales de ce compte restent présentes sur cet appareil."
        confirmLabel="Déconnecter"
        isPending={pendingAction === "disconnect"}
        onCancel={() => setDisconnectDialogOpen(false)}
        onConfirm={() => {
          setDisconnectDialogOpen(false);
          void runAction("disconnect", () => disconnect(runtimeClient));
        }}
      />

      <ConfirmationDialog
        open={detachDialogOpen}
        title="Utiliser le mode invité sur cet appareil ?"
        description="Le compte sera déconnecté et SportPilot ouvrira un espace invité séparé. L’espace local du compte et ses données ne seront ni supprimés ni déplacés."
        confirmLabel="Passer en mode invité"
        isPending={pendingAction === "detach"}
        onCancel={() => setDetachDialogOpen(false)}
        onConfirm={() => {
          setDetachDialogOpen(false);
          void runAction("detach", () =>
            detachDevice(runtimeClient, managementOptions),
          );
        }}
      />

      <ConfirmationDialog
        open={deleteDialogOpen}
        title="Supprimer les données locales de ce compte ?"
        description="Cette opération efface la base locale de ce compte sur cet appareil uniquement. Elle ne supprime pas les données cloud."
        confirmLabel="Supprimer définitivement en local"
        tone="danger"
        isPending={pendingAction === "delete"}
        onCancel={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          setDeleteDialogOpen(false);
          void runAction("delete", () =>
            deleteLocalData(runtimeClient, managementOptions),
          );
        }}
      />

      <ConfirmationDialog
        open={remoteDeleteDialogOpen}
        title="Effacer les données cloud et locales ?"
        description="La sauvegarde sera créée d’abord. SportPilot vérifiera ensuite la suppression distante avant d’effacer cet espace local. Cette opération est irréversible sans la sauvegarde JSON."
        confirmLabel="Créer la sauvegarde et tout effacer"
        tone="danger"
        isPending={pendingAction === "deleteRemote"}
        onCancel={() => setRemoteDeleteDialogOpen(false)}
        onConfirm={() => {
          setRemoteDeleteDialogOpen(false);
          void runAction("deleteRemote", async () => {
            await createSafetyBackup("before-cloud-account-reset");
            await deleteCloudAndLocalData(runtimeClient, managementOptions);
          });
        }}
      />
    </section>
  );
}
