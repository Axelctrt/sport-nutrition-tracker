import { ArrowLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-6">
      <Card className="w-full max-w-lg p-5 text-center sm:p-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Erreur 404
        </p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950 sm:text-4xl dark:text-white">
          Page introuvable
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
          L’adresse demandée ne correspond à aucune page de SportPilot. Vos données locales ne sont pas affectées.
        </p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft aria-hidden="true" className="size-4" />
            Page précédente
          </Button>
          <Link
            to={routePaths.dashboard}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            <Home aria-hidden="true" className="size-4" />
            Retour à l’accueil
          </Link>
        </div>
      </Card>
    </main>
  );
}
