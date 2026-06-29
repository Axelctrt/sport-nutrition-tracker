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
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const primaryNavigation: NavigationItem[] = [
  { label: 'Tableau de bord', path: routePaths.dashboard, icon: Gauge, end: true },
  {
    label: 'Recherche',
    path: routePaths.search,
    icon: Search,
  },
  { label: 'Nutrition', path: routePaths.food, icon: Apple },
  { label: 'Activités', path: routePaths.activities, icon: Dumbbell },
  { label: 'Exercices', path: routePaths.strengthExercises, icon: Activity },
  { label: 'Entraînements', path: routePaths.workoutSessions, icon: PlayCircle },
  { label: 'Planning', path: routePaths.weeklyPlanning, icon: CalendarDays },
  { label: 'Séances modèles', path: routePaths.workoutTemplates, icon: Layers3 },
  { label: 'Poids', path: routePaths.weight, icon: Weight },
  { label: 'Analyses', path: routePaths.analytics, icon: BarChart3 },
  { label: 'Rapports', path: routePaths.reports, icon: FileText },
  {
    label: 'Objectifs',
    path: routePaths.goals,
    icon: Target,
  },
  { label: 'Bilan hebdomadaire', path: routePaths.weeklyReview, icon: ClipboardCheck },
];

export const secondaryNavigation: NavigationItem[] = [
  { label: 'Profil', path: routePaths.profile, icon: UserRound },
  { label: 'Paramètres', path: routePaths.settings, icon: Settings },
  { label: 'Rappels', path: routePaths.reminders, icon: Bell },
  { label: 'Récompenses', path: routePaths.rewards, icon: Trophy },
  { label: 'Sauvegarde', path: routePaths.backup, icon: DatabaseBackup },
  { label: 'Corbeille', path: routePaths.trash, icon: Trash2 },
  { label: 'Calculs', path: routePaths.calculationsInformation, icon: Info },
];

export const mobileNavigation: NavigationItem[] = [
  { label: 'Accueil', path: routePaths.dashboard, icon: Gauge, end: true },
  { label: 'Nutrition', path: routePaths.food, icon: Apple },
  { label: 'Sport', path: routePaths.activities, icon: Activity },
  { label: 'Poids', path: routePaths.weight, icon: Weight },
  { label: 'Analyses', path: routePaths.analytics, icon: BarChart3 },
];

export const mobileMoreNavigation: NavigationSection[] = [
  {
    title: 'Musculation',
    items: [
      {
        label: 'Mes entraînements',
        path: routePaths.workoutSessions,
        icon: PlayCircle,
        description: 'Reprendre une séance ou consulter l’historique.',
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
        icon: Activity,
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
    title: 'Suivi et décisions',
    items: [
      {
        label: 'Recherche globale',
        path: routePaths.search,
        icon: Search,
        description:
          'Retrouver séances, aliments, recettes, activités et pesées.',
      },
      {
        label: 'Rapport de progression',
        path: routePaths.reports,
        icon: FileText,
        description:
          'Synthétiser et partager une période de suivi.',
      },
      {
        label: 'Objectifs et jalons',
        path: routePaths.goals,
        icon: Target,
        description:
          'Créer des objectifs mesurables et suivre automatiquement leur progression.',
      },
      {
        label: 'Historique',
        path: routePaths.history,
        icon: History,
        description: 'Relire les journées et ouvrir leurs données.',
      },
      {
        label: 'Bilan hebdomadaire',
        path: routePaths.weeklyReview,
        icon: ClipboardCheck,
        description: 'Examiner les données et décider des ajustements.',
      },
      {
        label: 'Récompenses',
        path: routePaths.rewards,
        icon: Trophy,
        description:
          'Badges, missions, séries et thèmes débloqués.',
      },
    ],
  },
  {
    title: 'Compte et application',
    items: [
      {
        label: 'Profil',
        path: routePaths.profile,
        icon: UserRound,
        description: 'Objectifs, mensurations et macronutriments.',
      },
      {
        label: 'Personnaliser l’accueil',
        path: routePaths.dashboardCustomization,
        icon: SlidersHorizontal,
        description: 'Choisir les blocs visibles et leur ordre.',
      },
      {
        label: 'Paramètres',
        path: routePaths.settings,
        icon: Settings,
        description: 'Thème, calculs avancés et stockage local.',
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
        description: 'Exporter, restaurer ou effacer les données.',
      },

      {
        label: 'Corbeille',
        path: routePaths.trash,
        icon: Trash2,
        description:
          'Restaurer les activités et pesées supprimées récemment.',
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
