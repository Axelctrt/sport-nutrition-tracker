import {
  HardDrive,
  LoaderCircle,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  getStoragePersistenceStatus,
  requestPersistentStorage,
  type StoragePersistenceStatus,
} from '@/infrastructure/storage/storagePersistenceService';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface StoragePersistenceCardProps {
  loadStatus?: () => Promise<StoragePersistenceStatus>;
  requestPersistence?: () => Promise<StoragePersistenceStatus>;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'Une erreur inconnue empêche la vérification du stockage.';
}

export function StoragePersistenceCard({
  loadStatus = getStoragePersistenceStatus,
  requestPersistence = requestPersistentStorage,
}: StoragePersistenceCardProps) {
  const [status, setStatus] =
    useState<StoragePersistenceStatus>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRequesting, setIsRequesting] = useState(false);
  const [feedback, setFeedback] = useState<{
    tone: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }>();

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const loaded = await loadStatus();
        if (active) setStatus(loaded);
      } catch (error) {
        if (active) {
          setFeedback({
            tone: 'error',
            title: 'Vérification impossible',
            message: errorMessage(error),
          });
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [loadStatus]);

  const request = async () => {
    setIsRequesting(true);
    setFeedback(undefined);

    try {
      const updated = await requestPersistence();
      setStatus(updated);

      if (updated.state === 'persistent') {
        setFeedback({
          tone: 'success',
          title: 'Protection renforcée activée',
          message:
            'Le navigateur a placé le stockage SportPilot en mode persistant.',
        });
      } else if (updated.state === 'best-effort') {
        setFeedback({
          tone: 'info',
          title: 'Protection non accordée',
          message:
            'Le navigateur conserve le mode standard. Une PWA installée et utilisée régulièrement a davantage de chances d’obtenir cette protection.',
        });
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Demande impossible',
        message: errorMessage(error),
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const isPersistent = status?.state === 'persistent';
  const isUnsupported = status?.state === 'unsupported';

  return (
    <Card
      className="mt-4 p-5 sm:p-6"
      aria-labelledby="storage-persistence-title"
    >
      <div className="flex items-start gap-3">
        {isPersistent ? (
          <ShieldCheck
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-emerald-700 dark:text-emerald-300"
          />
        ) : status?.state === 'best-effort' ? (
          <ShieldAlert
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-amber-700 dark:text-amber-300"
          />
        ) : (
          <HardDrive
            aria-hidden="true"
            className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300"
          />
        )}

        <div className="min-w-0 flex-1">
          <h2
            id="storage-persistence-title"
            className="text-lg font-bold text-slate-950 dark:text-white"
          >
            Protection du stockage local
          </h2>

          {isLoading ? (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
              Vérification en cours…
            </p>
          ) : isPersistent ? (
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Le navigateur protège davantage IndexedDB contre une
              suppression automatique liée au manque d’espace.
            </p>
          ) : isUnsupported ? (
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ce navigateur ne permet pas de vérifier ou de demander
              la persistance du stockage.
            </p>
          ) : (
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les données utilisent actuellement le mode standard du
              navigateur et peuvent être évincées en cas de forte
              pression sur le stockage.
            </p>
          )}
        </div>
      </div>

      {status?.state === 'best-effort' && status.canRequest ? (
        <Button
          className="mt-4"
          variant="secondary"
          disabled={isRequesting}
          onClick={() => void request()}
        >
          {isRequesting ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : (
            <ShieldCheck aria-hidden="true" className="size-4" />
          )}
          {isRequesting
            ? 'Demande en cours…'
            : 'Renforcer la protection'}
        </Button>
      ) : null}

      {feedback ? (
        <InlineNotice
          className="mt-4"
          tone={feedback.tone}
          title={feedback.title}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Cette protection réduit le risque d’effacement automatique,
        mais elle ne remplace pas une sauvegarde JSON et ne protège
        pas contre une suppression manuelle des données du navigateur.
      </p>
    </Card>
  );
}
