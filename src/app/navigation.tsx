import {
  Activity,
  Apple,
  Bell,
  DatabaseBackup,
  Gauge,
  Info,
  Laptop,
  LockKeyhole,
  Search,
  Settings,
  Sparkles,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  UsersRound,
  UserRound,
  Wrench,
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
  routePaths.rewards,
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
  { label: 'Coach', path: routePaths.coach, icon: Sparkles },
  { label: 'Recherche', path: routePaths.search, icon: Search },
  { label: 'Profil', path: routePaths.profile, icon: UserRound },
  { label: 'Paramètres', path: routePaths.settings, icon: Settings },
];

export const mobileNavigation: NavigationItem[] = primaryNavigation;

export const mobileMoreNavigation: NavigationSection[] = [
  {
    title: 'Compte',
    items: [
      {
        label: 'Profil',
        path: routePaths.profile,
        icon: UserRound,
        description: 'Identité, objectifs et mesures.',
      },
      {
        label: 'Amis et confidentialité',
        path: routePaths.friends,
        icon: UsersRound,
        description: 'Invitations, identité sociale et permissions de partage.',
      },
      {
        label: 'Compte et appareils',
        path: routePaths.accountDevices,
        icon: Laptop,
        description: 'Gérer le compte actif et les appareils associés.',
      },
    ],
  },
  {
    title: 'Application',
    items: [
      {
        label: 'Coach',
        path: routePaths.coach,
        icon: Sparkles,
        description: 'Verdict, plan actuel, priorité et bilans.',
      },
      {
        label: 'Recherche globale',
        path: routePaths.search,
        icon: Search,
        description: 'Retrouver séances, aliments, recettes, activités et pesées.',
      },
      {
        label: 'Affichage de l’Accueil',
        path: routePaths.dashboardCustomization,
        icon: SlidersHorizontal,
        description: 'Choisir les informations et le bloc complémentaire.',
      },
      {
        label: 'Apparence et accessibilité',
        path: routePaths.settingsAppearanceAccessibility,
        icon: Settings,
        description: 'Adapter le thème et le confort de lecture.',
      },
      {
        label: 'Rappels',
        path: routePaths.settingsNotificationsRoutines,
        icon: Bell,
        description: 'Rappels, routines et minuteur.',
      },
      {
        label: 'Calculs et nutrition',
        path: routePaths.settingsNutritionCalculations,
        icon: Gauge,
        description: 'Régler les repères nutritionnels et les coefficients.',
      },
    ],
  },
  {
    title: 'Données',
    items: [
      {
        label: 'Synchronisation',
        path: routePaths.settingsAccountSync,
        icon: Laptop,
        description: 'Compte, cloud et hors-ligne.',
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
        label: 'Gestion des données',
        path: routePaths.settingsAdvanced,
        icon: Wrench,
        description: 'Accéder aux opérations locales avancées.',
      },
    ],
  },
  {
    title: 'Informations',
    items: [
      {
        label: 'Comprendre les calculs',
        path: routePaths.calculationsInformation,
        icon: Info,
        description: 'Comprendre les formules, estimations et limites.',
      },
      {
        label: 'Confidentialité',
        path: routePaths.privacy,
        icon: LockKeyhole,
        description: 'Consulter les règles de confidentialité de SportPilot.',
      },
      {
        label: 'À propos',
        path: routePaths.settingsAbout,
        icon: Info,
        description: 'Version et informations sur l’application.',
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
