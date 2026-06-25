import { RepositoryError } from '@/domain/errors/RepositoryError';
import type { EntityId, NewEntity } from '@/domain/models/common';
import type {
  ExerciseDefinition,
  WorkoutTemplate,
  WorkoutTemplateExercise,
} from '@/domain/models/strength';
import type { StrengthExerciseRepository } from '@/infrastructure/repositories/contracts/StrengthExerciseRepository';
import type {
  WorkoutTemplateDetails,
  WorkoutTemplateRepository,
} from '@/infrastructure/repositories/contracts/WorkoutTemplateRepository';

export type WorkoutTemplateExerciseInput = Omit<NewEntity<WorkoutTemplateExercise>, 'templateId' | 'sortOrder'>;

export interface WorkoutTemplateInput {
  name: string;
  description?: string;
  notes?: string;
  exercises: WorkoutTemplateExerciseInput[];
}

export interface WorkoutTemplateSummary {
  template: WorkoutTemplate;
  exerciseCount: number;
}

export interface WorkoutTemplateExerciseView {
  configuration: WorkoutTemplateExercise;
  exercise: ExerciseDefinition;
}

export interface WorkoutTemplateView {
  template: WorkoutTemplate;
  exercises: WorkoutTemplateExerciseView[];
}

function validateTemplateInput(input: WorkoutTemplateInput): void {
  const name = input.name.trim();
  if (name.length < 2) throw new RepositoryError('Le nom de la séance doit contenir au moins 2 caractères.', 'create');
  if (input.exercises.length === 0) throw new RepositoryError('Ajoute au moins un exercice à la séance.', 'create');

  const exerciseIds = new Set<string>();
  for (const exercise of input.exercises) {
    if (exerciseIds.has(exercise.exerciseDefinitionId)) {
      throw new RepositoryError('Un même exercice ne peut apparaître qu’une fois dans la séance.', 'create');
    }
    exerciseIds.add(exercise.exerciseDefinitionId);
    if (exercise.plannedSets < 1 || exercise.plannedSets > 20) {
      throw new RepositoryError('Le nombre de séries doit être compris entre 1 et 20.', 'create');
    }
    if (exercise.minRepetitions < 1 || exercise.maxRepetitions < exercise.minRepetitions) {
      throw new RepositoryError('La fourchette de répétitions est invalide.', 'create');
    }
    if (exercise.loadIncrementKg <= 0) {
      throw new RepositoryError('L’incrément de charge doit être supérieur à zéro.', 'create');
    }
  }
}

function prepareExerciseInputs(
  exercises: WorkoutTemplateExerciseInput[],
): Array<Omit<NewEntity<WorkoutTemplateExercise>, 'templateId'>> {
  return exercises.map((exercise, sortOrder) => ({
    ...exercise,
    sortOrder,
    isActive: exercise.isActive ?? true,
  }));
}

function prepareTemplateInput(input: WorkoutTemplateInput): NewEntity<WorkoutTemplate> {
  return {
    name: input.name.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
    isArchived: false,
  };
}

export async function listWorkoutTemplates(
  repository: WorkoutTemplateRepository,
  includeArchived = false,
): Promise<WorkoutTemplateSummary[]> {
  const templates = await repository.listAll();
  const summaries = await Promise.all(templates.map(async (template) => ({
    template,
    exerciseCount: (await repository.listExercises(template.id)).filter((exercise) => exercise.isActive).length,
  })));

  return summaries
    .filter(({ template }) => includeArchived || !template.isArchived)
    .sort((left, right) => {
      if (left.template.isArchived !== right.template.isArchived) return left.template.isArchived ? 1 : -1;
      return left.template.name.localeCompare(right.template.name, 'fr');
    });
}

export async function getWorkoutTemplateView(
  templateRepository: WorkoutTemplateRepository,
  exerciseRepository: StrengthExerciseRepository,
  templateId: EntityId,
): Promise<WorkoutTemplateView> {
  const template = await templateRepository.getById(templateId);
  if (!template) throw new RepositoryError('Séance modèle introuvable.', 'read');

  const configurations = await templateRepository.listExercises(templateId);
  const definitions = new Map((await exerciseRepository.listAll()).map((exercise) => [exercise.id, exercise]));
  const exercises = configurations.map((configuration) => {
    const exercise = definitions.get(configuration.exerciseDefinitionId);
    if (!exercise) throw new RepositoryError('Un exercice de cette séance est introuvable.', 'read');
    return { configuration, exercise };
  });

  return { template, exercises };
}

export async function createWorkoutTemplate(
  repository: WorkoutTemplateRepository,
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplateDetails> {
  validateTemplateInput(input);
  return repository.createWithExercises(prepareTemplateInput(input), prepareExerciseInputs(input.exercises));
}

export async function updateWorkoutTemplate(
  repository: WorkoutTemplateRepository,
  templateId: EntityId,
  input: WorkoutTemplateInput,
): Promise<WorkoutTemplateDetails> {
  validateTemplateInput(input);
  return repository.updateWithExercises(templateId, {
    name: input.name.trim(),
    description: input.description?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
  }, prepareExerciseInputs(input.exercises));
}

export async function duplicateWorkoutTemplate(
  repository: WorkoutTemplateRepository,
  templateId: EntityId,
): Promise<WorkoutTemplateDetails> {
  const template = await repository.getById(templateId);
  if (!template) throw new RepositoryError('Séance modèle introuvable.', 'create');
  const exercises = await repository.listExercises(templateId);
  return repository.createWithExercises({
    name: `${template.name} — copie`,
    ...(template.description ? { description: template.description } : {}),
    ...(template.notes ? { notes: template.notes } : {}),
    isArchived: false,
  }, exercises.map(({ templateId: _templateId, id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...exercise }) => exercise));
}

export function setWorkoutTemplateArchived(
  repository: WorkoutTemplateRepository,
  templateId: EntityId,
  isArchived: boolean,
): Promise<WorkoutTemplate> {
  return repository.update(templateId, { isArchived });
}
