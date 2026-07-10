import {
  Activity,
  Apple,
  BarChart3,
  Bell,
  ClipboardCheck,
  CalendarDays,
  Layers3,
  PlayCircle,
  DatabaseBackup,
  Dumbbell,
  FileText,
  Gauge,
  History,
  Info,
  Search,
  Settings,
  SlidersHorizontal,
  Trash2,
  Trophy,
  Target,
  TrendingUp,
  UsersRound,
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
  description?: string;
  activePaths?: string[];
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

const sportActivePaths = [
  routePaths.activities,
  '/activities/',
  '/strength/',
];

const progressionActivePaths = [
  routePaths.progression,
  routePaths.weight,
  routePaths.analytics,
  routePaths.reports,
  routePaths.goals,
  routePaths.weeklyReview,
  routePaths.history,
];

export const primaryNavigation: NavigationItem[] = [
  { label: 'Accueil', path: routePaths.dashboard, icon: Gauge, end: true },
  { label: 'Nutrition', path: routePaths.food, icon: Apple, activePaths: ['/food/', '/recipes'] },
  { label: 'Sport', path: routePaths.activities, icon: Activity, activePaths: sportActivePaths },
  {
    label: 'Progression',
    path: routePaths.progression,
    icon: TrendingUp,
    activePaths: progressionActivePaths,
  },
];

export const secondaryNavigation: NavigationItem[] = [
  { label: 'Recherche', path: routePaths.search, icon: Search },
  { label: 'Amis', path: routePaths.friends, icon: UsersRound },
  { label: 'Profil', path: routePaths.profile, icon: UserRound },
  { label: 'Paramètres', path: routePaths.settings, icon: Settings, end: true },
  { label: 'Rappels', path: routePaths.reminders, icon: Bell },
  { label: 'Sauvegarde', path: routePaths.backup, icon: DatabaseBackup, end: true },
  { label: 'Corbeille', path: routePaths.trash, icon: Trash2 },
  { label: 'Calculs', path: routePaths.calculationsInformation, icon: Info },
];

export const mobileNavigation: NavigationItem[] = primaryNavigation;

export const mobileMoreNavigation: NavigationSection[] = [
  {
    title: 'Sport',
    items: [
      {
        label: 'Hub Sport',
        path: routePaths.activities,
        icon: Activity,
        description: 'Démarrer une activité, consulter le programme et l’historique récent.',
      },
      {
        label: 'Mes entraînements',
        path: routePaths.workoutSessions,
        icon: PlayCircle,
        description: 'Reprendre une séance ou consulter l’historique de musculation.',
      },
      {
        label: 'Planning hebdomadaire',
        path: routePaths.weeklyPlanning,
        icon: CalendarDays,
        description: 'Prévoir, reporter et démarrer les séances de la semaine.',
      },
      {
        label: 'Exercices',
        path: routePaths.strengthExercises,
        icon: Dumbbell,
        description: 'Catalogue, exercices personnels et progression.',
      },
      {
        label: 'Séances modèles',
        path: routePaths.workoutTemplates,
        icon: Layers3,
        description: 'Préparer et démarrer des entraînements récurrents.',
      },
    ],
  },
  {
    title: 'Progression',
    items: [
      {
        label: 'Hub Progression',
        path: routePaths.progression,
        icon: TrendingUp,
        description: 'Poids, analyses, objectifs, rapports et bilan hebdomadaire.',
      },
      {
        label: 'Poids',
        path: routePaths.weight,
        icon: Weight,
        description: 'Ajouter une pesée et suivre la tendance.',
      },
      {
        label: 'Analyses',
        path: routePaths.analytics,
        icon: BarChart3,
        description: 'Observer les tendances sportives et nutritionnelles.',
      },
      {
        label: 'Objectifs et jalons',
        path: routePaths.goals,
        icon: Target,
        description: 'Créer des objectifs mesurables et suivre leur progression.',
      },
      {
        label: 'Rapport de progression',
        path: routePaths.reports,
        icon: FileText,
        description: 'Synthétiser et partager une période de suivi.',
      },
      {
        label: 'Bilan hebdomadaire',
        path: routePaths.weeklyReview,
        icon: ClipboardCheck,
        description: 'Examiner les données et décider des ajustements.',
      },
      {
        label: 'Historique',
        path: routePaths.history,
        icon: History,
        description: 'Relire les journées et ouvrir leurs données.',
      },
      {
        label: 'Récompenses',
        path: routePaths.rewards,
        icon: Trophy,
        description: 'Badges, missions, séries et thèmes débloqués.',
      },
    ],
  },
  {
    title: 'Compte et application',
    items: [
      {
        label: 'Recherche globale',
        path: routePaths.search,
        icon: Search,
        description: 'Retrouver séances, aliments, recettes, activités et pesées.',
      },
      {
        label: 'Amis et confidentialité',
        path: routePaths.friends,
        icon: UsersRound,
        description: 'Invitations, permissions et limites de partage.',
      },
      {
        label: 'Profil',
        path: routePaths.profile,
        icon: UserRound,
        description: 'Objectifs, mensurations et macronutriments.',
      },
      {
        label: 'Personnaliser l’Accueil',
        path: routePaths.dashboardCustomization,
        icon: SlidersHorizontal,
        description: 'Choisir les blocs, métriques, raccourcis et leur ordre.',
      },
      {
        label: 'Paramètres',
        path: routePaths.settings,
        icon: Settings,
        end: true,
        description: 'Compte, apparence, calculs et stockage local.',
      },
      {
        label: 'Rappels et routines',
        path: routePaths.reminders,
        icon: Bell,
        description: 'Configurer les rappels internes de suivi.',
      },
      {
        label: 'Sauvegarde',
        path: routePaths.backup,
        icon: DatabaseBackup,
        end: true,
        description: 'Exporter, restaurer ou effacer les données.',
      },
      {
        label: 'Corbeille',
        path: routePaths.trash,
        icon: Trash2,
        description: 'Restaurer les éléments supprimés récemment.',
      },
      {
        label: 'Informations sur les calculs',
        path: routePaths.calculationsInformation,
        icon: Info,
        description: 'Comprendre les formules et leurs limites.',
      },
    ],
  },
];

export function navigationItemIsActive(pathname: string, item: NavigationItem): boolean {
  if (item.end) return pathname === item.path;
  if (pathname === item.path || pathname.startsWith(`${item.path}/`)) return true;
  return item.activePaths?.some((path) =>
    path.endsWith('/') ? pathname.startsWith(path) : pathname === path || pathname.startsWith(`${path}/`),
  ) ?? false;
}
