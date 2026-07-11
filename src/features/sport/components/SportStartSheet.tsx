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
    label: 'Musculation',
    description: 'Séance libre, modèle ou reprise en cours.',
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
    </BottomSheet>
  );
}
