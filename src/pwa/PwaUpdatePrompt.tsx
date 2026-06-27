import { useState } from 'react';
import { RefreshCw, Wifi } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { applyPwaUpdate, type UpdateServiceWorker } from '@/pwa/applyPwaUpdate';
import { Button } from '@/shared/ui/Button';

const UPDATE_ERROR_MESSAGE =
  'La mise à jour n’a pas été appliquée. Tes données restent intactes. Réessaie dans quelques instants.';

type ApplyUpdate = (updateServiceWorker: UpdateServiceWorker) => Promise<void>;

interface PwaUpdatePromptProps {
  applyUpdate?: ApplyUpdate;
}

export function PwaUpdatePrompt({
  applyUpdate = applyPwaUpdate,
}: PwaUpdatePromptProps = {}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    // Le rechargement est déclenché explicitement après controllerchange.
    onNeedReload: () => undefined,
  });

  if (!offlineReady && !needRefresh) {
    return null;
  }

  const close = () => {
    if (isUpdating) return;
    setOfflineReady(false);
    setNeedRefresh(false);
    setUpdateError(null);
  };

  const update = async () => {
    setIsUpdating(true);
    setUpdateError(null);

    try {
      await applyUpdate(updateServiceWorker);
    } catch {
      setUpdateError(UPDATE_ERROR_MESSAGE);
    } finally {
      setIsUpdating(false);
    }
  };

  const title = needRefresh ? 'Mise à jour disponible' : 'Application prête hors connexion';

  return (
    <section
      role="status"
      aria-live="polite"
      aria-label={title}
      className="safe-area-bottom fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:bottom-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
          {needRefresh ? (
            <RefreshCw aria-hidden="true" className={`size-5${isUpdating ? ' motion-safe:animate-spin' : ''}`} />
          ) : (
            <Wifi aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {needRefresh
              ? 'Les écritures locales en cours seront terminées avant le rechargement.'
              : 'Les écrans principaux ont été mis en cache et peuvent être rouverts sans connexion.'}
          </p>
          {updateError ? (
            <p role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">
              {updateError}
            </p>
          ) : null}
          <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
            {needRefresh ? (
              <Button size="sm" disabled={isUpdating} onClick={() => void update()}>
                {isUpdating ? 'Sécurisation des données…' : 'Mettre à jour maintenant'}
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" disabled={isUpdating} onClick={close}>
              {needRefresh ? 'Plus tard' : 'Compris'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
