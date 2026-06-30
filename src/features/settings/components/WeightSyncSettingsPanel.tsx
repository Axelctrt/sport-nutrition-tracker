import { Cloud, RefreshCw, Unplug } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import {
  getWeightSyncIntegration,
  type WeightSyncIntegrationStatus,
} from '@/infrastructure/sync-prototype/weightSyncIntegration';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';

const statusLabels: Record<WeightSyncIntegrationStatus, string> = {
  unavailable: 'Indisponible dans cette version',
  disabled: 'Désactivée sur cet appareil',
  disconnected: 'Compte non connecté',
  idle: 'Prête',
  syncing: 'Synchronisation en cours',
  'in-sync': 'À jour',
  offline: 'Hors ligne',
  error: 'Erreur',
};

function formatDate(value: string | undefined): string {
  if (!value) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function WeightSyncSettingsPanel() {
  const integration = getWeightSyncIntegration();
  const snapshot = useSyncExternalStore(
    integration.subscribe,
    integration.getSnapshot,
    integration.getSnapshot,
  );
  const toast = useToast();
  const [busyAction, setBusyAction] = useState<
    'enable' | 'disable' | 'sync'
  >();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    void integration
      .initialize()
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsInitializing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [integration]);

  const handleEnabledChange = async (enabled: boolean) => {
    setBusyAction(enabled ? 'enable' : 'disable');
    try {
      await integration.setEnabled(enabled);
      toast.success(
        enabled ? 'Synchronisation activée' : 'Synchronisation désactivée',
        enabled
          ? 'Les pesées seront synchronisées automatiquement sur cet appareil.'
          : 'Les données locales sont conservées et aucun nouvel échange automatique ne sera lancé.',
      );
    } catch (error) {
      toast.error(
        enabled ? 'Activation impossible' : 'Désactivation impossible',
        error instanceof Error
          ? error.message
          : 'Le réglage n’a pas pu être enregistré.',
      );
    } finally {
      setBusyAction(undefined);
    }
  };

  const handleManualSync = async () => {
    setBusyAction('sync');
    try {
      await integration.syncNow();
      toast.success(
        'Pesées synchronisées',
        'Les pesées locales et cloud sont à jour.',
      );
    } catch (error) {
      toast.error(
        'Synchronisation impossible',
        error instanceof Error
          ? error.message
          : 'La synchronisation a échoué.',
      );
    } finally {
      setBusyAction(undefined);
    }
  };

  if (!snapshot.available) {
    return (
      <InlineNotice tone="info" title="Synchronisation non déployée">
        Cette version ne contient pas la configuration Dexie Cloud nécessaire.
        Les pesées restent intégralement locales.
      </InlineNotice>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Cloud
                aria-hidden="true"
                className="size-5 text-brand-700 dark:text-brand-300"
              />
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Synchronisation des pesées
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Échange uniquement les pesées entre tes appareils. Les séances,
              la nutrition, le profil et les paramètres restent locaux.
            </p>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {isInitializing ? 'Préparation…' : statusLabels[snapshot.status]}
          </span>
        </div>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500 dark:text-slate-400">Compte</dt>
            <dd className="font-medium text-slate-900 dark:text-white">
              {snapshot.accountConnected ? 'Connecté' : 'Non connecté'}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500 dark:text-slate-400">
              Dernière synchronisation
            </dt>
            <dd className="font-medium text-slate-900 dark:text-white">
              {formatDate(snapshot.lastSyncAt)}
            </dd>
          </div>
        </dl>

        {snapshot.errorMessage ? (
          <InlineNotice
            className="mt-4"
            tone="error"
            title="Synchronisation en erreur"
          >
            {snapshot.errorMessage}
          </InlineNotice>
        ) : null}

        {!isInitializing && !snapshot.accountConnected ? (
          <InlineNotice
            className="mt-4"
            tone="info"
            title="Connexion requise"
          >
            Connecte d’abord ton compte depuis l’écran de connexion et de
            diagnostic.
          </InlineNotice>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {snapshot.enabled ? (
            <Button
              variant="dangerGhost"
              disabled={Boolean(busyAction) || isInitializing}
              onClick={() => void handleEnabledChange(false)}
            >
              <Unplug aria-hidden="true" className="size-4" />
              {busyAction === 'disable' ? 'Désactivation…' : 'Désactiver'}
            </Button>
          ) : (
            <Button
              disabled={
                Boolean(busyAction) ||
                isInitializing ||
                !snapshot.accountConnected
              }
              onClick={() => void handleEnabledChange(true)}
            >
              <Cloud aria-hidden="true" className="size-4" />
              {busyAction === 'enable'
                ? 'Activation…'
                : 'Activer sur cet appareil'}
            </Button>
          )}

          <Button
            variant="secondary"
            disabled={
              Boolean(busyAction) ||
              isInitializing ||
              !snapshot.enabled ||
              !snapshot.accountConnected ||
              !snapshot.online
            }
            onClick={() => void handleManualSync()}
          >
            <RefreshCw
              aria-hidden="true"
              className={`size-4 ${
                snapshot.status === 'syncing' ? 'animate-spin' : ''
              }`}
            />
            {busyAction === 'sync' || snapshot.status === 'syncing'
              ? 'Synchronisation…'
              : 'Synchroniser maintenant'}
          </Button>

          <Link
            to={routePaths.syncPrototype}
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
          >
            Connexion et diagnostic avancé
          </Link>
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        La désactivation arrête les échanges automatiques sans supprimer les
        pesées présentes sur l’appareil ou dans le cloud.
      </p>
    </div>
  );
}
