import {
  ArrowLeft,
  Bike,
  ChevronRight,
  Dumbbell,
  Footprints,
  Layers3,
  PersonStanding,
  Waves,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
import { createActivityJournalRestoreState } from '@/features/activities/navigation/activityJournalNavigation';
import { Card } from '@/shared/ui/Card';

const choices = [
  {
    title: 'Course',
    description: 'Distance, durée, cadence et allure.',
    path: routePaths.addRunningActivity,
    icon: PersonStanding,
    tone: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  },
  {
    title: 'Natation',
    description: 'Distance, nage principale et allure sur 100 m.',
    path: routePaths.addSwimmingActivity,
    icon: Waves,
    tone: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  },
  {
    title: 'Musculation simple',
    description: 'Durée, intensité et estimation énergétique.',
    path: routePaths.addStrengthActivity,
    icon: Dumbbell,
    tone: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  },
  {
    title: 'Vélo, marche ou cardio',
    description: 'Activité avec valeur MET ajustable.',
    path: routePaths.addOtherActivity,
    icon: Bike,
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
] as const;

export function AddActivityPage() {
  const location = useLocation();
  const navigationState = location.state as ActivityJournalNavigationState | null;
  const returnContext = navigationState?.activityJournalReturn;
  const backPath = returnContext?.path ?? routePaths.activities;
  const backState = createActivityJournalRestoreState(returnContext);

  return (
    <section aria-labelledby="add-activity-title">
      <Link
        to={backPath}
        state={backState}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour aux activités
      </Link>

      <div className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Journal sportif</p>
        <h1 id="add-activity-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Ajouter une activité
        </h1>
        <p className="mt-2 hidden max-w-2xl text-slate-600 dark:text-slate-300 sm:block">
          Choisis le type de séance. Le formulaire adaptera automatiquement les champs et les calculs.
        </p>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {choices.map(({ title, description, path, icon: Icon, tone }) => (
          <Link
            key={path}
            to={path}
            state={navigationState}
            className="group rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
          >
            <Card className="flex h-full items-center gap-4 p-4 transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md motion-reduce:transition-none sm:p-5">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${tone}`}>
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-950 dark:text-white">{title}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</span>
              </span>
              <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Layers3 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">Modèles d’endurance</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Préremplis une course, une natation ou une sortie vélo, puis adapte la séance du jour.
              </p>
            </div>
          </div>
          <Link
            to={routePaths.enduranceTemplates}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            Gérer les modèles
          </Link>
        </div>
      </Card>

      <Card className="mt-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Footprints aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Pas et double comptage</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les pas estimés pendant une course sont retirés du podomètre. Une marche peut aussi être déclarée comme déjà comprise dans les pas quotidiens.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
