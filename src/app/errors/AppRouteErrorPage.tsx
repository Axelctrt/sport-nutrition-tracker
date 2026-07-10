import { CircleAlert, Home, RefreshCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import { isDynamicImportFailure } from '@/pwa/preloadErrorRecovery';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

function errorMessage(error: unknown): string {
  if (isRouteErrorResponse(error)) {
    return `${error.status} ${error.statusText || 'Erreur de navigation'}`;
  }
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Une erreur inattendue empêche l’ouverture de cette page.';
}

export function AppRouteErrorPage() {
  const error = useRouteError();
  const chunkFailure = isDynamicImportFailure(error);

  return (
    <main className="min-h-dvh px-4 py-8 sm:px-6 sm:py-12">
      <Card className="mx-auto max-w-xl p-6 sm:p-8">
        <div className="grid size-12 place-items-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200">
          <CircleAlert aria-hidden="true" className="size-6" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
          Action requise
        </p>
        <h1 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
          SportPilot n’a pas pu ouvrir cette page
        </h1>
        <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">
          {chunkFailure
            ? 'Une nouvelle version de l’application semble disponible. Recharge la page pour récupérer les fichiers à jour.'
            : 'Tes données locales restent conservées. Tu peux réessayer ou revenir à l’accueil.'}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => window.location.reload()}>
            <RefreshCw aria-hidden="true" className="size-4" />
            Recharger la page
          </Button>
          <Link
            to={routePaths.dashboard}
            className="inline-flex min-h-[var(--sp-control-height-md)] items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            <Home aria-hidden="true" className="size-4" />
            Retour à l’accueil
          </Link>
        </div>
        <details className="mt-6 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
          <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-200">
            Détail technique
          </summary>
          <p className="mt-2 break-words leading-6 text-slate-600 dark:text-slate-300">
            {errorMessage(error)}
          </p>
        </details>
      </Card>
    </main>
  );
}
