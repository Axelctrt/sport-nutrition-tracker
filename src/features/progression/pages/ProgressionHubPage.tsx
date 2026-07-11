import {
  ArrowRight,
  BarChart3,
  ClipboardCheck,
  FileText,
  History,
  Plus,
  Scale,
  Target,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';

const progressionDestinations = [
  {
    title: 'Poids',
    description: 'Ajouter une pesée et suivre la tendance sans confondre poids initial et poids actuel.',
    path: routePaths.weight,
    icon: Scale,
  },
  {
    title: 'Analyses',
    description: 'Observer les tendances de nutrition, d’activité et de progression.',
    path: routePaths.analytics,
    icon: BarChart3,
  },
  {
    title: 'Objectifs et jalons',
    description: 'Définir des objectifs mesurables et suivre leur avancement.',
    path: routePaths.goals,
    icon: Target,
  },
  {
    title: 'Rapports',
    description: 'Synthétiser une période et préparer un partage lisible.',
    path: routePaths.reports,
    icon: FileText,
  },
  {
    title: 'Bilan hebdomadaire',
    description: 'Relire la semaine et décider des ajustements utiles.',
    path: routePaths.weeklyReview,
    icon: ClipboardCheck,
  },
  {
    title: 'Historique',
    description: 'Retrouver une journée et ouvrir les données qui y sont associées.',
    path: routePaths.history,
    icon: History,
  },
  {
    title: 'Récompenses',
    description: 'Consulter les badges, missions, séries et thèmes débloqués.',
    path: routePaths.rewards,
    icon: Trophy,
  },
] as const;

export function ProgressionHubPage() {
  return (
    <section aria-labelledby="progression-hub-title" className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Suivre et décider
          </p>
          <h1
            id="progression-hub-title"
            className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Progression
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
            Retrouvez au même endroit votre poids, vos analyses, vos objectifs, vos rapports et votre bilan hebdomadaire.
          </p>
        </div>

        <Link
          to={routePaths.weight}
          className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          <Plus aria-hidden="true" className="size-5" />
          Ajouter une pesée
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {progressionDestinations.map((destination) => {
          const Icon = destination.icon;
          return (
            <Link
              key={destination.path}
              to={destination.path}
              className="group flex min-h-36 items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-3 font-bold text-slate-950 dark:text-white">
                  {destination.title}
                  <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </span>
                <span className="mt-2 block text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {destination.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
