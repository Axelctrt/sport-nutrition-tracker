import { ArrowLeft, Dumbbell, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { routePaths } from '@/app/routePaths';
import type { StrengthSetChanges } from '@/application/strength/strengthSetService';
import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';
import { ProgressionSuggestionsPanel } from '@/features/strength-progression/components/ProgressionSuggestionsPanel';
import { WorkoutExerciseCard } from '@/features/strength-sessions/components/WorkoutExerciseCard';
import { WorkoutSessionActionBar } from '@/features/strength-sessions/components/WorkoutSessionActionBar';
import { useWorkoutSession } from '@/features/strength-sessions/hooks/useWorkoutSession';
import { workoutSessionStatusLabel } from '@/features/strength-sessions/utils/sessionLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { SaveStatus } from '@/shared/ui/SaveStatus';
import { formatLocalDate } from '@/shared/utils/dates';

interface RemoveExerciseConfirmation {
  type: 'removeExercise';
  exercise: WorkoutSessionExercise;
}

interface DeleteSetConfirmation {
  type: 'deleteSet';
  sessionExerciseId: string;
  setId: string;
}

type ConfirmationRequest = RemoveExerciseConfirmation | DeleteSetConfirmation | { type: 'finish' } | { type: 'abandon' };

function revealElement(id: string): void {
  const reveal = () => document.getElementById(id)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
  } else {
    window.setTimeout(reveal, 0);
  }
}

function confirmationContent(request: ConfirmationRequest | undefined) {
  if (!request) return undefined;
  if (request.type === 'finish') {
    return {
      title: 'Terminer la séance ?',
      description: 'La séance passera dans l’historique et ne pourra plus être modifiée.',
      confirmLabel: 'Terminer la séance',
      tone: 'default' as const,
    };
  }
  if (request.type === 'abandon') {
    return {
      title: 'Abandonner la séance ?',
      description: 'Elle restera visible dans l’historique avec le statut abandonné.',
      confirmLabel: 'Abandonner',
      tone: 'danger' as const,
    };
  }
  if (request.type === 'removeExercise') {
    return {
      title: `Retirer « ${request.exercise.exerciseNameSnapshot} » ?`,
      description: 'L’exercice et toutes ses séries seront retirés de cette séance.',
      confirmLabel: 'Retirer l’exercice',
      tone: 'danger' as const,
    };
  }
  return {
    title: 'Supprimer cette série ?',
    description: 'Les séries suivantes seront automatiquement renumérotées.',
    confirmLabel: 'Supprimer la série',
    tone: 'danger' as const,
  };
}

