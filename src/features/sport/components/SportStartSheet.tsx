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
import {
  SportNavigationCard,
  type SportNavigationTone,
} from '@/features/sport/components/SportNavigationCard';
import { sportActivityCreationPath } from '@/features/sport/sportHubNavigation';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Card } from '@/shared/ui/Card';

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
  tone: SportNavigationTone;
}

const choices: Record<ActivityType, ActivityChoice> = {
  running: {
    type: 'running',
    label: 'Course',
    description: 'Distance, allure, cadence et dénivelé.',
    icon: PersonStanding,
    tone: 'warning',
  },
  strengthTraining: {
    type: 'strengthTraining',
    label: 'Musculation détaillée',
    description: 'Séries, repos, modèles et reprise en cours.',
    icon: Dumbbell,
    tone: 'progress',
  },
  walking: {
    type: 'walking',
    label: 'Marche',
    description: 'Durée, effort et prise en compte des pas.',
    icon: Footprints,
    tone: 'success',
  },
  cycling: {
    type: 'cycling',
    label: 'Vélo',
    description: 'Distance, vitesse, environnement et dénivelé.',
    icon: Bike,
    tone: 'accent',
  },
  swimming: {
    type: 'swimming',
    label: 'Natation',
    description: 'Distance, nage, bassin et allure sur 100 m.',
    icon: Waves,
    tone: 'secondary',
  },
  otherCardio: {
    type: 'otherCardio',
    label: 'Autre cardio',
    description: 'Durée, intensité et valeur MET ajustable.',
    icon: HeartPulse,
    tone: 'intense',
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
      title="Enregistrer une activité"
      description="Choisis le type d’activité déjà réalisée à ajouter au journal."
      onClose={onClose}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        {activityTypeOrder.map((type) => {
          const choice = choices[type];
          return (
            <SportNavigationCard
              key={choice.type}
              to={sportActivityCreationPath(choice.type, date)}
              state={navigationState}
              title={choice.label}
              description={choice.description}
              icon={choice.icon}
              tone={choice.tone}
              onClick={onClose}
            />
          );
        })}
      </div>

      <Card variant="muted" padding="sm" className="mt-4">
        <p className="text-sm font-semibold text-[var(--sp-text-primary)]">
          Besoin d’une saisie musculation très rapide ?
        </p>
        <p className="mt-1 text-sm leading-5 text-[var(--sp-text-secondary)]">
          Utilise l’activité simple uniquement pour enregistrer une durée et une intensité, sans détail des séries.
        </p>
        <Link
          to={`${routePaths.addStrengthActivity}?${new URLSearchParams({ date }).toString()}`}
          state={navigationState}
          onClick={onClose}
          className="sp-button sp-button--secondary mt-3 inline-flex min-h-[var(--sp-control-height-sm)] items-center rounded-[var(--sp-radius-control)] px-3 text-sm font-semibold"
        >
          Ajouter une activité simple
        </Link>
      </Card>
    </BottomSheet>
  );
}
