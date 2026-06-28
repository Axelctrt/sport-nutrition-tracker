import {
  editActivityPath,
  editFoodProductPath,
  editRecipePath,
  editStrengthExercisePath,
  editWorkoutTemplatePath,
  routePaths,
  weightPath,
  workoutSessionPath,
} from '@/app/routePaths';
import type { Activity } from '@/domain/models/activity';
import type {
  FavoriteMeal,
  FoodProduct,
} from '@/domain/models/food';
import type { Recipe } from '@/domain/models/recipe';
import type {
  ExerciseDefinition,
  WorkoutSession,
  WorkoutTemplate,
} from '@/domain/models/strength';
import type { WeightEntry } from '@/domain/models/weight';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';

export type GlobalSearchCategory =
  | 'activity'
  | 'foodProduct'
  | 'recipe'
  | 'favoriteMeal'
  | 'workoutSession'
  | 'workoutTemplate'
  | 'exercise'
  | 'weight';

export interface GlobalSearchResult {
  id: string;
  category: GlobalSearchCategory;
  title: string;
  subtitle: string;
  path: string;
  date?: string;
  keywords: string[];
}

export type GlobalSearchCategoryFilter =
  | GlobalSearchCategory
  | 'all';

export const GLOBAL_SEARCH_RESULT_LIMIT = 80;

const activityLabels: Record<Activity['type'], string> = {
  running: 'Course',
  swimming: 'Natation',
  cycling: 'Vélo',
  strengthTraining: 'Musculation',
  walking: 'Marche',
  otherCardio: 'Cardio',
};

const workoutStatusLabels: Record<
  WorkoutSession['status'],
  string
> = {
  planned: 'Planifiée',
  inProgress: 'En cours',
  completed: 'Terminée',
  abandoned: 'Abandonnée',
  skipped: 'Ignorée',
};