export function WorkoutSessionPage() {
  const { sessionId = '' } = useParams();
  const navigate = useNavigate();
  const {
    session,
    exercises,
    strengthSets,
    progressionSuggestions,
    previousPerformances,
    availableExercises,
    status,
    errorMessage,
    action,
    saveStatus,
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
    decideProgression,
  } = useWorkoutSession(sessionId);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');
  const [notes, setNotes] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationRequest>();
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    setNotes(session?.notes ?? '');
  }, [session?.notes]);

  const setsByExercise = useMemo(() => {
    const result = new Map<string, StrengthSet[]>();
    for (const set of strengthSets) {
      const current = result.get(set.sessionExerciseId) ?? [];
      current.push(set);
      result.set(set.sessionExerciseId, current);
    }
    return result;
  }, [strengthSets]);

  const addSelectedExercise = async () => {
    if (!selectedExerciseId) return;
    const created = await addExercise(selectedExerciseId);
    if (!created) return;
    setSelectedExerciseId('');
    revealElement(`workout-exercise-${created.id}`);
  };

  const handleAddSet = async (sessionExerciseId: string) => {
    const created = await addSet(sessionExerciseId);
    if (!created) return;
    revealElement(`strength-set-${created.id}`);
  };

  const handleSaveSet = async (sessionExerciseId: string, setId: string, values: StrengthSetChanges) => {
    await saveSet(sessionExerciseId, setId, values);
  };

  const handleCompleteSet = async (
    sessionExerciseId: string,
    setId: string,
    values: StrengthSetChanges,
    isCompleted: boolean,
  ) => {
    await completeSet(sessionExerciseId, setId, values, isCompleted);
  };

  const handleDuplicateSet = async (sessionExerciseId: string, setId: string) => {
    const created = await duplicateSet(sessionExerciseId, setId);
    if (!created) return;
    revealElement(`strength-set-${created.id}`);
  };

  const handleReusePreviousSets = async (sessionExerciseId: string) => {
    const copied = await reusePreviousSets(sessionExerciseId);
    if (!copied) return;
    const lastSet = copied.at(-1);
    if (lastSet) revealElement(`strength-set-${lastSet.id}`);
  };

  const handleSaveNotes = async () => {
    await saveNotes(notes);
  };

  const resolveConfirmation = async () => {
    if (!confirmation) return;
    setIsConfirming(true);
    try {
      if (confirmation.type === 'finish') {
        const completed = await complete();
        if (completed) {
          await navigate(routePaths.workoutSessions);
        }
      } else if (confirmation.type === 'abandon') {
        const abandoned = await abandon();
        if (abandoned) {
          await navigate(routePaths.workoutSessions);
        }
      } else if (confirmation.type === 'removeExercise') {
        await removeExercise(confirmation.exercise.id);
      } else {
        await removeSet(confirmation.sessionExerciseId, confirmation.setId);
      }
    } finally {
      setIsConfirming(false);
      setConfirmation(undefined);
    }
  };

  if (status === 'loading') {
    return <PageSkeleton variant="workout" />;
  }

  if (!session) {
    return (
      <InlineNotice tone="error" title="Séance introuvable">
        <p>{errorMessage ?? 'Cette séance n’existe pas.'}</p>
        <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
          Réessayer
        </Button>
        <Link className="mt-3 ml-3 inline-flex font-semibold text-brand-700 hover:underline dark:text-brand-300" to={routePaths.workoutSessions}>
          Retour aux entraînements
        </Link>
      </InlineNotice>
    );
  }

  const editable = session.status === 'inProgress';
  const dialogContent = confirmationContent(confirmation);

  return (
    <section className={editable ? 'pb-24 lg:pb-0' : undefined} aria-labelledby="workout-session-title">
      <Link
        to={routePaths.workoutSessions}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour aux entraînements
      </Link>

      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              {workoutSessionStatusLabel(session.status)}
            </p>
            {editable ? <SaveStatus status={saveStatus} className="hidden lg:inline-flex" /> : null}
          </div>
          <h1 id="workout-session-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            {getWorkoutSessionTitle(session)}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base dark:text-slate-300">
            {formatLocalDate(session.date)} · {exercises.length} exercice{exercises.length > 1 ? 's' : ''}
            {session.durationMinutes !== undefined ? ` · ${session.durationMinutes} min` : ''}
          </p>
        </div>
      </div>

      {editable ? (
        <WorkoutSessionActionBar
          session={session}
          saveStatus={saveStatus}
          isPending={Boolean(action) || isConfirming}
          onFinish={() => setConfirmation({ type: 'finish' })}
          onAbandon={() => setConfirmation({ type: 'abandon' })}
        />
      ) : null}

      {editable ? (
        <CollapsibleSection
          className="mt-6"
          title="Ajouter un exercice"
          description="Complète la séance avec un exercice du catalogue."
          summary={`${availableExercises.length} disponible${availableExercises.length > 1 ? 's' : ''}`}
          defaultOpen={exercises.length === 0}
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <label htmlFor="session-exercise-select" className="sr-only">Exercice à ajouter</label>
              <select
                id="session-exercise-select"
                value={selectedExerciseId}
                onChange={(event) => setSelectedExerciseId(event.target.value)}
                className={inputClassName}
              >
                <option value="">Choisir dans le catalogue</option>
                {availableExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </select>
            </div>
            <Button disabled={!selectedExerciseId || action === 'addExercise'} onClick={() => void addSelectedExercise()}>
              <Plus aria-hidden="true" className="size-4" />
              {action === 'addExercise' ? 'Ajout…' : 'Ajouter'}
            </Button>
          </div>
          {availableExercises.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Tous les exercices actifs du catalogue sont déjà présents.
            </p>
          ) : null}
        </CollapsibleSection>
      ) : null}

      <div className="mt-6 space-y-4">
        {exercises.length === 0 ? (
          <EmptyState
            icon={Dumbbell}
            title="Aucun exercice"
            description="Choisis un exercice dans le bloc ci-dessus pour commencer ta séance."
          />
        ) : exercises.map((exercise, index) => (
          <WorkoutExerciseCard
            key={exercise.id}
            exercise={exercise}
            index={index}
            exerciseCount={exercises.length}
            sets={setsByExercise.get(exercise.id) ?? []}
            performance={previousPerformances[exercise.id]}
            editable={editable}
            action={action}
            onMove={moveExercise}
            onRemove={(candidate) => setConfirmation({ type: 'removeExercise', exercise: candidate })}
            onReusePreviousSets={handleReusePreviousSets}
            onAddSet={handleAddSet}
            onSaveSet={handleSaveSet}
            onCompleteSet={handleCompleteSet}
            onDuplicateSet={handleDuplicateSet}
            onDeleteSet={(sessionExerciseId, setId) => setConfirmation({ type: 'deleteSet', sessionExerciseId, setId })}
          />
        ))}
      </div>

      {session.status === 'completed' ? (
        <ProgressionSuggestionsPanel
          suggestions={progressionSuggestions}
          exercises={exercises}
          action={action}
          onDecision={decideProgression}
        />
      ) : null}

      <CollapsibleSection
        className="mt-6"
        title="Notes générales"
        description="Ressenti, matériel ou consignes pour la séance."
        summary={notes.trim() ? 'Renseignées' : 'Facultatif'}
        defaultOpen={Boolean(notes.trim()) && !editable}
      >
        <label htmlFor="workout-session-notes" className="sr-only">Notes générales</label>
        <textarea
          id="workout-session-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          disabled={!editable}
          rows={4}
          enterKeyHint="done"
          className={inputClassName}
          placeholder="Ressenti, matériel, consignes…"
        />
        {editable ? (
          <Button
            className="mt-3 w-full sm:w-auto"
            variant="secondary"
            disabled={action === 'notes' || notes === (session.notes ?? '')}
            onClick={() => void handleSaveNotes()}
          >
            <Save aria-hidden="true" className="size-4" />
            {action === 'notes' ? 'Enregistrement…' : 'Enregistrer les notes'}
          </Button>
        ) : null}
      </CollapsibleSection>

      {dialogContent ? (
        <ConfirmationDialog
          open
          title={dialogContent.title}
          description={dialogContent.description}
          confirmLabel={dialogContent.confirmLabel}
          tone={dialogContent.tone}
          isPending={isConfirming}
          onConfirm={() => void resolveConfirmation()}
          onCancel={() => setConfirmation(undefined)}
        />
      ) : null}
    </section>
  );
}
