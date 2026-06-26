import {
  Activity,
  ArrowRight,
  Calculator,
  Dumbbell,
  Footprints,
  Info,
  Salad,
  Waves,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';

const formulas = [
  {
    title: 'Métabolisme de repos',
    summary: 'Mifflin–St Jeor',
    description: 'Estimation du socle énergétique à partir du profil.',
    icon: Calculator,
    lines: [
      'Homme : 10 × poids + 6,25 × taille − 5 × âge + 5',
      'Femme : 10 × poids + 6,25 × taille − 5 × âge − 161',
      'Le moteur applique ensuite le coefficient d’activité quotidienne sélectionné dans le profil.',
    ],
  },
  {
    title: 'Marche et pas de course',
    summary: 'Pas hors course',
    description: 'Séparation des pas quotidiens et des pas déjà comptés dans une course.',
    icon: Footprints,
    lines: [
      'Pas hors course = max(0, pas totaux − somme des pas de course).',
      'Seuls les pas hors course dépassant le seuil de base génèrent une dépense supplémentaire.',
      'Distance = pas supplémentaires × longueur de pas / 1 000.',
    ],
  },
  {
    title: 'Activités sportives',
    summary: 'Distance ou MET',
    description: 'Calcul adapté au type d’activité et aux données disponibles.',
    icon: Activity,
    lines: [
      'Course : poids × distance × coefficient de course.',
      'Natation et autres activités : durée × MET × 3,5 × poids / 200.',
      'Une correction manuelle remplace l’estimation ; elle ne s’y ajoute jamais.',
    ],
  },
  {
    title: 'Allures',
    summary: 'min/km ou /100 m',
    description: 'Présentation des rythmes de course et de natation.',
    icon: Waves,
    lines: [
      'Course : durée totale divisée par la distance, affichée en min/km.',
      'Natation : durée totale divisée par le nombre de blocs de 100 m.',
      'Les calculs conservent leur précision interne avant l’affichage.',
    ],
  },
  {
    title: 'Musculation et progression',
    summary: 'Volume et 1RM',
    description: 'Statistiques des séries et conditions d’une suggestion de charge.',
    icon: Dumbbell,
    lines: [
      'Volume d’une série = charge × répétitions ; les séries d’échauffement sont exclues des statistiques principales.',
      '1RM estimé selon Epley : charge × (1 + répétitions / 30), uniquement entre 1 et 12 répétitions.',
      'Une hausse de charge est seulement proposée si toutes les séries prévues atteignent la borne haute sans dépasser le RPE maximal configuré.',
    ],
  },
  {
    title: 'Objectif calorique',
    summary: 'Cible quotidienne',
    description: 'Association de la dépense, de l’objectif et des calibrations acceptées.',
    icon: Calculator,
    lines: [
      'Ajustement = poids × variation hebdomadaire en % × 7 700 / 7.',
      'La cible additionne la dépense, l’ajustement d’objectif et les calibrations acceptées.',
      'Le plancher calorique est protégé avant l’arrondi final au multiple de 10 kcal.',
    ],
  },
  {
    title: 'Macronutriments',
    summary: 'g/kg et calories',
    description: 'Répartition des protéines, lipides et glucides dans la cible.',
    icon: Salad,
    lines: [
      'Protéines et lipides sont calculés selon les coefficients en g/kg du profil.',
      'Glucides = calories restantes après protéines et lipides, divisées par 4.',
      'Chaque macro est arrondie au multiple de 5 g et les glucides ne sont jamais négatifs.',
    ],
  },
] as const;

const overviewItems = [
  { label: 'Profil', value: 'Métabolisme et activité', icon: Calculator },
  { label: 'Sport', value: 'Distance, durée et MET', icon: Activity },
  { label: 'Nutrition', value: 'Calories et macros', icon: Salad },
  { label: 'Musculation', value: 'Volume, 1RM et progression', icon: Dumbbell },
] as const;

export function CalculationsInformationPage() {
  return (
    <section aria-labelledby="calculations-title" className="min-w-0 overflow-x-clip">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Transparence des estimations
      </p>
      <h1
        id="calculations-title"
        className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white"
      >
        Informations sur les calculs
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base dark:text-slate-300">
        Consultez uniquement le domaine qui vous intéresse. Les coefficients personnalisables restent disponibles dans le profil et les paramètres avancés.
      </p>

      <Card className="mt-6 p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {overviewItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/60">
              <Icon aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-950 dark:text-white">
                {value}
              </p>
            </div>
          ))}
        </div>
      </Card>

      <InlineNotice className="mt-4" title="Des estimations, pas des mesures exactes">
        Le métabolisme, les calories dépensées et les objectifs nutritionnels constituent des ordres de grandeur. Ils peuvent être ajustés selon les données réelles et ne remplacent pas un avis médical ou diététique.
      </InlineNotice>

      <div className="mt-5 space-y-3">
        {formulas.map(({ title, summary, description, icon: Icon, lines }, index) => (
          <CollapsibleSection
            key={title}
            title={title}
            description={description}
            summary={summary}
            defaultOpen={index === 0}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <ul className="min-w-0 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {lines.map((line) => (
                  <li key={line} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-300"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CollapsibleSection>
        ))}
      </div>

      <Card className="mt-5 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
          <div className="min-w-0">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Adapter les valeurs utilisées
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Le profil contient les objectifs principaux. Les paramètres regroupent les coefficients techniques et les seuils de calibration.
            </p>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <Link
                to={routePaths.profile}
                className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                Ouvrir le profil
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                to={routePaths.settings}
                className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                Ouvrir les paramètres
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
}
