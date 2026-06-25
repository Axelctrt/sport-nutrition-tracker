import { ArrowLeft } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import {
  createWorkoutTemplate,
  getWorkoutTemplateView,
  updateWorkoutTemplate,
  type WorkoutTemplateView,
} from '@/application/strength/workoutTemplateService';
import type { ExerciseDefinition } from '@/domain/models/strength';
import { WorkoutTemplateForm } from '@/features/strength-templates/components/WorkoutTemplateForm';
import type { WorkoutTemplateFormValues } from '@/features/strength-templates/schemas/workoutTemplateSchema';
import {
  defaultWorkoutTemplateFormValues,
  workoutTemplateFormValuesToInput,
  workoutTemplateViewToFormValues,
} from '@/features/strength-templates/utils/workoutTemplateForm';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function WorkoutTemplateEditorPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const [view, setView] = useState<WorkoutTemplateView>();
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string>();
  const initialValues = useMemo(() => view ? workoutTemplateViewToFormValues(view) : defaultWorkoutTemplateFormValues, [view]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      repositories.strengthExercises.listAll(),
      templateId ? getWorkoutTemplateView(repositories.workoutTemplates, repositories.strengthExercises, templateId) : Promise.resolve(undefined),
    ]).then(([definitions, loadedView]) => {
      if (!active) return;
      setExerciseDefinitions(definitions.sort((left, right) => left.name.localeCompare(right.name, 'fr')));
      setView(loadedView);
    }).catch((error: unknown) => {
      if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger cette séance.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [templateId]);

  const handleSubmit = async (values: WorkoutTemplateFormValues) => {
    const input = workoutTemplateFormValuesToInput(values);
    if (templateId) await updateWorkoutTemplate(repositories.workoutTemplates, templateId, input);
    else await createWorkoutTemplate(repositories.workoutTemplates, input);
    await navigate(routePaths.workoutTemplates);
  };

  return (
    <section aria-labelledby="workout-template-editor-title">
      <Link to={routePaths.workoutTemplates} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"><ArrowLeft aria-hidden="true" className="size-4" />Retour aux séances modèles</Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
        <h1 id="workout-template-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{templateId ? 'Modifier une séance modèle' : 'Créer une séance modèle'}</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Les futures séances réalisées seront indépendantes de ce modèle afin de préserver l’historique.</p>
      </div>

      {loading ? <PageSkeleton className="mt-6" variant="form" /> : null}
      {errorMessage ? <InlineNotice className="mt-8" tone="error" title="Séance indisponible">{errorMessage}</InlineNotice> : null}
      {!loading && !errorMessage ? <Card className="mt-8 p-5 sm:p-7"><WorkoutTemplateForm initialValues={initialValues} exerciseDefinitions={exerciseDefinitions} submitLabel={templateId ? 'Enregistrer les modifications' : 'Créer la séance'} onSubmit={handleSubmit} /></Card> : null}
    </section>
  );
}
