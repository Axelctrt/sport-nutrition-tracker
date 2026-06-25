import { ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, CircleStop, Dumbbell, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { routePaths } from '@/app/routePaths';
import { StrengthSetEditor } from '@/features/strength-sessions/components/StrengthSetEditor';
import { PreviousExercisePerformance } from '@/features/strength-history/components/PreviousExercisePerformance';
import { useWorkoutSession } from '@/features/strength-sessions/hooks/useWorkoutSession';
import { workoutSessionStatusLabel } from '@/features/strength-sessions/utils/sessionLabels';
import { loadUnitLabel } from '@/features/strength-exercises/utils/exerciseLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

export function WorkoutSessionPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const {
    session,
    exercises,
    strengthSets,
    previousPerformances,
    availableExercises,
    status,
    errorMessage,
    action,
    refresh,
    addExercise,
    removeExercise,
    moveExercise,
    saveNotes,
    complete,
    abandon,
    addSet,
    saveSet,
    completeSet,
    duplicateSet,
    removeSet,
    reusePreviousSets,
  } = useWorkoutSession(sessionId);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    setNotes(session?.notes ?? '');
  }, [session?.notes]);

  const addSelectedExercise = async () => {
    if (!selectedExerciseId) return;
    const created = await addExercise(selectedExerciseId);
    if (created) setSelectedExerciseId('');
  };

  const confirmRemove = async (exerciseId: string, name: string) => {
    if (window.confirm(`Retirer « ${name} » de cette séance ?`)) await removeExercise(exerciseId);
  };


  const confirmDeleteSet = async (sessionExerciseId: string, setId: string) => {
    if (window.confirm('Supprimer cette série ? Les séries suivantes seront renumérotées.')) {
      await removeSet(sessionExerciseId, setId);
    }
  };

  const finishSession = async () => {
    if (!window.confirm('Terminer cette séance ? Elle passera dans l’historique.')) return;
    const completed = await complete();
    if (completed) await navigate(routePaths.workoutSessions);
  };

  const abandonSession = async () => {
    if (!window.confirm('Abandonner cette séance ? Elle sera conservée dans l’historique comme abandonnée.')) return;
    const abandoned = await abandon();
    if (abandoned) await navigate(routePaths.workoutSessions);
  };

  if (status === 'loading') {
    return <Card className="p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement de la séance…</p></Card>;
  }

  if (!session) {
    return <InlineNotice tone="error" title="Séance introuvable"><p>{errorMessage ?? 'Cette séance n’existe pas.'}</p><Link className="mt-3 inline-flex font-semibold text-brand-700 hover:underline dark:text-brand-300" to={routePaths.workoutSessions}>Retour aux entraînements</Link></InlineNotice>;
  }

  const editable = session.status === 'inProgress';

  return (
    <section aria-labelledby="workout-session-title">
      <Link to={routePaths.workoutSessions} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"><ArrowLeft aria-hidden="true" className="size-4" />Retour aux entraînements</Link>
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">{workoutSessionStatusLabel(session.status)}</p>
          <h1 id="workout-session-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{getWorkoutSessionTitle(session)}</h1>
          <p className="mt-3 text-slate-600 dark:text-slate-300">{formatLocalDate(session.date)} · {exercises.length} exercice{exercises.length > 1 ? 's' : ''}{session.durationMinutes !== undefined ? ` · ${session.durationMinutes} min` : ''}</p>
        </div>
        {editable ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="danger" disabled={Boolean(action)} onClick={() => void abandonSession()}><CircleStop aria-hidden="true" className="size-4" />Abandonner</Button>
            <Button disabled={Boolean(action)} onClick={() => void finishSession()}><CheckCircle2 aria-hidden="true" className="size-4" />Terminer</Button>
          </div>
        ) : null}
      </div>

      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Action impossible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}

      {editable ? (
        <Card className="mt-8 p-5 sm:p-6">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Ajouter un exercice</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label htmlFor="session-exercise-select" className="sr-only">Exercice à ajouter</label>
              <select id="session-exercise-select" value={selectedExerciseId} onChange={(event) => setSelectedExerciseId(event.target.value)} className={inputClassName}>
                <option value="">Choisir dans le catalogue</option>
                {availableExercises.map((exercise) => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}
              </select>
            </div>
            <Button disabled={!selectedExerciseId || action === 'addExercise'} onClick={() => void addSelectedExercise()}><Plus aria-hidden="true" className="size-4" />Ajouter</Button>
          </div>
          {availableExercises.length === 0 ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Tous les exercices actifs du catalogue sont déjà présents.</p> : null}
        </Card>
      ) : null}

      <div className="mt-8 space-y-4">
        {exercises.length === 0 ? (
          <Card className="p-8 text-center"><Dumbbell aria-hidden="true" className="mx-auto size-10 text-slate-400" /><h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Aucun exercice</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Ajoute un exercice du catalogue pour préparer cette séance.</p></Card>
        ) : exercises.map((exercise, index) => (
          <Card key={exercise.id} className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Exercice {index + 1}</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{exercise.exerciseNameSnapshot}</h2>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                  {exercise.plannedSets !== undefined ? <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">{exercise.plannedSets} séries prévues</span> : null}
                  {exercise.minRepetitions !== undefined && exercise.maxRepetitions !== undefined ? <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">{exercise.minRepetitions}–{exercise.maxRepetitions} répétitions</span> : null}
                  {exercise.targetLoadKg !== undefined ? <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">Cible : {exercise.targetLoadKg} kg</span> : null}
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">Charge : {loadUnitLabel(exercise.loadUnitSnapshot)}</span>
                </div>
                {exercise.notes ? <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{exercise.notes}</p> : null}
              </div>
              {editable ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" size="sm" aria-label={`Monter ${exercise.exerciseNameSnapshot}`} disabled={index === 0 || Boolean(action)} onClick={() => void moveExercise(exercise.id, -1)}><ArrowUp aria-hidden="true" className="size-4" /></Button>
                  <Button variant="secondary" size="sm" aria-label={`Descendre ${exercise.exerciseNameSnapshot}`} disabled={index === exercises.length - 1 || Boolean(action)} onClick={() => void moveExercise(exercise.id, 1)}><ArrowDown aria-hidden="true" className="size-4" /></Button>
                  <Button variant="danger" size="sm" disabled={Boolean(action)} onClick={() => void confirmRemove(exercise.id, exercise.exerciseNameSnapshot)}><Trash2 aria-hidden="true" className="size-4" />Retirer</Button>
                </div>
              ) : null}
            </div>
            <PreviousExercisePerformance
              exerciseDefinitionId={exercise.exerciseDefinitionId}
              performance={previousPerformances[exercise.id]}
              editable={editable}
              hasCurrentSets={strengthSets.some((set) => set.sessionExerciseId === exercise.id)}
              isCopying={action === `reusePreviousSets:${exercise.id}`}
              onCopy={() => reusePreviousSets(exercise.id)}
            />
            <StrengthSetEditor
              exercise={exercise}
              sets={strengthSets.filter((set) => set.sessionExerciseId === exercise.id)}
              editable={editable}
              action={action}
              onAdd={addSet}
              onSave={saveSet}
              onCompletion={completeSet}
              onDuplicate={duplicateSet}
              onDelete={confirmDeleteSet}
            />
          </Card>
        ))}
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <label htmlFor="workout-session-notes" className="text-lg font-semibold text-slate-950 dark:text-white">Notes générales</label>
        <textarea id="workout-session-notes" value={notes} onChange={(event) => setNotes(event.target.value)} disabled={!editable} rows={4} className={`${inputClassName} mt-3`} placeholder="Ressenti, matériel, consignes…" />
        {editable ? <Button className="mt-3" variant="secondary" disabled={action === 'notes'} onClick={() => void saveNotes(notes)}><Save aria-hidden="true" className="size-4" />{action === 'notes' ? 'Enregistrement…' : 'Enregistrer les notes'}</Button> : null}
      </Card>

      {editable ? <InlineNotice className="mt-6" title="Saisie enregistrée localement">Les exercices, les séries et leur état de validation restent disponibles après fermeture de l’application.</InlineNotice> : null}
    </section>
  );
}
