import { ArrowLeft, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { Card } from '@/shared/ui/Card';

export function OfflinePage() {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <Card className="w-full max-w-lg p-6 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <WifiOff aria-hidden="true" className="size-7" />
        </span>
        <h1 className="mt-5 text-2xl font-bold text-slate-950 dark:text-white">
          Connexion indisponible
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          SportPilot reste utilisable pour les données déjà stockées localement. Les services externes seront rétablis au retour du réseau.
        </p>
        <Link
          to={routePaths.dashboard}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Revenir au tableau de bord
        </Link>
      </Card>
    </main>
  );
}
