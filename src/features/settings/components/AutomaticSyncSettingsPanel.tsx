import { CloudCog, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { EntityChanges } from '@/domain/models/common';
import type {
  AppSettings,
  AutomaticAccountSyncConnectionMode,
} from '@/domain/models/settings';
import { repositories } from '@/infrastructure/repositories/repositories';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfigSafely } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { useActionToast } from '@/shared/toast/useActionToast';

interface NavigatorWithConnection extends Navigator {
  readonly connection?: {
    readonly type?: string;
  };
}

interface AutomaticSyncSettingsPanelProps {
  readonly client?: SyncPrototypeClient | null;
}

const EMPTY_SNAPSHOT: SyncPrototypeSnapshot = {
  account: { isLoggedIn: false, isLoading: false },
  sync: { status: 'not-started', phase: 'initial' },
  weights: { weights: [], deletedCount: 0, isLoading: false },
  diagnostics: createEmptySyncPrototypeDiagnostics(),
};

const subscribeToNothing = (): (() => void) => () => undefined;
const getEmptySnapshot = (): SyncPrototypeSnapshot => EMPTY_SNAPSHOT;

function resolveClient(): SyncPrototypeClient | null {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage || !config.enabled) return null;

  try {
    return getSyncPrototypeClient();
  } catch {
    return null;
  }
}

function currentConnectionType(): string | undefined {
  return (navigator as NavigatorWithConnection).connection?.type;
}

