import { matchPath } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';

interface RouteMetadata {
  pattern: string;
  title: string;
}

const routeMetadata: RouteMetadata[] = [
  { pattern: routePaths.dashboard, title: "Aujourd’hui" },
  { pattern: routePaths.search, title: 'Recherche globale' },
  { pattern: routePaths.profile, title: 'Profil' },
  { pattern: routePaths.dashboardCustomization, title: 'Personnaliser le tableau de bord' },
  { pattern: routePaths.settings, title: 'Paramètres' },
  { pattern: routePaths.barcodeScanner, title: 'Scanner un code-barres' },
  { pattern: routePaths.foodSelector, title: 'Ajouter un aliment' },
  { pattern: routePaths.addFood, title: 'Ajouter un aliment' },
  { pattern: routePaths.editFoodEntry, title: 'Modifier un aliment' },
  { pattern: routePaths.newFoodProduct, title: 'Créer un aliment' },
  { pattern: routePaths.editFoodProduct, title: 'Modifier un aliment' },
  { pattern: routePaths.foodProducts, title: 'Aliments' },
  { pattern: routePaths.foodSearch, title: 'Recherche alimentaire' },
  { pattern: routePaths.favoriteMeals, title: 'Repas favoris' },
  { pattern: routePaths.addRecipeToJournal, title: 'Ajouter une recette' },
  { pattern: routePaths.newRecipe, title: 'Créer une recette' },
  { pattern: routePaths.editRecipe, title: 'Modifier une recette' },
  { pattern: routePaths.recipes, title: 'Recettes' },
  { pattern: routePaths.food, title: 'Alimentation' },
  { pattern: routePaths.workoutSession, title: 'Séance de musculation' },
  { pattern: routePaths.newWorkoutTemplate, title: 'Créer une séance modèle' },
  { pattern: routePaths.editWorkoutTemplate, title: 'Modifier une séance modèle' },
  { pattern: routePaths.workoutTemplates, title: 'Séances modèles' },
  { pattern: routePaths.weeklyPlanning, title: 'Planning de musculation' },
  { pattern: routePaths.workoutSessions, title: 'Carnet de musculation' },
  { pattern: routePaths.strengthExerciseHistory, title: 'Historique de l’exercice' },
  { pattern: routePaths.newStrengthExercise, title: 'Créer un exercice' },
  { pattern: routePaths.editStrengthExercise, title: 'Modifier un exercice' },
  { pattern: routePaths.strengthExercises, title: 'Exercices' },
  { pattern: routePaths.enduranceTemplates, title: 'Modèles d’endurance' },
  { pattern: routePaths.addRunningActivity, title: 'Ajouter une course' },
  { pattern: routePaths.addSwimmingActivity, title: 'Ajouter une natation' },
  { pattern: routePaths.addStrengthActivity, title: 'Ajouter une activité de musculation' },
  { pattern: routePaths.addOtherActivity, title: 'Ajouter une activité' },
  { pattern: routePaths.editActivity, title: 'Modifier une activité' },
  { pattern: routePaths.addActivity, title: 'Ajouter une activité' },
  { pattern: routePaths.activities, title: 'Activités' },
  { pattern: routePaths.weight, title: 'Poids' },
  { pattern: routePaths.history, title: 'Historique' },
  { pattern: routePaths.analytics, title: 'Progression' },
  { pattern: routePaths.weeklyReview, title: 'Bilan hebdomadaire' },
  { pattern: routePaths.rewards, title: 'Centre de récompenses' },
  { pattern: routePaths.backup, title: 'Sauvegarde' },
  { pattern: routePaths.trash, title: 'Corbeille' },
  { pattern: routePaths.calculationsInformation, title: 'Calculs et estimations' },
  { pattern: routePaths.privacy, title: 'Confidentialité' },
];

export function getRouteTitle(pathname: string): string {
  return routeMetadata.find(({ pattern }) => matchPath({ path: pattern, end: true }, pathname))?.title
    ?? 'SportPilot';
}
