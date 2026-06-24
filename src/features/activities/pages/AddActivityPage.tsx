import { Bike, Dumbbell, Footprints, HeartPulse, PersonStanding, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { Card } from '@/shared/ui/Card';

const choices = [
  {
    title: 'Course',
    description: 'Footing, sortie longue, tempo, fractionné, côtes ou compétition.',
    path: routePaths.addRunningActivity,
    icon: PersonStanding,
    tone: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  },
  {
    title: 'Natation',
    description: 'Distance, nage principale, type de séance et allure sur 100 m.',
    path: routePaths.addSwimmingActivity,
    icon: Waves,
    tone: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  },
  {
    title: 'Musculation',
    description: 'Durée, intensité, RPE et estimation énergétique par MET.',
    path: routePaths.addStrengthActivity,
    icon: Dumbbell,
    tone: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  },
  {
    title: 'Vélo, marche ou cardio',
    description: 'Activité générique avec MET ajustable et prévention du double comptage de la marche.',
    path: routePaths.addOtherActivity,
    icon: Bike,
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
] as const;

export function AddActivityPage() {
  return (
    <section aria-labelledby="add-activity-title">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Étape 6 · Journal sportif</p>
      <h1 id="add-activity-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Ajouter une activité</h1>
      <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
        Choisis le type de séance. Chaque formulaire utilise les règles de calcul adaptées et conserve un snapshot du poids et des coefficients utilisés.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {choices.map(({ title, description, path, icon: Icon, tone }) => (
          <Link key={path} to={path} className="group rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 dark:focus:ring-offset-slate-950">
            <Card className="h-full p-5 transition-transform group-hover:-translate-y-0.5 group-hover:shadow-md sm:p-6">
              <span className={`grid size-12 place-items-center rounded-xl ${tone}`}>
                <Icon aria-hidden="true" className="size-6" />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-slate-950 dark:text-white">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
                Ouvrir le formulaire
                <HeartPulse aria-hidden="true" className="size-4" />
              </span>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6 p-5">
        <div className="flex items-start gap-3">
          <Footprints aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Règle de double comptage</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les pas calculés pendant les courses sont retirés des pas quotidiens avant l’estimation de la marche. Une marche peut aussi être déclarée comme déjà comprise dans le podomètre.
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
