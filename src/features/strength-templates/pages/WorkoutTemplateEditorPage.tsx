import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  editWorkoutTemplatePath,
  routePaths,
} from '@/app/routePaths';
import {
  createWorkoutTemplate,
  getWorkoutTemplateView,
  updateWorkoutTemplate,
  type WorkoutTemplateView,
} from '@/application/strength/workoutTemplateService';
import type { ExerciseDefinition } from '@/domain/models/strength';
import { WorkoutTemplateForm } from '@/features/strength-templates/components/WorkoutTemplateForm';
import {
  workoutTemplateDraftSchema,
  type WorkoutTemplateFormValues,
} from '@/features/strength-templates/schemas/workoutTemplateSchema';
import {
  defaultWorkoutTemplateExerciseValues,
  defaultWorkoutTemplateFormValues,
  workoutTemplateFormValuesToInput,
  workoutTemplateViewToFormValues,
} from '@/features/strength-templates/utils/workoutTemplateForm';
import {
  newStrengthExercisePath,
  type StrengthExerciseCreatedNavigationState,
} from '@/features/strength-exercises/navigation/strengthExerciseCreationNavigation';
import { repositories } from '@/infrastructure/repositories/repositories';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function WorkoutTemplateEditorPage() {
  const actionToast = useActionToast();
  const { templateId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationState =
    location.state as StrengthExerciseCreatedNavigationState | null;
  const [view, setView] = useState<WorkoutTemplateView>();
  const [restoredDraft, setRestoredDraft] = useState<WorkoutTemplateFormValues>();
  const [initialExerciseQuery, setInitialExerciseQuery] = useState('');
  const [highlightedExerciseId, setHighlightedExerciseId] = useState<string>();
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const initialValues = useMemo(
    () => restoredDraft
      ?? (view
        ? workoutTemplateViewToFormValues(view)
        : defaultWorkoutTemplateFormValues),
    [restoredDraft, view],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      repositories.strengthExercises.listAll(),
      templateId ? getWorkoutTemplateView(repositories.workoutTemplates, repositories.strengthExercises, templateId) : Promise.resolve(undefined),
    ]).then(([definitions, loadedView]) => {
      if (!active) return;
      setExerciseDefinitions(definitions.sort((left, right) => left.name.localeCompare(right.name, 'fr')));
      setView(loadedView);
      const context = navigationState?.strengthExerciseCreationContext;
      if (context?.returnTo === 'template') {
        setInitialExerciseQuery(context.query);
        try {
          const rawDraft = sessionStorage.getItem(context.draftKey);
          const parsedDraft = rawDraft
            ? workoutTemplateDraftSchema.safeParse(JSON.parse(rawDraft))
            : undefined;
          if (!parsedDraft?.success) {
            throw new Error('Brouillon temporaire invalide.');
          }
          const draft = structuredClone(parsedDraft.data);
          const created = navigationState?.strengthExerciseCreated;
          if (created) {
            draft.exercises.splice(context.insertionIndex, 0, {
              ...defaultWorkoutTemplateExerciseValues,
              exerciseDefinitionId: created.exerciseId,
            });
            setHighlightedExerciseId(created.exerciseId);
            actionToast.success({
              key: `strength-exercise-created-added:${created.exerciseId}`,
              title: 'Exercice créé et ajouté.',
            });
            window.setTimeout(
              () => setHighlightedExerciseId(undefined),
              2_500,
            );
          }
          setRestoredDraft(draft);
          sessionStorage.removeItem(context.draftKey);
        } catch {
          setErrorMessage(
            'Le brouillon du modèle n’a pas pu être restauré. Aucune donnée enregistrée n’a été modifiée.',
          );
        }
        void navigate(
          templateId
            ? editWorkoutTemplatePath(templateId)
            : routePaths.newWorkoutTemplate,
          { replace: true },
        );
      }
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger cette séance.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [actionToast, navigate, navigationState, templateId]);

  const createExerciseFromSearch = (
    query: string,
    insertionIndex: number,
    draft: WorkoutTemplateFormValues,
  ) => {
    const draftKey = `strength-template-draft:${crypto.randomUUID()}`;
    try {
      sessionStorage.setItem(draftKey, JSON.stringify(draft));
    } catch (error) {
      actionToast.error({
        key: 'strength-template-draft',
        error,
        fallback: 'Le brouillon ne peut pas être conservé pour le moment.',
      });
      return;
    }
    void navigate(newStrengthExercisePath({
      returnTo: 'template',
      query,
      ...(templateId ? { templateId } : {}),
      insertionIndex,
      draftKey,
    }));
  };

  const handleSubmit = async (values: WorkoutTemplateFormValues) => {
    try {
      const input = workoutTemplateFormValuesToInput(values);
      if (templateId) await updateWorkoutTemplate(repositories.workoutTemplates, templateId, input);
      else await createWorkoutTemplate(repositories.workoutTemplates, input);
      actionToast.success({
        key: templateId ? `workout-template-update:${templateId}` : 'workout-template-create',
        title: templateId ? 'Séance modèle modifiée' : 'Séance modèle créée',
      });
      await navigate(routePaths.workoutTemplates);
    } catch (error) {
      actionToast.error({
        key: templateId ? `workout-template-update:${templateId}` : 'workout-template-create',
        error,
        fallback: 'La séance modèle n’a pas pu être enregistrée.',
      });
      throw error;
    }
  };

  return (
    <section aria-labelledby="workout-template-editor-title">
      <Link to={routePaths.workoutTemplates} className="hidden items-center gap-2 text-sm font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300"><ArrowLeft aria-hidden="true" className="size-4" />Retour aux séances modèles</Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
        <h1 id="workout-template-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{templateId ? 'Modifier une séance modèle' : 'Créer une séance modèle'}</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Les futures séances réalisées seront indépendantes de ce modèle afin de préserver l’historique.</p>
      </div>

      {loading ? <PageSkeleton className="mt-6" variant="form" /> : null}
      {errorMessage ? <InlineNotice className="mt-8" tone="error" title="Séance indisponible">{errorMessage}</InlineNotice> : null}
      {!loading && !errorMessage ? (
        <Card className="mt-8 p-5 sm:p-7">
          <WorkoutTemplateForm
            initialValues={initialValues}
            exerciseDefinitions={exerciseDefinitions}
            submitLabel={templateId ? 'Enregistrer les modifications' : 'Créer la séance'}
            onSubmit={handleSubmit}
            onCreateExercise={createExerciseFromSearch}
            initialExerciseQuery={initialExerciseQuery}
            {...(highlightedExerciseId
              ? { highlightedExerciseId }
              : {})}
          />
        </Card>
      ) : null}
    </section>
  );
}
