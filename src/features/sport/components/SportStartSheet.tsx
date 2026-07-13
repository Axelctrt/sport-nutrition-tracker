import {
  Bike,
  Dumbbell,
  Footprints,
  HeartPulse,
  PersonStanding,
  Waves,
  type LucideIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import type { ActivityType } from '@/domain/models/activity';
import type { LocalDate } from '@/domain/models/common';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
import { sportActivityCreationPath } from '@/features/sport/sportHubNavigation';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { cn } from '@/shared/utils/cn';

interface SportStartSheetProps {
  open: boolean;
  date: LocalDate;
  activityTypeOrder: ActivityType[];
  navigationState: ActivityJournalNavigationState;
  onClose: () => void;
}

interface ActivityChoice {
  type: ActivityType;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: string;
}

const choices: Record<ActivityType, ActivityChoice> = {
  running: {
    type: 'running',
    label: 'Course',
    description: 'Distance, allure, cadence et dénivelé.',
    icon: PersonStanding,
    tone: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  },
  strengthTraining: {
    type: 'strengthTraining',
    label: 'Musculation détaillée',
    description: 'Séries, repos, modèles et reprise en cours.',
    icon: Dumbbell,
    tone: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  },
  walking: {
    type: 'walking',
    label: 'Marche',
    description: 'Durée, effort et prise en compte des pas.',
    icon: Footprints,
    tone: 'bg-lime-100 text-lime-800 dark:bg-lime-950 dark:text-lime-200',
  },
  cycling: {
    type: 'cycling',
    label: 'Vélo',
    description: 'Distance, vitesse, environnement et dénivelé.',
    icon: Bike,
    tone: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
  swimming: {
    type: 'swimming',
    label: 'Natation',
    description: 'Distance, nage, bassin et allure sur 100 m.',
    icon: Waves,
    tone: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  },
  otherCardio: {
    type: 'otherCardio',
    label: 'Autre cardio',
    description: 'Durée, intensité et valeur MET ajustable.',
    icon: HeartPulse,
    tone: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
  },
};

export function SportStartSheet({
  open,
  date,
  activityTypeOrder,
  navigationState,
  onClose,
}: SportStartSheetProps) {
  return (
    <BottomSheet
      open={open}
      title="Démarrer ou ajouter une activité"
      description="Les activités que tu utilises le plus apparaissent en premier."
      onClose={onClose}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {activityTypeOrder.map((type) => {
          const choice = choices[type];
          const Icon = choice.icon;
          return (
            <Link
              key={choice.type}
              to={sportActivityCreationPath(choice.type, date)}
              state={navigationState}
              onClick={onClose}
              className="flex min-h-20 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-brand-800 dark:hover:bg-brand-950/30"
            >
              <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', choice.tone)}>
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-950 dark:text-white">
                  {choice.label}
                </span>
                <span className="mt-0.5 block text-sm leading-5 text-slate-500 dark:text-slate-400">
                  {choice.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950/50">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">
          Besoin d’une saisie musculation très rapide ?
        </p>
        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
          Utilise l’activité simple uniquement pour enregistrer une durée et une intensité, sans détail des séries.
        </p>
        <Link
          to={`${routePaths.addStrengthActivity}?${new URLSearchParams({ date }).toString()}`}
          state={navigationState}
          onClick={onClose}
          className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-800 hover:bg-white dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-900"
        >
          Ajouter une activité simple
        </Link>
      </div>
    </BottomSheet>
  );
}
