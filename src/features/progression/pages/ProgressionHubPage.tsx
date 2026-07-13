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
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { ProgressionDecisionSummary } from '@/features/progression/components/ProgressionDecisionSummary';
import { useProgressionHubSummary } from '@/features/progression/hooks/useProgressionHubSummary';
import { toLocalDate } from '@/shared/utils/dates';

const decisionDestinations = [
  {
    title: 'Analyses',
    description: 'Explorer les graphiques et tendances détaillées sur douze semaines.',
    path: routePaths.analytics,
    icon: BarChart3,
  },
  {
    title: 'Rapports',
    description: 'Créer une synthèse lisible sur une période choisie et la partager.',
    path: routePaths.reports,
    icon: FileText,
  },
  {
    title: 'Bilan hebdomadaire',
    description: 'Relire la semaine, noter les constats et décider des ajustements utiles.',
    path: routePaths.weeklyReview,
    icon: ClipboardCheck,
  },
] as const;

const followUpDestinations = [
  {
    title: 'Poids',
    description: 'Pesées et trajectoire',
    path: routePaths.weight,
    icon: Scale,
  },
  {
    title: 'Objectifs et jalons',
    description: 'Priorités et avancement',
    path: routePaths.goals,
    icon: Target,
  },
  {
    title: 'Historique',
    description: 'Journées et données associées',
    path: routePaths.history,
    icon: History,
  },
  {
    title: 'Récompenses',
    description: 'Badges, missions et thèmes',
    path: routePaths.rewards,
    icon: Trophy,
  },
] as const;

export function ProgressionHubPage() {
  const { profile } = useProfile();
  const summary = useProgressionHubSummary(toLocalDate(), profile);

  if (!profile) return null;

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
            Commence par les signaux de la semaine, puis ouvre uniquement le niveau de détail utile.
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

      <ProgressionDecisionSummary
        data={summary.data}
        status={summary.status}
        errorMessage={summary.errorMessage}
        onRetry={() => void summary.refresh()}
      />

      <section className="mt-6" aria-labelledby="progression-decision-actions-title">
        <div>
          <h2 id="progression-decision-actions-title" className="text-lg font-bold text-slate-950 dark:text-white">
            Approfondir
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Analyses pour comprendre, rapport pour synthétiser, bilan pour décider.
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {decisionDestinations.map((destination) => {
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

      <section className="mt-6" aria-labelledby="progression-follow-up-title">
        <h2 id="progression-follow-up-title" className="text-lg font-bold text-slate-950 dark:text-white">
          Suivi et historique
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {followUpDestinations.map((destination) => {
            const Icon = destination.icon;
            return (
              <Link
                key={destination.path}
                to={destination.path}
                className="group flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm hover:border-brand-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <Icon aria-hidden="true" className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-950 dark:text-white">
                    {destination.title}
                  </span>
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {destination.description}
                  </span>
                </span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5" />
              </Link>
            );
          })}
        </div>
      </section>
    </section>
  );
}
