import { ArrowLeft, Dumbbell, Plus, Save } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  filterExerciseDefinitions,
  findSimilarExerciseDefinitions,
  normalizeExerciseName,
} from '@/application/strength/exerciseDefinitionService';
import {
  buildWorkoutSessionProgress,
  type WorkoutSessionProgress,
} from '@/application/strength/workoutSessionProgress';
import {
  getWorkoutSessionTitle,
  LONG_WORKOUT_DURATION_MINUTES,
} from '@/application/strength/workoutSessionService';
import { routePaths, workoutSessionPath } from '@/app/routePaths';
import type { StrengthSetChanges } from '@/application/strength/strengthSetService';
import type { StrengthSet, WorkoutSessionExercise } from '@/domain/models/strength';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { buildExerciseGroups, exerciseGroupPosition, groupRestAfterExercise } from '@/domain/strength/exerciseGroups';
import { ProgressionSuggestionsPanel } from '@/features/strength-progression/components/ProgressionSuggestionsPanel';
import { WorkoutExerciseCard } from '@/features/strength-sessions/components/WorkoutExerciseCard';
import { WorkoutSessionActionBar } from '@/features/strength-sessions/components/WorkoutSessionActionBar';
import { WorkoutSessionProgressCard } from '@/features/strength-sessions/components/WorkoutSessionProgressCard';
import { RestTimerBar } from '@/features/strength-rest-timer/components/RestTimerBar';
import { defaultRestTimerPreferences, useRestTimer } from '@/features/strength-rest-timer/hooks/useRestTimer';
import { useWorkoutSession } from '@/features/strength-sessions/hooks/useWorkoutSession';
import { workoutSessionStatusLabel } from '@/features/strength-sessions/utils/sessionLabels';
import { inputClassName } from '@/shared/forms/formStyles';
import {
  newStrengthExercisePath,
  type StrengthExerciseCreatedNavigationState,
} from '@/features/strength-exercises/navigation/strengthExerciseCreationNavigation';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { SaveStatus } from '@/shared/ui/SaveStatus';
import { formatLocalDate } from '@/shared/utils/dates';
import { cn } from '@/shared/utils/cn';
import { repositories } from '@/infrastructure/repositories/repositories';
import {
  createWorkoutSessionFeedbackState,
  type WorkoutSessionNavigationState,
} from '@/features/strength-sessions/navigation/workoutSessionNavigation';

interface RemoveExerciseConfirmation {
  type: 'removeExercise';
  exercise: WorkoutSessionExercise;
}

interface DeleteSetConfirmation {
  type: 'deleteSet';
  sessionExerciseId: string;
  setId: string;
}

type ConfirmationRequest =
  | RemoveExerciseConfirmation
  | DeleteSetConfirmation
  | { type: 'finish'; allowLongDuration?: boolean }
  | { type: 'abandon' };

function revealElement(id: string, focus = false): void {
  const reveal = () => {
    const element = document.getElementById(id);
    element?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (focus) element?.focus({ preventScroll: true });
  };
  if (typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => window.requestAnimationFrame(reveal));
  } else {
    window.setTimeout(reveal, 0);
  }
}