export function AutomaticSyncSettingsPanel({
  client: clientOverride,
}: AutomaticSyncSettingsPanelProps) {
  const actionToast = useActionToast();
  const client = useMemo(
    () => (clientOverride === undefined ? resolveClient() : clientOverride),
    [clientOverride],
  );
  const snapshot = useSyncExternalStore(
    client?.subscribe ?? subscribeToNothing,
    client?.getSnapshot ?? getEmptySnapshot,
    client?.getSnapshot ?? getEmptySnapshot,
  );
  const [settings, setSettings] = useState<AppSettings>();
  const [busy, setBusy] = useState<'toggle' | 'mode'>();
  const [errorMessage, setErrorMessage] = useState<string>();

  useEffect(() => {
    let mounted = true;
    void repositories.settings
      .get()
      .then((value) => {
        if (mounted) setSettings(value);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Le réglage de synchronisation automatique est indisponible.',
        );
      });
    return () => {
      mounted = false;
    };
  }, []);

  const fingerprint = createSyncPrototypeAccountFingerprint(
    snapshot.account.userId ?? snapshot.account.email,
  )?.toLowerCase();
  const authorizedFingerprint =
    settings?.automaticAccountSyncAccountFingerprint?.toLowerCase();
  const accountAuthorized = Boolean(
    settings?.automaticAccountSyncEnabled &&
      fingerprint &&
      fingerprint === authorizedFingerprint,
  );
  const wifiDetectionAvailable = currentConnectionType() !== undefined;

  const updateSettings = async (
    changes: EntityChanges<AppSettings>,
    action: 'toggle' | 'mode',
  ) => {
    setBusy(action);
    setErrorMessage(undefined);
    try {
      const updated = await repositories.settings.update(changes);
      setSettings(updated);
      actionToast.success({
        key: `automatic-sync-${action}`,
        title: action === 'toggle' ? 'Synchronisation automatique mise à jour' : 'Mode réseau mis à jour',
      });
    } catch (error) {
      const fallback = 'Le réglage n’a pas pu être enregistré.';
      setErrorMessage(error instanceof Error ? error.message : fallback);
      actionToast.error({
        key: `automatic-sync-${action}`,
        title: 'Réglage impossible',
        error,
        fallback,
      });
    } finally {
      setBusy(undefined);
    }
  };

  const toggleAutomaticSync = async () => {
    if (!settings) return;
    const enable = !settings.automaticAccountSyncEnabled || !accountAuthorized;
    if (enable && !fingerprint) {
      setErrorMessage(
        'Connecte d’abord le compte à autoriser pour la synchronisation automatique.',
      );
      return;
    }

    await updateSettings(
      enable
        ? {
            automaticAccountSyncEnabled: true,
            automaticAccountSyncAccountFingerprint: fingerprint!,
            automaticWeightSyncEnabled: false,
            automaticWeightSyncAccountFingerprint: undefined,
          }
        : {
            automaticAccountSyncEnabled: false,
            automaticAccountSyncAccountFingerprint: undefined,
          },
      'toggle',
    );
  };

  const updateMode = async (
    mode: AutomaticAccountSyncConnectionMode,
  ) => {
    await updateSettings(
      { automaticAccountSyncConnectionMode: mode },
      'mode',
    );
  };

  if (!client) {
    return (
      <InlineNotice tone="info" title="Automatisation indisponible">
        Active d’abord la configuration cloud de SportPilot. Les actions manuelles restent disponibles.
      </InlineNotice>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CloudCog aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
            <h3 className="font-semibold text-slate-950 dark:text-white">
              Synchronisation automatique
            </h3>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Analyse le compte au démarrage, au retour dans l’application et après le retour du réseau. Une modification locale déjà basée sur un état à jour est synchronisée après un court délai.
          </p>
        </div>
        <span className={`inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold ${
          accountAuthorized
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
        }`}>
          {accountAuthorized ? 'Active sur cet appareil' : 'Mode manuel'}
        </span>
      </div>

      {settings?.automaticAccountSyncEnabled && !accountAuthorized ? (
        <InlineNotice className="mt-4" tone="info" title="Autorisation du compte requise">
          Le compte connecté n’est pas celui précédemment autorisé sur cet appareil. Confirme ce compte avant toute opération automatique.
        </InlineNotice>
      ) : null}

      {settings?.automaticAccountSyncConnectionMode === 'wifi-only' && !wifiDetectionAvailable ? (
        <InlineNotice className="mt-4" tone="info" title="Wi-Fi non détectable">
          Ce navigateur ne permet pas d’identifier le type de connexion. En mode Wi-Fi uniquement, aucune opération automatique ne partira ici ; les actions manuelles restent disponibles.
        </InlineNotice>
      ) : null}

      {errorMessage ? (
        <InlineNotice className="mt-4" tone="error" title="Réglage non enregistré">
          {errorMessage}
        </InlineNotice>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <label className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <input
            type="radio"
            name="automatic-sync-connection"
            value="any-connection"
            checked={settings?.automaticAccountSyncConnectionMode !== 'wifi-only'}
            disabled={!settings || Boolean(busy)}
            onChange={() => void updateMode('any-connection')}
            className="mt-1 size-4"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <Wifi aria-hidden="true" className="size-4" />
              Toute connexion
            </span>
            <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
              Wi-Fi, Ethernet ou réseau mobile lorsque SportPilot est ouvert.
            </span>
          </span>
        </label>

        <label className="flex min-h-16 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
          <input
            type="radio"
            name="automatic-sync-connection"
            value="wifi-only"
            checked={settings?.automaticAccountSyncConnectionMode === 'wifi-only'}
            disabled={!settings || Boolean(busy)}
            onChange={() => void updateMode('wifi-only')}
            className="mt-1 size-4"
          />
          <span>
            <span className="flex items-center gap-2 font-semibold text-slate-950 dark:text-white">
              <WifiOff aria-hidden="true" className="size-4" />
              Wi-Fi uniquement
            </span>
            <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
              Bloque l’automatisation lorsque le navigateur n’annonce pas explicitement une connexion Wi-Fi.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <Button
          onClick={() => void toggleAutomaticSync()}
          disabled={!settings || Boolean(busy) || snapshot.account.isLoading}
          variant={accountAuthorized ? 'dangerGhost' : 'primary'}
        >
          <ShieldCheck aria-hidden="true" className="size-4" />
          {busy === 'toggle'
            ? 'Enregistrement…'
            : accountAuthorized
              ? 'Désactiver sur cet appareil'
              : 'Activer pour ce compte'}
        </Button>
        <p className="text-sm leading-5 text-slate-600 dark:text-slate-300">
          Le centre manuel reste disponible à tout moment. L’ancien automatisme limité aux pesées est désactivé lors de l’activation globale.
        </p>
      </div>
    </section>
  );
}
