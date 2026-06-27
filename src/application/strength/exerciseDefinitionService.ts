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

function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .trim();
}

export function filterExerciseDefinitions(
  exercises: readonly ExerciseDefinition[],
  filters: ExerciseFilters = {},
): ExerciseDefinition[] {
  const query = normalizeSearchValue(filters.query ?? '');

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
      || normalizeSearchValue(exercise.name).includes(query)
      || normalizeSearchValue(exercise.description ?? '').includes(query))
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

export function createCustomExercise(
  repository: StrengthExerciseRepository,
  input: Omit<NewEntity<ExerciseDefinition>, 'source' | 'isArchived'>,
): Promise<ExerciseDefinition> {
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