function confirmationContent(
  request: ConfirmationRequest | undefined,
  progress: WorkoutSessionProgress,
) {
  if (!request) return undefined;
  if (request.type === 'finish') {
    const remainingDescription = progress.isComplete
      ? 'Toutes les séries prévues sont validées.'
      : progress.remainingSetCount > 0
        ? `Il reste ${progress.remainingSetCount} série${progress.remainingSetCount > 1 ? 's' : ''} prévue${progress.remainingSetCount > 1 ? 's' : ''} à valider.`
        : `Il reste ${progress.incompleteExerciseCount} exercice${progress.incompleteExerciseCount > 1 ? 's' : ''} sans série validée.`;
    return {
      title: 'Terminer la séance ?',
      description: request.allowLongDuration
        ? `${remainingDescription} Cette séance est ouverte depuis plus de 6 heures. Confirme que cette durée est correcte avant de l’enregistrer dans l’historique.`
        : `${remainingDescription} La séance passera dans l’historique et ne pourra plus être modifiée.`,
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
  const actionToast = useActionToast();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigationState = location.state as
    | (WorkoutSessionNavigationState & StrengthExerciseCreatedNavigationState)
    | null;
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
  const [selectedExerciseSetCount, setSelectedExerciseSetCount] = useState(4);
  const [exerciseQuery, setExerciseQuery] = useState('');
  const [highlightedExerciseId, setHighlightedExerciseId] = useState<string>();
  const [expandedExerciseId, setExpandedExerciseId] = useState<string>();
  const previousNextExerciseIdRef = useRef<string>();
  const hasInitializedExerciseExpansionRef = useRef(false);
  const handledCreatedExerciseRef = useRef<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationRequest>();
  const [temporarilySkippedExerciseIds, setTemporarilySkippedExerciseIds] = useState<Set<string>>(() => new Set());
  const [isConfirming, setIsConfirming] = useState(false);
  const [restTimerPreferences, setRestTimerPreferences] = useState(defaultRestTimerPreferences);
  const [restTimerPreferencesReady, setRestTimerPreferencesReady] = useState(false);
  const restTimer = useRestTimer(sessionId, restTimerPreferences);
  const filteredAvailableExercises = useMemo(
    () => filterExerciseDefinitions(availableExercises, {
      query: exerciseQuery,
    }),
    [availableExercises, exerciseQuery],
  );
  const similarExercises = useMemo(
    () => findSimilarExerciseDefinitions(availableExercises, exerciseQuery),
    [availableExercises, exerciseQuery],
  );

  useEffect(() => {
    let mounted = true;
    void repositories.settings.get().then((settings) => {
      if (!mounted) return;
      setRestTimerPreferences({
        autoStart: settings.restTimerAutoStart,
        soundEnabled: settings.restTimerSoundEnabled,
        vibrationEnabled: settings.restTimerVibrationEnabled,
      });
      setRestTimerPreferencesReady(true);
    }).catch(() => {
      const defaults = createDefaultAppSettings();
      if (!mounted) return;
      setRestTimerPreferences({
        autoStart: defaults.restTimerAutoStart,
        soundEnabled: defaults.restTimerSoundEnabled,
        vibrationEnabled: defaults.restTimerVibrationEnabled,
      });
      setRestTimerPreferencesReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setNotes(session?.notes ?? '');
  }, [session?.notes]);

  useEffect(() => {
    const context = navigationState?.strengthExerciseCreationContext;
    if (!context || context.returnTo !== 'session' || context.sessionId !== sessionId) {
      return;
    }
    const created = navigationState?.strengthExerciseCreated;
    if (!created) {
      setExerciseQuery(context.query);
      void navigate(workoutSessionPath(sessionId), { replace: true });
      return;
    }
    if (
      status !== 'ready'
      || handledCreatedExerciseRef.current === created.exerciseId
    ) return;
    handledCreatedExerciseRef.current = created.exerciseId;
    void (async () => {
      const sessionExercise = await addExercise(created.exerciseId);
      if (!sessionExercise) return;
      for (let index = 0; index < context.plannedSets; index += 1) {
        await addSet(sessionExercise.id);
      }
      setExerciseQuery('');
      setSelectedExerciseId('');
      setHighlightedExerciseId(sessionExercise.id);
      setExpandedExerciseId(sessionExercise.id);
      revealElement(`workout-exercise-${sessionExercise.id}`);
      actionToast.success({
        key: `strength-exercise-created-added:${created.exerciseId}`,
        title: 'Exercice créé et ajouté.',
      });
      await navigate(workoutSessionPath(sessionId), { replace: true });
      window.setTimeout(() => setHighlightedExerciseId(undefined), 2_500);
    })();
  }, [
    actionToast,
    addExercise,
    addSet,
    navigate,
    navigationState,
    sessionId,
    status,
  ]);

  const exerciseGroups = useMemo(() => buildExerciseGroups(exercises), [exercises]);

  const restPlanFor = (exercise: WorkoutSessionExercise) => {
    const groupRest = groupRestAfterExercise(exercise, exerciseGroups);
    if (groupRest) {
      const nextExercise = groupRest.nextExercise as WorkoutSessionExercise | undefined;
      return {
        durationSeconds: groupRest.durationSeconds,
        nextExercise,
        label: groupRest.betweenRounds
          ? 'Repos avant le tour suivant'
          : `Transition vers ${nextExercise?.exerciseNameSnapshot ?? 'l’exercice suivant'}`,
      };
    }
    return {
      durationSeconds: exercise.restSeconds ?? 0,
      nextExercise: undefined,
      label: 'Démarrer le repos',
    };
  };

  const setsByExercise = useMemo(() => {
    const result = new Map<string, StrengthSet[]>();
    for (const set of strengthSets) {
      const current = result.get(set.sessionExerciseId) ?? [];
      current.push(set);
      result.set(set.sessionExerciseId, current);
    }
    return result;
  }, [strengthSets]);


  const progress = useMemo(
    () => buildWorkoutSessionProgress(exercises, strengthSets),
    [exercises, strengthSets],
  );

  useEffect(() => {
    const nextExerciseId = progress.nextStep?.exerciseId;
    const previousNextExerciseId = previousNextExerciseIdRef.current;
    previousNextExerciseIdRef.current = nextExerciseId;

    if (exercises.length === 0) {
      setExpandedExerciseId(undefined);
      return;
    }
    if (!hasInitializedExerciseExpansionRef.current) {
      hasInitializedExerciseExpansionRef.current = true;
      setExpandedExerciseId(nextExerciseId ?? exercises[0]?.id);
      return;
    }
    if (nextExerciseId && previousNextExerciseId && nextExerciseId !== previousNextExerciseId) {
      setExpandedExerciseId(nextExerciseId);
    } else if (!nextExerciseId && previousNextExerciseId) {
      setExpandedExerciseId(undefined);
    }
  }, [exercises, expandedExerciseId, progress.nextStep?.exerciseId]);

  useEffect(() => {
    if (searchParams.get('finish') !== 'true' || session?.status !== 'inProgress') return;
    setConfirmation({ type: 'finish' });
    const next = new URLSearchParams(searchParams);
    next.delete('finish');
    setSearchParams(next, { replace: true });
  }, [searchParams, session?.status, setSearchParams]);

  const revealWorkoutStep = (exerciseId: string, setId?: string) => {
    setExpandedExerciseId(exerciseId);
    revealElement(setId ? `strength-set-${setId}` : `workout-exercise-${exerciseId}`);
  };

  const addSelectedExercise = async () => {
    if (!selectedExerciseId) return;
    const created = await addExercise(selectedExerciseId);
    if (!created) return;
    setSelectedExerciseId('');
    const seriesToCreate = Math.max(1, Math.min(12, selectedExerciseSetCount));
    for (let index = 0; index < seriesToCreate; index += 1) {
      await addSet(created.id);
    }
    setExerciseQuery('');
    const selector = document.getElementById('workout-exercise-selector');
    if (selector instanceof HTMLDetailsElement) selector.open = false;
    revealElement(`workout-exercise-${created.id}`, true);
    setExpandedExerciseId(created.id);
  };

  const handleAddSet = async (sessionExerciseId: string) => {
    const created = await addSet(sessionExerciseId);
    if (!created) return;
    revealElement(`strength-set-${created.id}`);
  };

  const handleSaveSet = async (sessionExerciseId: string, setId: string, values: StrengthSetChanges) => {
    return saveSet(sessionExerciseId, setId, values);
  };

  const handleCompleteSet = async (
    sessionExerciseId: string,
    setId: string,
    values: StrengthSetChanges,
    isCompleted: boolean,
  ) => {
    const exercise = exercises.find((candidate) => candidate.id === sessionExerciseId);
    const restPlan = exercise ? restPlanFor(exercise) : undefined;
    const shouldStartRest = Boolean(
      isCompleted
      && values.type === 'working'
      && restTimerPreferences.autoStart
      && restPlan
      && restPlan.durationSeconds > 0,
    );
    if (shouldStartRest) restTimer.prepareFeedback();

    const updated = await completeSet(sessionExerciseId, setId, values, isCompleted);
    if (!updated || !isCompleted || values.type !== 'working' || !exercise || !restPlan) return;

    const predictedSets = strengthSets.map((set) => set.id === updated.id ? updated : set);
    const predictedProgress = buildWorkoutSessionProgress(exercises, predictedSets);
    if (predictedProgress.nextStep) {
      revealWorkoutStep(predictedProgress.nextStep.exerciseId, predictedProgress.nextStep.setId);
    }

    if (!shouldStartRest) return;
    restTimer.start({
      sessionId,
      sessionExerciseId,
      exerciseName: restPlan.label,
      durationSeconds: restPlan.durationSeconds,
    });
  };

  const handleStartRest = (exercise: WorkoutSessionExercise) => {
    const restPlan = restPlanFor(exercise);
    if (restPlan.durationSeconds <= 0) {
      if (restPlan.nextExercise) revealElement(`workout-exercise-${restPlan.nextExercise.id}`);
      return;
    }
    restTimer.prepareFeedback();
    restTimer.start({
      sessionId,
      sessionExerciseId: exercise.id,
      exerciseName: restPlan.label,
      durationSeconds: restPlan.durationSeconds,
    });
    if (restPlan.nextExercise) revealElement(`workout-exercise-${restPlan.nextExercise.id}`);
  };

  const handleSkipExercise = (exercise: WorkoutSessionExercise) => {
    setTemporarilySkippedExerciseIds((current) => {
      const next = new Set(current);
      if (next.has(exercise.id)) next.delete(exercise.id);
      else next.add(exercise.id);
      return next;
    });
    const restPlan = restPlanFor(exercise);
    if (restPlan.nextExercise) revealElement(`workout-exercise-${restPlan.nextExercise.id}`);
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
        const completed = await complete(
          undefined,
          confirmation.allowLongDuration,
        );
        if (completed) {
          restTimer.stop();
          const returnContext = navigationState?.workoutSessionReturn;
          await navigate(
            returnContext?.path ?? routePaths.workoutSessions,
            { state: createWorkoutSessionFeedbackState(returnContext, completed.id) },
          );
        }
      } else if (confirmation.type === 'abandon') {
        const abandoned = await abandon();
        if (abandoned) {
          restTimer.stop();
          await navigate(routePaths.workoutSessions);
        }
      } else if (confirmation.type === 'removeExercise') {
        await removeExercise(confirmation.exercise.id);
      } else {
        const deletedWasCurrent = progress.nextStep?.setId === confirmation.setId;
        const remainingExerciseSets = await removeSet(
          confirmation.sessionExerciseId,
          confirmation.setId,
        );
        if (remainingExerciseSets && deletedWasCurrent) {
          const predictedSets = [
            ...strengthSets.filter((set) => set.sessionExerciseId !== confirmation.sessionExerciseId),
            ...remainingExerciseSets,
          ];
          const remainingWorkingSetCount = remainingExerciseSets.filter((set) => set.type === 'working').length;
          const predictedExercises = exercises.map((exercise) => (
            exercise.id === confirmation.sessionExerciseId && exercise.plannedSets !== undefined
              ? { ...exercise, plannedSets: remainingWorkingSetCount }
              : exercise
          ));
          const predictedProgress = buildWorkoutSessionProgress(predictedExercises, predictedSets);
          if (predictedProgress.nextStep) {
            revealWorkoutStep(predictedProgress.nextStep.exerciseId, predictedProgress.nextStep.setId);
          }
        }
      }
    } finally {
      setIsConfirming(false);
      setConfirmation(undefined);
    }
  };

  if (status === 'loading' || !restTimerPreferencesReady) {
    return <PageSkeleton variant="workout" />;
  }

  if (!session) {
    return (
      <InlineNotice tone="error" title="Séance introuvable">
        <p>{errorMessage ?? 'Cette séance n’existe pas.'}</p>
        <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
          Réessayer
        </Button>
        <Link className="mt-3 ml-3 hidden font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300" to={routePaths.workoutSessions}>
          Retour aux entraînements
        </Link>
      </InlineNotice>
    );
  }

  const editable = session.status === 'inProgress';
  const sessionElapsedMinutes = session.startedAt
    ? Math.max(
        0,
        Math.round(
          (Date.now() - new Date(session.startedAt).getTime()) / 60_000,
        ),
      )
    : 0;
  const dialogContent = confirmationContent(confirmation, progress);

  return (
    <section
      className={editable ? (restTimer.isVisible ? 'pb-72 lg:pb-0' : 'pb-24 lg:pb-0') : undefined}
      aria-labelledby="workout-session-title"
    >
      <Link
        to={routePaths.workoutSessions}
        className="hidden min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300"
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

      {editable && restTimer.state.status !== 'idle' ? (
        <RestTimerBar
          state={restTimer.state}
          remainingSeconds={restTimer.remainingSeconds}
          announcement={restTimer.announcement}
          onPause={restTimer.pause}
          onResume={restTimer.resume}
          onAdjust={restTimer.adjust}
          onStop={restTimer.stop}
        />
      ) : null}

      {editable ? (
        <WorkoutSessionActionBar
          session={session}
          saveStatus={saveStatus}
          isPending={Boolean(action) || isConfirming}
          onFinish={() => setConfirmation({
            type: 'finish',
            ...(sessionElapsedMinutes > LONG_WORKOUT_DURATION_MINUTES
              ? { allowLongDuration: true }
              : {}),
          })}
          onAbandon={() => setConfirmation({ type: 'abandon' })}
          hasRestTimer={restTimer.isVisible}
          progressLabel={progress.totalSetCount > 0
            ? `${progress.completedSetCount}/${progress.totalSetCount} séries`
            : `${progress.completedExerciseCount}/${progress.exerciseCount} exercices`}
        />
      ) : null}


      <WorkoutSessionProgressCard
        progress={progress}
        onContinue={revealWorkoutStep}
      />


      {editable ? (
        <CollapsibleSection
          className="mt-6"
          sectionId="workout-exercise-selector"
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
                {filteredAvailableExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>{exercise.name}</option>
                ))}
              </select>
            </div>
            <Button aria-label="Ajouter" disabled={!selectedExerciseId || action === 'addExercise'} onClick={() => void addSelectedExercise()}>
              <Plus aria-hidden="true" className="size-4" />
              {action === 'addExercise' ? 'Ajout…' : `Ajouter ${selectedExerciseSetCount} série${selectedExerciseSetCount > 1 ? 's' : ''}`}
            </Button>
          </div>
          <div className="mt-3">
            <label htmlFor="session-exercise-search" className="sr-only">
              Rechercher un exercice à ajouter
            </label>
            <input
              id="session-exercise-search"
              type="search"
              value={exerciseQuery}
              onChange={(event) => {
                setExerciseQuery(event.target.value);
                setSelectedExerciseId('');
              }}
              className={inputClassName}
              placeholder="Rechercher un exercice à ajouter"
            />
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/40">
            <label htmlFor="session-exercise-set-count" className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Nombre de séries prévues
            </label>
            <div className="mt-2 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={selectedExerciseSetCount <= 1}
                aria-label="Retirer une série prévue"
                onClick={() => setSelectedExerciseSetCount((current) => Math.max(1, current - 1))}
              >
                −
              </Button>
              <input
                id="session-exercise-set-count"
                type="number"
                inputMode="numeric"
                min="1"
                max="12"
                step="1"
                value={selectedExerciseSetCount}
                onChange={(event) => {
                  const parsed = Number.parseInt(event.target.value, 10);
                  setSelectedExerciseSetCount(Number.isFinite(parsed) ? Math.max(1, Math.min(12, parsed)) : 1);
                }}
                className={`${inputClassName} text-center font-semibold`}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={selectedExerciseSetCount >= 12}
                aria-label="Ajouter une série prévue"
                onClick={() => setSelectedExerciseSetCount((current) => Math.min(12, current + 1))}
              >
                +
              </Button>
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1.5" aria-label="Choix rapides du nombre de séries">
              {[1, 2, 3, 4, 5, 6].map((count) => (
                <button
                  key={count}
                  type="button"
                  className={cn(
                    'min-h-10 rounded-lg border text-sm font-semibold transition-colors',
                    selectedExerciseSetCount === count
                      ? 'border-brand-700 bg-brand-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
                  )}
                  aria-pressed={selectedExerciseSetCount === count}
                  onClick={() => setSelectedExerciseSetCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Les lignes seront créées immédiatement et garderont les mêmes options qu’une séance planifiée.
            </p>
          </div>
          {normalizeExerciseName(exerciseQuery)
            && filteredAvailableExercises.length === 0 ? (
            <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Aucun exercice trouvé pour « {exerciseQuery.trim()} »
              </p>
              {similarExercises.length > 0 ? (
                <>
                  <p className="mt-3 text-xs font-semibold uppercase text-slate-500">
                    Exercices similaires
                  </p>
                  <ul className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {similarExercises.map((exercise) => (
                      <li key={exercise.id}>{exercise.name}</li>
                    ))}
                  </ul>
                </>
              ) : null}
              <Link
                to={newStrengthExercisePath({
                  returnTo: 'session',
                  query: exerciseQuery.trim(),
                  sessionId,
                  plannedSets: selectedExerciseSetCount,
                })}
                className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white"
              >
                {similarExercises.length > 0
                  ? 'Aucun ne correspond — créer l’exercice'
                  : 'Créer cet exercice'}
              </Link>
            </div>
          ) : availableExercises.length === 0 ? (
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
        ) : exercises.map((exercise, index) => {
          const groupPosition = exerciseGroupPosition(exercise, exerciseGroups);
          const restPlan = restPlanFor(exercise);
          const nextGroupExercise = groupPosition
            ? groupPosition.group.exercises[(groupPosition.position + 1) % groupPosition.group.exercises.length]
            : undefined;
          return (
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
              onStartRest={handleStartRest}
              groupLabel={groupPosition?.group.label}
              groupPositionLabel={groupPosition ? `${groupPosition.group.letter}${groupPosition.position + 1}` : undefined}
              groupRounds={groupPosition?.group.rounds}
              nextExerciseName={(nextGroupExercise as WorkoutSessionExercise | undefined)?.exerciseNameSnapshot}
              restDurationSeconds={restPlan.durationSeconds}
              restButtonLabel={restPlan.label}
              temporarilySkipped={temporarilySkippedExerciseIds.has(exercise.id)}
              onSkip={groupPosition ? handleSkipExercise : undefined}
              isCurrent={progress.nextStep?.exerciseId === exercise.id}
              highlighted={highlightedExerciseId === exercise.id}
              expanded={expandedExerciseId === exercise.id}
              saveStatus={saveStatus}
              onExpandedChange={(expanded) => setExpandedExerciseId(expanded ? exercise.id : undefined)}
            />
          );
        })}
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