function compact(values: Array<string | undefined>): string[] {
  return values.filter(
    (value): value is string =>
      typeof value === 'string' && value.trim().length > 0,
  );
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function activityKeywords(activity: Activity): string[] {
  return compact([
    activity.type,
    activity.intensity,
    activity.notes,
    'sessionType' in activity
      ? String(activity.sessionType)
      : undefined,
    'terrainType' in activity
      ? activity.terrainType
      : undefined,
    'mainStroke' in activity
      ? activity.mainStroke
      : undefined,
    'bikeType' in activity
      ? activity.bikeType
      : undefined,
    'intervalDetails' in activity
      ? activity.intervalDetails
      : undefined,
  ]);
}

function activitySubtitle(activity: Activity): string {
  const details = [
    activity.date,
    `${activity.durationMinutes} min`,
  ];

  if ('distanceKm' in activity && activity.distanceKm) {
    details.push(`${activity.distanceKm} km`);
  }

  if (
    'distanceMeters' in activity &&
    activity.distanceMeters
  ) {
    details.push(`${activity.distanceMeters} m`);
  }

  return details.join(' · ');
}

function productSubtitle(product: FoodProduct): string {
  return compact([
    product.brand,
    `${product.nutritionPer100.caloriesKcal} kcal / 100 ${product.basisUnit}`,
    product.isFavorite ? 'Favori' : undefined,
  ]).join(' · ');
}

function recipeSubtitle(recipe: Recipe): string {
  return compact([
    `${recipe.numberOfServings} portion(s)`,
    recipe.notes,
  ]).join(' · ');
}

function favoriteMealSubtitle(meal: FavoriteMeal): string {
  return compact([
    meal.defaultSlot,
    `${meal.items.length} élément(s)`,
  ]).join(' · ');
}

function sessionTitle(session: WorkoutSession): string {
  return (
    session.sourceTemplateNameSnapshot?.trim() ||
    `Séance du ${session.date}`
  );
}

function sessionSubtitle(session: WorkoutSession): string {
  return compact([
    session.date,
    workoutStatusLabels[session.status],
    session.durationMinutes
      ? `${session.durationMinutes} min`
      : undefined,
    session.notes,
  ]).join(' · ');
}

function templateSubtitle(
  template: WorkoutTemplate,
): string {
  return compact([
    template.description,
    template.notes,
  ]).join(' · ');
}

const muscleGroupSearchAliases: Record<string, string[]> = {
  pectorals: ['pectoraux', 'poitrine', 'pecs'],
  back: ['dos', 'dorsaux'],
  upperBack: ['haut du dos', 'dorsaux'],
  lowerBack: ['bas du dos', 'lombaires'],
  lats: ['grand dorsal', 'dorsaux'],
  traps: ['trapèzes'],
  shoulders: ['épaules', 'deltoïdes'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['avant-bras'],
  abdominals: ['abdominaux', 'abdos'],
  core: ['gainage', 'sangle abdominale'],
  glutes: ['fessiers'],
  quadriceps: ['quadriceps', 'cuisses'],
  hamstrings: ['ischio-jambiers', 'ischios'],
  calves: ['mollets'],
  adductors: ['adducteurs'],
  abductors: ['abducteurs'],
  fullBody: ['corps entier', 'full body'],
};

function muscleGroupSearchKeywords(
  muscleGroup: string,
): string[] {
  return [
    muscleGroup,
    ...(muscleGroupSearchAliases[muscleGroup] ?? []),
  ];
}

function exerciseSubtitle(
  exercise: ExerciseDefinition,
): string {
  return compact([
    exercise.primaryMuscleGroup,
    exercise.equipment,
    exercise.category,
    exercise.description,
  ]).join(' · ');
}

function weightSubtitle(weight: WeightEntry): string {
  return compact([
    `Pesée du ${weight.date}`,
    weight.note,
  ]).join(' · ');
}

export async function buildGlobalSearchIndex(
  database: AppDatabase,
): Promise<GlobalSearchResult[]> {
  const [
    activities,
    foodProducts,
    recipes,
    favoriteMeals,
    workoutSessions,
    workoutTemplates,
    exerciseDefinitions,
    weights,
  ] = await Promise.all([
    database.activities.toArray(),
    database.foodProducts.toArray(),
    database.recipes.toArray(),
    database.favoriteMeals.toArray(),
    database.workoutSessions.toArray(),
    database.workoutTemplates.toArray(),
    database.exerciseDefinitions.toArray(),
    database.weights.toArray(),
  ]);

  return [
    ...activities.map((activity) => ({
      id: activity.id,
      category: 'activity' as const,
      title: `${activityLabels[activity.type]} du ${activity.date}`,
      subtitle: activitySubtitle(activity),
      path: editActivityPath(activity.id),
      date: activity.date,
      keywords: activityKeywords(activity),
    })),
    ...foodProducts
      .filter((product) => !product.isArchived)
      .map((product) => ({
        id: product.id,
        category: 'foodProduct' as const,
        title: product.name,
        subtitle: productSubtitle(product),
        path: editFoodProductPath(product.id),
        keywords: compact([
          product.brand,
          product.barcode,
          product.servingLabel,
          product.basisUnit,
        ]),
      })),
    ...recipes.map((recipe) => ({
      id: recipe.id,
      category: 'recipe' as const,
      title: recipe.name,
      subtitle: recipeSubtitle(recipe),
      path: editRecipePath(recipe.id),
      keywords: compact([recipe.notes]),
    })),
    ...favoriteMeals.map((meal) => ({
      id: meal.id,
      category: 'favoriteMeal' as const,
      title: meal.name,
      subtitle: favoriteMealSubtitle(meal),
      path: routePaths.favoriteMeals,
      keywords: compact([meal.defaultSlot]),
    })),
    ...workoutSessions.map((session) => ({
      id: session.id,
      category: 'workoutSession' as const,
      title: sessionTitle(session),
      subtitle: sessionSubtitle(session),
      path: workoutSessionPath(session.id),
      date: session.date,
      keywords: compact([
        session.status,
        session.sourceTemplateNameSnapshot,
        session.notes,
      ]),
    })),
    ...workoutTemplates
      .filter((template) => !template.isArchived)
      .map((template) => ({
        id: template.id,
        category: 'workoutTemplate' as const,
        title: template.name,
        subtitle: templateSubtitle(template),
        path: editWorkoutTemplatePath(template.id),
        keywords: compact([
          template.description,
          template.notes,
        ]),
      })),
    ...exerciseDefinitions
      .filter((exercise) => !exercise.isArchived)
      .map((exercise) => ({
        id: exercise.id,
        category: 'exercise' as const,
        title: exercise.name,
        subtitle: exerciseSubtitle(exercise),
        path: editStrengthExercisePath(exercise.id),
        keywords: compact([
          ...muscleGroupSearchKeywords(
            exercise.primaryMuscleGroup,
          ),
          ...exercise.secondaryMuscleGroups.flatMap(
            muscleGroupSearchKeywords,
          ),
          exercise.equipment,
          exercise.category,
          exercise.movementType,
          exercise.description,
        ]),
      })),
    ...weights.map((weight) => ({
      id: weight.id,
      category: 'weight' as const,
      title: `${weight.weightKg} kg`,
      subtitle: weightSubtitle(weight),
      path: weightPath(weight.date),
      date: weight.date,
      keywords: compact([
        weight.date,
        weight.note,
        String(weight.weightKg).replace('.', ','),
      ]),
    })),
  ];
}

function resultScore(
  result: GlobalSearchResult,
  normalizedQuery: string,
): number {
  const title = normalizeSearchText(result.title);
  const subtitle = normalizeSearchText(result.subtitle);
  const keywords = normalizeSearchText(
    result.keywords.join(' '),
  );

  if (title === normalizedQuery) return 100;
  if (title.startsWith(normalizedQuery)) return 90;
  if (title.includes(normalizedQuery)) return 80;
  if (subtitle.includes(normalizedQuery)) return 65;
  if (keywords.includes(normalizedQuery)) return 55;

  return 40;
}

export function searchGlobalIndex(
  index: readonly GlobalSearchResult[],
  query: string,
  category: GlobalSearchCategoryFilter = 'all',
  limit: number = GLOBAL_SEARCH_RESULT_LIMIT,
): GlobalSearchResult[] {
  const normalizedQuery = normalizeSearchText(query);

  if (normalizedQuery.length < 2) return [];

  const tokens = normalizedQuery.split(' ');

  return index
    .filter(
      (result) =>
        category === 'all' || result.category === category,
    )
    .map((result) => {
      const haystack = normalizeSearchText(
        [
          result.title,
          result.subtitle,
          ...result.keywords,
        ].join(' '),
      );

      return {
        result,
        haystack,
        score: resultScore(result, normalizedQuery),
      };
    })
    .filter(({ haystack }) =>
      tokens.every((token) => haystack.includes(token)),
    )
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      const dateComparison =
        (right.result.date ?? '').localeCompare(
          left.result.date ?? '',
        );

      if (dateComparison !== 0) return dateComparison;

      return left.result.title.localeCompare(
        right.result.title,
        'fr',
      );
    })
    .slice(0, limit)
    .map(({ result }) => result);
}
