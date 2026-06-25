import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import {
  createCustomExercise,
  updateCustomExercise,
} from '@/application/strength/exerciseDefinitionService';
import type { ExerciseDefinition } from '@/domain/models/strength';
import { StrengthExerciseForm } from '@/features/strength-exercises/components/StrengthExerciseForm';
import type { StrengthExerciseFormValues } from '@/features/strength-exercises/schemas/strengthExerciseSchema';
import {
  defaultStrengthExerciseFormValues,
  exerciseToFormValues,
  formValuesToExerciseInput,
} from '@/features/strength-exercises/utils/strengthExerciseForm';
import { repositories } from '@/infrastructure/repositories/repositories';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function StrengthExerciseEditorPage() {
  const { exerciseId } = useParams();
  const navigate = useNavigate();
  const [exercise, setExercise] = useState<ExerciseDefinition>();
  const [loading, setLoading] = useState(Boolean(exerciseId));
  const [errorMessage, setErrorMessage] = useState<string>();
  const initialValues = useMemo(
    () => exercise ? exerciseToFormValues(exercise) : defaultStrengthExerciseFormValues,
    [exercise],
  );

  useEffect(() => {
    if (!exerciseId) return;
    let active = true;
    void repositories.strengthExercises.getById(exerciseId)
      .then((found) => {
        if (!active) return;
        if (!found) setErrorMessage('Exercice introuvable.');
        else if (found.source !== 'user') setErrorMessage('Les exercices du catalogue système doivent être dupliqués avant modification.');
        else setExercise(found);
      })
      .catch((error: unknown) => {
        if (active) setErrorMessage(error instanceof Error ? error.message : 'Impossible de charger cet exercice.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [exerciseId]);

  const handleSubmit = async (values: StrengthExerciseFormValues) => {
    const input = formValuesToExerciseInput(values);
    if (exerciseId) await updateCustomExercise(repositories.strengthExercises, exerciseId, input);
    else await createCustomExercise(repositories.strengthExercises, input);
    await navigate(routePaths.strengthExercises);
  };

  return (
    <section aria-labelledby="strength-exercise-editor-title">
      <Link to={routePaths.strengthExercises} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au catalogue
      </Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
        <h1 id="strength-exercise-editor-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{exerciseId ? 'Modifier un exercice personnel' : 'Créer un exercice personnel'}</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">L’exercice sera stocké uniquement sur cet appareil et restera disponible hors connexion.</p>
      </div>

      {loading ? <Card className="mt-8 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement de l’exercice…</p></Card> : null}
      {errorMessage ? <InlineNotice className="mt-8" tone="error" title="Exercice indisponible">{errorMessage}</InlineNotice> : null}
      {!loading && !errorMessage ? <Card className="mt-8 p-5 sm:p-7"><StrengthExerciseForm initialValues={initialValues} submitLabel={exercise ? 'Enregistrer les modifications' : 'Créer l’exercice'} onSubmit={handleSubmit} /></Card> : null}
    </section>
  );
}
