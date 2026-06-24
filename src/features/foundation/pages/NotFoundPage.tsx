import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';

export function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Erreur 404
        </p>
        <h1 className="mt-2 text-4xl font-bold text-slate-950 dark:text-white">Page introuvable</h1>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          L’adresse demandée ne correspond à aucune page de l’application.
        </p>
        <Link
          to={routePaths.dashboard}
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
