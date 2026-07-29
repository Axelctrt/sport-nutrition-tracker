import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityChanges, EntityId, NewEntity } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  ExerciseEquipment,
  ExerciseSource,
  MuscleGroup,
} from '@/domain/models/strength';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';

export interface ExerciseFilters {
  query?: string;
  muscleGroup?: MuscleGroup | 'all';
  equipment?: ExerciseEquipment | 'all';
  source?: ExerciseSource | 'all';
  includeArchived?: boolean;
}

export function normalizeExerciseName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1]! + 1,
        previous[rightIndex]! + 1,
        previous[rightIndex - 1]!
          + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length] ?? 0;
}

function similarityScore(left: string, right: string): number {
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.9;
  const leftTokens = new Set(left.split(' '));
  const rightTokens = new Set(right.split(' '));
  const sharedTokenCount = [...leftTokens].filter((token) =>
    rightTokens.has(token),
  ).length;
  const tokenScore =
    sharedTokenCount / Math.max(leftTokens.size, rightTokens.size);
  const distanceScore =
    1 - editDistance(left, right) / Math.max(left.length, right.length);
  return Math.max(tokenScore, distanceScore);
}

export function findSimilarExerciseDefinitions(
  exercises: readonly ExerciseDefinition[],
  query: string,
  limit = 4,
): ExerciseDefinition[] {
  const normalizedQuery = normalizeExerciseName(query);
  if (normalizedQuery.length < 2) return [];
  return exercises
    .map((exercise) => ({
      exercise,
      score: similarityScore(
        normalizedQuery,
        normalizeExerciseName(exercise.name),
      ),
    }))
    .filter(({ score }) => score >= 0.45)
    .sort((left, right) =>
      right.score - left.score
      || left.exercise.name.localeCompare(right.exercise.name, 'fr'),
    )
    .slice(0, limit)
    .map(({ exercise }) => exercise);
}

export function filterExerciseDefinitions(
  exercises: readonly ExerciseDefinition[],
  filters: ExerciseFilters = {},
): ExerciseDefinition[] {
  const query = normalizeExerciseName(filters.query ?? '');

  return exercises
    .filter((exercise) => filters.includeArchived || !exercise.isArchived)
    .filter((exercise) => filters.muscleGroup === undefined || filters.muscleGroup === 'all'
      || exercise.primaryMuscleGroup === filters.muscleGroup
      || exercise.secondaryMuscleGroups.includes(filters.muscleGroup))
    .filter((exercise) => filters.equipment === undefined || filters.equipment === 'all'
      || exercise.equipment === filters.equipment)
    .filter((exercise) => filters.source === undefined || filters.source === 'all'
      || exercise.source === filters.source)
    .filter((exercise) => query.length === 0
      || normalizeExerciseName(exercise.name).includes(query)
      || normalizeExerciseName(exercise.description ?? '').includes(query))
    .sort((left, right) => {
      if (left.isArchived !== right.isArchived) return left.isArchived ? 1 : -1;
      if (left.source !== right.source) return left.source === 'user' ? -1 : 1;
      return left.name.localeCompare(right.name, 'fr');
    });
}

export async function listExerciseDefinitions(
  repository: StrengthExerciseRepository,
  filters: ExerciseFilters = {},
): Promise<ExerciseDefinition[]> {
  return filterExerciseDefinitions(await repository.listAll(), filters);
}

export async function createCustomExercise(
  repository: StrengthExerciseRepository,
  input: Omit<NewEntity<ExerciseDefinition>, 'source' | 'isArchived'>,
): Promise<ExerciseDefinition> {
  const normalizedName = normalizeExerciseName(input.name);
  const duplicate = (await repository.listAll()).find(
    (exercise) => normalizeExerciseName(exercise.name) === normalizedName,
  );
  if (duplicate) {
    throw new RepositoryError(
      `Un exercice nommé « ${duplicate.name} » existe déjà.`,
      'create',
    );
  }
  return repository.create({
    ...input,
    source: 'user',
    isArchived: false,
  });
}

export async function updateCustomExercise(
  repository: StrengthExerciseRepository,
  id: EntityId,
  changes: EntityChanges<ExerciseDefinition>,
): Promise<ExerciseDefinition> {
  const exercise = await repository.getById(id);
  if (!exercise) throw new RepositoryError('Exercice introuvable.', 'update');
  if (exercise.source !== 'user') {
    throw new RepositoryError('Un exercice du catalogue système ne peut pas être modifié directement.', 'update');
  }
  const { source: _source, ...safeChanges } = changes;
  return repository.update(id, safeChanges);
}

export async function setCustomExerciseArchived(
  repository: StrengthExerciseRepository,
  id: EntityId,
  isArchived: boolean,
): Promise<ExerciseDefinition> {
  return updateCustomExercise(repository, id, { isArchived });
}

export async function duplicateExerciseDefinition(
  repository: StrengthExerciseRepository,
  id: EntityId,
): Promise<ExerciseDefinition> {
  const source = await repository.getById(id);
  if (!source) throw new RepositoryError('Exercice introuvable.', 'create');

  return repository.create({
    name: `${source.name} — copie`,
    primaryMuscleGroup: source.primaryMuscleGroup,
    secondaryMuscleGroups: [...source.secondaryMuscleGroups],
    equipment: source.equipment,
    category: source.category,
    movementType: source.movementType,
    loadUnit: source.loadUnit,
    ...(source.trackingMode ? { trackingMode: source.trackingMode } : {}),
    ...(source.description ? { description: source.description } : {}),
    source: 'user',
    isArchived: false,
  });
}
