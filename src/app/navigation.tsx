import {
  Activity,
  Apple,
  BarChart3,
  ClipboardCheck,
  Layers3,
  PlayCircle,
  DatabaseBackup,
  Dumbbell,
  Gauge,
  Info,
  Settings,
  UserRound,
  Weight,
  type LucideIcon,
} from 'lucide-react';
import { routePaths } from '@/app/routePaths';

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  end?: boolean;
}

export const primaryNavigation: NavigationItem[] = [
  { label: 'Tableau de bord', path: routePaths.dashboard, icon: Gauge, end: true },
  { label: 'Nutrition', path: routePaths.food, icon: Apple },
  { label: 'Activités', path: routePaths.activities, icon: Dumbbell },
  { label: 'Exercices', path: routePaths.strengthExercises, icon: Activity },
  { label: 'Entraînements', path: routePaths.workoutSessions, icon: PlayCircle },
  { label: 'Séances modèles', path: routePaths.workoutTemplates, icon: Layers3 },
  { label: 'Poids', path: routePaths.weight, icon: Weight },
  { label: 'Analyses', path: routePaths.analytics, icon: BarChart3 },
  { label: 'Bilan hebdomadaire', path: routePaths.weeklyReview, icon: ClipboardCheck },
];

export const secondaryNavigation: NavigationItem[] = [
  { label: 'Profil', path: routePaths.profile, icon: UserRound },
  { label: 'Paramètres', path: routePaths.settings, icon: Settings },
  { label: 'Sauvegarde', path: routePaths.backup, icon: DatabaseBackup },
  { label: 'Calculs', path: routePaths.calculationsInformation, icon: Info },
];

export const mobileNavigation: NavigationItem[] = [
  { label: 'Accueil', path: routePaths.dashboard, icon: Gauge, end: true },
  { label: 'Nutrition', path: routePaths.food, icon: Apple },
  { label: 'Sport', path: routePaths.activities, icon: Activity },
  { label: 'Poids', path: routePaths.weight, icon: Weight },
  { label: 'Analyses', path: routePaths.analytics, icon: BarChart3 },
];
