import { RefreshCw, Wifi } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '@/shared/ui/Button';

export function PwaUpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!offlineReady && !needRefresh) {
    return null;
  }

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <section
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-xl lg:bottom-6 dark:border-slate-700 dark:bg-slate-900"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
          {needRefresh ? (
            <RefreshCw aria-hidden="true" className="size-5" />
          ) : (
            <Wifi aria-hidden="true" className="size-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-950 dark:text-white">
            {needRefresh ? 'Mise à jour disponible' : 'Application prête hors connexion'}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {needRefresh
              ? 'Rechargez pour utiliser la dernière version.'
              : 'L’interface principale a été mise en cache.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {needRefresh && (
              <Button size="sm" onClick={() => void updateServiceWorker(true)}>
                Mettre à jour
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={close}>
              Fermer
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
