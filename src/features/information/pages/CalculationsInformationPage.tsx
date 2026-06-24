import {
  Activity,
  Calculator,
  Footprints,
  Info,
  Salad,
  Waves,
} from 'lucide-react';
import { Card } from '@/shared/ui/Card';

const formulas = [
  {
    title: 'Métabolisme de repos',
    icon: Calculator,
    lines: [
      'Homme : 10 × poids + 6,25 × taille − 5 × âge + 5',
      'Femme : 10 × poids + 6,25 × taille − 5 × âge − 161',
      'Le socle professionnel applique ensuite le coefficient sélectionné dans le profil.',
    ],
  },
  {
    title: 'Marche et pas de course',
    icon: Footprints,
    lines: [
      'Pas hors course = max(0, pas totaux − somme des pas de course).',
      'Seuls les pas hors course dépassant le seuil de base génèrent une dépense supplémentaire.',
      'Distance = pas supplémentaires × longueur de pas / 1 000.',
    ],
  },
  {
    title: 'Activités sportives',
    icon: Activity,
    lines: [
      'Course : poids × distance × coefficient de course.',
      'Natation et autres activités : durée × MET × 3,5 × poids / 200.',
      'Une correction manuelle remplace l’estimation ; elle ne s’y ajoute jamais.',
    ],
  },
  {
    title: 'Allures',
    icon: Waves,
    lines: [
      'Course : durée totale divisée par la distance, affichée en min/km.',
      'Natation : durée totale divisée par le nombre de blocs de 100 m.',
      'Les calculs conservent leur précision interne avant l’affichage.',
    ],
  },
  {
    title: 'Objectif calorique',
    icon: Calculator,
    lines: [
      'Ajustement = poids × variation hebdomadaire en % × 7 700 / 7.',
      'La cible additionne la dépense, l’ajustement d’objectif et les calibrations acceptées.',
      'Le plancher calorique est protégé avant l’arrondi final au multiple de 10 kcal.',
    ],
  },
  {
    title: 'Macronutriments',
    icon: Salad,
    lines: [
      'Protéines et lipides sont calculés selon les coefficients en g/kg du profil.',
      'Glucides = calories restantes après protéines et lipides, divisées par 4.',
      'Chaque macro est arrondie au multiple de 5 g et les glucides ne sont jamais négatifs.',
    ],
  },
] as const;

export function CalculationsInformationPage() {
  return (
    <section aria-labelledby="calculations-title">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
        Transparence des estimations
      </p>
      <h1 id="calculations-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
        Informations sur les calculs
      </h1>
      <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
        Le moteur de calcul est indépendant de l’interface, fortement typé et couvert par des tests unitaires. Les coefficients personnalisables sont enregistrés dans les paramètres avancés.
      </p>

      <Card className="mt-8 border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
        <div className="flex items-start gap-3">
          <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Des estimations, pas des mesures exactes
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
              Le métabolisme, les calories dépensées et les objectifs nutritionnels constituent des ordres de grandeur. Ils peuvent être ajustés selon les données réelles et ne remplacent pas un avis médical ou diététique.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {formulas.map(({ title, icon: Icon, lines }) => (
          <Card key={title} className="p-6">
            <Icon aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">
              {title}
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {lines.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-600 dark:bg-brand-300" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
  );
}
