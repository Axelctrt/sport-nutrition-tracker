import { Activity, Apple, ArrowLeft, RefreshCw, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

export function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-6">
      <Card className="w-full max-w-lg p-5 sm:p-6">
        <div className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <WifiOff aria-hidden="true" className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
            Connexion indisponible
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
            Les données déjà enregistrées restent disponibles sur cet appareil. Les recherches Open Food Facts et les autres services externes reprendront au retour du réseau.
          </p>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Réessayer
          </Button>
          <Link
            to={routePaths.dashboard}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Tableau de bord
          </Link>
        </div>

        <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Fonctions locales
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <Link
              to={routePaths.food}
              className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Apple aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
              Journal alimentaire
            </Link>
            <Link
              to={routePaths.activities}
              className="flex min-h-12 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-semibold text-slate-800 hover:bg-slate-100 dark:bg-slate-950/60 dark:text-slate-100 dark:hover:bg-slate-800"
            >
              <Activity aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
              Activités
            </Link>
          </div>
        </div>
      </Card>
    </main>
  );
}
