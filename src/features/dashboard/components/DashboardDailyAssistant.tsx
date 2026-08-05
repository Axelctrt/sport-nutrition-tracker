import {
  CalendarDays,
  Check,
  ChevronRight,
  Circle,
  Dumbbell,
  Footprints,
  Moon,
  Pencil,
  Play,
  Plus,
  Trash2,
  Utensils,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type {
  CompleteDailyCheckInInput,
  CompleteDailyCheckOutInput,
  DailyCoachingDay,
  SetDailyActivityDecisionInput,
} from '@/application/daily/dailyCoachingService';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import type {
  DailyActivityPlanningSnapshot,
  PlanDailyStrengthInput,
  UpdateDailyStrengthInput,
} from '@/application/planning/dailyActivityPlanningService';
import type { PlannedEnduranceInput } from '@/application/planning/endurancePlanningService';
import {
  dashboardMealAddPath,
  routePaths,
  workoutSessionPath,
  type MealAddStep,
} from '@/app/routePaths';
import type { MealSlot } from '@/domain/models/food';
import type { DailyDashboardNutrition, ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { DailyCheckInSheet } from '@/features/dashboard/components/DailyCheckInSheet';
import { DailyCheckOutSheet } from '@/features/dashboard/components/DailyCheckOutSheet';
import {
  DailyActivityPlannerSheet,
  type DailyActivityPlannerEdit,
} from '@/features/dashboard/components/DailyActivityPlannerSheet';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { createActivityJournalReturnState } from '@/features/activities/navigation/activityJournalNavigation';
import { activityTypeLabels } from '@/features/activities/utils/activityLabels';
import { FoodJournalAddSheet } from '@/features/food-journal/components/FoodJournalAddSheet';
import { createFoodJournalReturnState } from '@/features/food-journal/navigation/foodJournalNavigation';
import { recommendedMealSlot } from '@/features/food-journal/utils/recommendedMealSlot';
import type { PlannedEnduranceSession } from '@/domain/planning/endurancePlanningState';
import { useActionToast } from '@/shared/toast/useActionToast';
import {
  ActionMenu,
  ActionMenuItem,
  ActionMenuSeparator,
} from '@/shared/ui/ActionMenu';
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { cn } from '@/shared/utils/cn';
import { createWorkoutSessionReturnState } from '@/features/strength-sessions/navigation/workoutSessionNavigation';

type AssistantStage = 'checkIn' | 'sport' | 'nutrition' | 'checkOut';
type StageState = 'todo' | 'current' | 'complete' | 'optional';

interface DashboardDailyAssistantProps {
  date: string;
  snapshot: DailyTargetSnapshot;
  nutrition: DailyDashboardNutrition;
  dailyCoaching: DailyCoachingDay;
  activityPlanning: DailyActivityPlanningSnapshot;
  activeWorkout?: ActiveWorkoutSummary;
  highlightedStage?: AssistantStage;
  currentHour?: number;
  onSaveCheckIn: (input: CompleteDailyCheckInInput) => Promise<void>;
  onSaveActivityDecision: (input: SetDailyActivityDecisionInput) => Promise<void>;
  onSaveCheckOut: (input: CompleteDailyCheckOutInput) => Promise<void>;
  onPlanStrength: (input: PlanDailyStrengthInput) => Promise<unknown>;
  onUpdateStrength: (input: UpdateDailyStrengthInput) => Promise<unknown>;
  onStartStrength: (sessionId: string) => Promise<{ id: string } | undefined>;
  onSkipStrength: (sessionId: string) => Promise<void>;
  onRestoreStrength?: (sessionId: string) => Promise<void>;
  onSaveEndurance: (input: PlannedEnduranceInput, sessionId?: string) => Promise<unknown>;
  onSkipEndurance: (sessionId: string) => Promise<void>;
  onRestoreEndurance?: (sessionId: string) => Promise<void>;
}

interface StageCardProps {
  title: string;
  eyebrow: string;
  icon: typeof Circle;
  state: StageState;
  summary: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
  highlighted?: boolean;
}

const mealLabels = {
  breakfast: 'petit-déjeuner',
  lunch: 'déjeuner',
  dinner: 'dîner',
  snacks: 'collation',
} as const;

const enduranceTypeLabels: Record<PlannedEnduranceSession['activityType'], string> = {
  running: 'Course',
  swimming: 'Natation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Autre cardio',
};

function formatSleep(minutes: number | undefined): string | undefined {
  if (minutes === undefined) return undefined;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder > 0 ? `${hours} h ${remainder}` : `${hours} h`;
}

function formatNutritionValue(value: number | undefined): string {
  return Math.round(value ?? 0).toLocaleString('fr-FR');
}

function StageCard({
  title,
  eyebrow,
  icon: Icon,
  state,
  summary,
  action,
  children,
  highlighted = false,
}: StageCardProps) {
  const isCurrent = state === 'current';
  const isComplete = state === 'complete';
  const compactComplete = isComplete && !children;

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isCurrent && 'border-brand-400 shadow-md shadow-brand-950/5 dark:border-brand-700',
        isComplete && 'bg-slate-50/90 shadow-none dark:bg-slate-900/60',
        highlighted && 'ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-950',
      )}
      data-stage-state={state}
      data-responsive-essential
    >
      <div className={cn(
        'flex gap-3',
        compactComplete ? 'items-center p-2.5 sm:p-3' : 'items-start p-4 sm:p-5',
      )}>
        <span
          className={cn(
            'grid shrink-0 place-items-center rounded-xl',
            compactComplete ? 'size-8' : 'size-10',
            isComplete
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
              : isCurrent
                ? 'bg-brand-700 text-white dark:bg-brand-500'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
          )}
        >
          {isComplete ? (
            <Check aria-hidden="true" className="size-5" />
          ) : (
            <Icon aria-hidden="true" className="size-5" />
          )}
        </span>

        <div className={cn('min-w-0 flex-1', compactComplete && 'flex items-center gap-2')}>
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className={cn(
                'text-xs font-semibold uppercase text-slate-500 dark:text-slate-400',
                isCurrent && 'text-brand-700 dark:text-brand-300',
                compactComplete && 'sr-only',
              )}>
                {eyebrow}
              </p>
              <h3 className={cn(
                'font-bold text-slate-950 dark:text-white',
                compactComplete ? 'truncate text-sm' : 'mt-0.5',
              )}>
                {title}
              </h3>
            </div>
            {isCurrent ? (
              <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                Prochaine action
              </span>
            ) : null}
          </div>
          <div className={cn(
            'text-sm leading-5 text-slate-600 dark:text-slate-300',
            compactComplete && 'min-w-0 flex-1',
            compactComplete && 'truncate',
            !compactComplete && 'mt-1',
          )}>
            {summary}
          </div>
          {compactComplete ? null : children}
        </div>

        {compactComplete && action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {!compactComplete && action ? (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          {action}
        </div>
      ) : null}
    </Card>
  );
}

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      <Pencil aria-hidden="true" className="size-4" />
    </button>
  );
}

function primaryActionClassName() {
  return 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 sm:w-auto';
}

function secondaryActionClassName() {
  return 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';
}

function restActionClassName() {
  return 'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand-300 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300 dark:hover:bg-brand-950/40 sm:w-auto';
}

function readMealAddPanel(search: string): {
  slot: MealSlot;
  step: MealAddStep;
} | undefined {
  const params = new URLSearchParams(search);
  if (params.get('panel') !== 'meal-add') return undefined;
  const slot = params.get('slot');
  if (slot !== 'breakfast' && slot !== 'lunch' && slot !== 'dinner' && slot !== 'snacks') {
    return undefined;
  }
  return {
    slot,
    step: params.get('step') === 'method'
      ? 'method'
      : params.get('step') === 'overview'
        ? 'overview'
        : 'meal',
  };
}

function enduranceActivityPath(session: PlannedEnduranceSession): string {
  const path = session.activityType === 'running'
    ? routePaths.addRunningActivity
    : session.activityType === 'swimming'
      ? routePaths.addSwimmingActivity
      : routePaths.addOtherActivity;
  const params = new URLSearchParams({
    date: session.date,
    type: session.activityType,
    plannedSource: 'endurancePlanning',
    plannedId: session.id,
  });
  return `${path}?${params.toString()}`;
}

const INTERRUPTED_WORKOUT_THRESHOLD_MS = 90 * 60 * 1_000;

function interruptedWorkoutLabel(updatedAt: string | undefined, startedAt: string | undefined): string {
  const timestamp = new Date(updatedAt ?? startedAt ?? '').getTime();
  if (!Number.isFinite(timestamp)) return 'Dernière activité inconnue';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 60) return `Dernière activité il y a ${elapsedMinutes} min`;
  const hours = Math.floor(elapsedMinutes / 60);
  if (hours < 24) return `Dernière activité il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  return `Dernière activité il y a ${days} j`;
}

export function DashboardDailyAssistant({
  date,
  snapshot,
  nutrition,
  dailyCoaching,
  activityPlanning,
  activeWorkout,
  highlightedStage,
  currentHour = new Date().getHours(),
  onSaveCheckIn,
  onSaveActivityDecision,
  onSaveCheckOut,
  onPlanStrength,
  onUpdateStrength,
  onStartStrength,
  onSkipStrength,
  onRestoreStrength,
  onSaveEndurance,
  onSkipEndurance,
  onRestoreEndurance,
}: DashboardDailyAssistantProps) {
  const actionToast = useActionToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [openSheet, setOpenSheet] = useState<AssistantStage>();
  const [plannerEdit, setPlannerEdit] = useState<DailyActivityPlannerEdit>();
  const mealAddPanel = readMealAddPanel(location.search);
  const checkInComplete = Boolean(dailyCoaching.checkIn);
  const actualActivityCount = snapshot.activities.length;
  const plannedActivityCount = activityPlanning.strengthSessions.length
    + activityPlanning.enduranceSessions.length;
  const completedPlannedActivityCount = activityPlanning.strengthSessions
    .filter(({ session }) => session.status === 'completed')
    .length
    + activityPlanning.enduranceSessions
      .filter(({ completedActivity }) => Boolean(completedActivity))
      .length;
  const performedActivityCount = Math.max(
    actualActivityCount,
    completedPlannedActivityCount,
  );
  const hasConcreteSport = plannedActivityCount > 0 || actualActivityCount > 0;
  const restConfirmed = dailyCoaching.activityDecision?.decision === 'rest'
    && !hasConcreteSport;
  const sportComplete = performedActivityCount > 0 || restConfirmed;
  const nutritionComplete = Boolean(
    dailyCoaching.checkOut?.foodJournalComplete
    || nutrition.journalStatus?.isComplete,
  );
  const checkOutComplete = Boolean(dailyCoaching.checkOut);
  const completedCount = [
    checkInComplete,
    sportComplete,
    nutritionComplete,
    checkOutComplete,
  ].filter(Boolean).length;
  const priority: AssistantStage | undefined = !checkInComplete
    ? 'checkIn'
    : !sportComplete
      ? 'sport'
      : currentHour >= 18 && !checkOutComplete
        ? 'checkOut'
        : !nutritionComplete
          ? 'nutrition'
          : !checkOutComplete
            ? 'checkOut'
            : undefined;
  const stageState = (stage: AssistantStage, complete: boolean): StageState => {
    if (complete) return 'complete';
    if (priority === stage) return 'current';
    return stage === 'checkOut' && currentHour < 16 ? 'optional' : 'todo';
  };
  const checkIn = dailyCoaching.checkIn;
  const checkInParts = [
    checkIn?.weightEntryId && snapshot.dateWeightEntry
      ? `${snapshot.dateWeightEntry.weightKg.toLocaleString('fr-FR')} kg`
      : undefined,
    formatSleep(checkIn?.sleepDurationMinutes),
    checkIn?.readiness === 'low'
      ? 'fatigué'
      : checkIn?.readiness === 'high'
        ? 'en forme'
        : checkIn?.readiness === 'normal'
          ? 'état normal'
          : undefined,
  ].filter(Boolean);
  const legacyActivitiesDecision = dailyCoaching.activityDecision?.decision === 'activities'
    && !hasConcreteSport;
  const plannedCount = activityPlanning.strengthSessions
    .filter(({ session }) => session.status === 'planned' || session.status === 'inProgress')
    .length
    + activityPlanning.enduranceSessions
      .filter(({ completedActivity }) => !completedActivity)
      .length;
  const visibleCompletedActivities = snapshot.activities.slice(0, 2);
  const additionalCompletedActivityCount = Math.max(0, snapshot.activities.length - 2);
  const unlistedActiveWorkout = activeWorkout
    && !activityPlanning.strengthSessions.some(({ session }) => session.id === activeWorkout.session.id)
    ? activeWorkout
    : undefined;
  const activeWorkoutTimestamp = unlistedActiveWorkout
    ? new Date(
        unlistedActiveWorkout.session.updatedAt
        ?? unlistedActiveWorkout.session.startedAt
        ?? '',
      ).getTime()
    : Number.NaN;
  const activeWorkoutInterrupted = Boolean(
    unlistedActiveWorkout
    && Number.isFinite(activeWorkoutTimestamp)
    && Date.now() - activeWorkoutTimestamp >= INTERRUPTED_WORKOUT_THRESHOLD_MS,
  );
  const workoutReturnState = createWorkoutSessionReturnState(
    `${location.pathname}${location.search}`,
    'dashboard-sport',
  );
  const preferredMealSlot = recommendedMealSlot(currentHour, nutrition.entryCounts);
  const consumedCalories = formatNutritionValue(nutrition.consumed.caloriesKcal);
  const consumedCarbohydrates = formatNutritionValue(nutrition.consumed.carbohydratesGrams);
  const consumedProtein = formatNutritionValue(nutrition.consumed.proteinGrams);
  const consumedFat = formatNutritionValue(nutrition.consumed.fatGrams);
  const nutritionNavigationStates = new Map(
    (['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((slot) => [
      slot,
      createFoodJournalReturnState(
        dashboardMealAddPath(slot, 'overview'),
        'dashboard-nutrition',
        slot,
        dashboardMealAddPath(slot, 'method'),
      ),
    ]),
  );

  const saveCheckIn = async (input: CompleteDailyCheckInInput) => {
    await onSaveCheckIn(input);
    actionToast.success({
      key: `daily-check-in:${date}`,
      title: 'Check-in enregistré',
      description: 'Tes repères du matin sont à jour.',
    });
  };
  const saveCheckOut = async (input: CompleteDailyCheckOutInput) => {
    await onSaveCheckOut(input);
    actionToast.success({
      key: `daily-check-out:${date}`,
      title: 'Journée clôturée',
      description: 'Le bilan final de la journée est disponible.',
    });
  };

  const confirmRest = async () => {
    await onSaveActivityDecision({ date, decision: 'rest' });
    actionToast.success({
      key: `daily-sport-rest:${date}`,
      title: 'Journée de repos confirmée',
    });
  };

  const startStrength = async (sessionId: string) => {
    try {
      const session = await onStartStrength(sessionId);
      if (session) {
        navigate(workoutSessionPath(session.id), { state: workoutReturnState });
      }
    } catch (error) {
      actionToast.error({
        key: `daily-strength-start:${sessionId}`,
        title: 'Démarrage impossible',
        error,
        fallback: 'La séance n’a pas pu être démarrée.',
      });
    }
  };

  const skipStrength = async (sessionId: string) => {
    try {
      await onSkipStrength(sessionId);
      actionToast.success({
        key: `daily-strength-skip:${sessionId}`,
        title: 'Séance retirée',
        durationMs: 8_000,
        ...(onRestoreStrength
          ? {
              action: {
                label: 'Annuler',
                ariaLabel: 'Annuler le retrait de la séance',
                onClick: async () => {
                  await onRestoreStrength(sessionId);
                  actionToast.success({
                    key: `daily-strength-restore:${sessionId}`,
                    title: 'Séance replanifiée',
                  });
                },
              },
            }
          : {}),
      });
    } catch (error) {
      actionToast.error({
        key: `daily-strength-skip:${sessionId}`,
        title: 'Retrait impossible',
        error,
        fallback: 'La séance n’a pas pu être retirée.',
      });
    }
  };

  const skipEndurance = async (sessionId: string) => {
    try {
      await onSkipEndurance(sessionId);
      actionToast.success({
        key: `daily-endurance-skip:${sessionId}`,
        title: 'Activité retirée',
        durationMs: 8_000,
        ...(onRestoreEndurance
          ? {
              action: {
                label: 'Annuler',
                ariaLabel: 'Annuler le retrait de l’activité',
                onClick: async () => {
                  await onRestoreEndurance(sessionId);
                  actionToast.success({
                    key: `daily-endurance-restore:${sessionId}`,
                    title: 'Activité replanifiée',
                  });
                },
              },
            }
          : {}),
      });
    } catch (error) {
      actionToast.error({
        key: `daily-endurance-skip:${sessionId}`,
        title: 'Retrait impossible',
        error,
        fallback: 'L’activité n’a pas pu être retirée.',
      });
    }
  };

  const openPlanner = (edit?: DailyActivityPlannerEdit) => {
    setPlannerEdit(edit);
    setOpenSheet('sport');
  };

  return (
    <section className="mt-5" aria-labelledby="daily-assistant-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <h2 id="daily-assistant-title" className="text-lg font-bold text-slate-950 dark:text-white">
            Assistant du jour
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {completedCount} étape{completedCount > 1 ? 's' : ''} sur 4
          </p>
        </div>
        {completedCount === 4 ? (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            <Check aria-hidden="true" className="size-4" />
            Journée complète
          </span>
        ) : null}
      </div>
      <ProgressBar
        className="mb-4"
        value={completedCount}
        max={4}
        label="Progression de la journée"
        indicatorClassName="bg-brand-600"
      />

      <div className="space-y-3">
        <StageCard
          eyebrow="Matin"
          title={checkInComplete ? 'Check-in' : 'Check-in rapide'}
          icon={Circle}
          state={stageState('checkIn', checkInComplete)}
          summary={
            checkInComplete
              ? checkInParts.length > 0
                ? checkInParts.join(' · ')
                : 'Repères du matin enregistrés.'
              : 'Poids · sommeil · forme'
          }
          action={
            checkInComplete ? (
              <EditButton label="Modifier le check-in" onClick={() => setOpenSheet('checkIn')} />
            ) : (
              <button type="button" className={primaryActionClassName()} onClick={() => setOpenSheet('checkIn')}>
                Faire le check-in
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            )
          }
        />

        <StageCard
          eyebrow="Sport"
          title={
            restConfirmed
              ? 'Repos confirmé'
              : performedActivityCount > 0
                ? 'Sport réalisé'
              : hasConcreteSport
                ? 'Sport prévu'
                : 'Sport aujourd’hui'
          }
          icon={restConfirmed ? Moon : Dumbbell}
          state={stageState('sport', sportComplete)}
          highlighted={highlightedStage === 'sport'}
          summary={
            restConfirmed
              ? 'Repos prévu'
              : hasConcreteSport
                ? `${plannedCount} prévue${plannedCount > 1 ? 's' : ''} · ${performedActivityCount} réalisée${performedActivityCount > 1 ? 's' : ''}`
                : legacyActivitiesDecision
                  ? 'Ton ancienne intention sportive est conservée. Choisis maintenant une activité précise.'
                  : 'Rien de prévu'
          }
        >
          <div className="mt-3 space-y-3">
            {unlistedActiveWorkout ? (
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <p className="font-semibold text-slate-950 dark:text-white">
                  {activeWorkoutInterrupted ? 'Séance interrompue' : 'Séance en cours'}
                </p>
                <p className="mt-0.5 break-words text-sm text-slate-500 dark:text-slate-400">
                  {getWorkoutSessionTitle(unlistedActiveWorkout.session)}
                  {' · '}
                  {interruptedWorkoutLabel(
                    unlistedActiveWorkout.session.updatedAt,
                    unlistedActiveWorkout.session.startedAt,
                  )}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link
                    to={workoutSessionPath(unlistedActiveWorkout.session.id)}
                    state={workoutReturnState}
                    className={primaryActionClassName()}
                  >
                    <Play aria-hidden="true" className="size-4" />
                    Reprendre
                  </Link>
                  {activeWorkoutInterrupted ? (
                    <Link
                      to={`${workoutSessionPath(unlistedActiveWorkout.session.id)}?finish=true`}
                      state={workoutReturnState}
                      className={secondaryActionClassName()}
                    >
                      <Check aria-hidden="true" className="size-4" />
                      Terminer
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}

            {activityPlanning.strengthSessions
              .filter(({ session }) => session.status !== 'completed')
              .map(({ session, exerciseCount }) => {
              const isInProgress = session.status === 'inProgress';
              return (
                <div
                  key={session.id}
                  className="border-t border-slate-200 pt-3 dark:border-slate-800"
                >
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {getWorkoutSessionTitle(session)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Musculation · {isInProgress ? 'En cours' : 'Prévue'}
                    {session.plannedDurationMinutes
                      ? ` · environ ${session.plannedDurationMinutes} min`
                      : ''}
                    {exerciseCount > 0
                      ? ` · ${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}`
                      : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isInProgress ? (
                      <Link
                        to={workoutSessionPath(session.id)}
                        state={workoutReturnState}
                        className={primaryActionClassName()}
                      >
                        <Play aria-hidden="true" className="size-4" />
                        Reprendre
                      </Link>
                    ) : (
                      <div className="flex w-full items-center gap-2 sm:w-auto">
                        <button
                          type="button"
                          className={primaryActionClassName()}
                          onClick={() => void startStrength(session.id)}
                        >
                          <Play aria-hidden="true" className="size-4" />
                          Démarrer
                        </button>
                        <ActionMenu label={`Actions pour ${getWorkoutSessionTitle(session)}`}>
                          <ActionMenuItem
                            icon={Pencil}
                            onClick={() => openPlanner({ kind: 'strength', session })}
                          >
                            Modifier
                          </ActionMenuItem>
                          <ActionMenuSeparator />
                          <ActionMenuItem
                            icon={Trash2}
                            tone="danger"
                            onClick={() => void skipStrength(session.id)}
                          >
                            Retirer
                          </ActionMenuItem>
                        </ActionMenu>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {activityPlanning.enduranceSessions
              .filter(({ completedActivity }) => !completedActivity)
              .map(({ session }) => (
              <div
                key={session.id}
                className="border-t border-slate-200 pt-3 dark:border-slate-800"
              >
                <p className="font-semibold text-slate-950 dark:text-white">{session.title}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {enduranceTypeLabels[session.activityType]}
                  {session.targetDurationMinutes
                    ? ` · Prévue · ${session.targetDurationMinutes} min`
                    : ' · Prévue'}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                      <Link
                        to={enduranceActivityPath(session)}
                        state={createActivityJournalReturnState(
                          routePaths.dashboard,
                          'dashboard-sport',
                          date,
                        )}
                        className={primaryActionClassName()}
                      >
                        <Play aria-hidden="true" className="size-4" />
                        Démarrer
                      </Link>
                      <ActionMenu label={`Actions pour ${session.title}`}>
                        <ActionMenuItem
                          icon={Pencil}
                          onClick={() => openPlanner({ kind: 'endurance', session })}
                        >
                          Modifier
                        </ActionMenuItem>
                        <ActionMenuSeparator />
                        <ActionMenuItem
                          icon={Trash2}
                          tone="danger"
                          onClick={() => void skipEndurance(session.id)}
                        >
                          Retirer
                        </ActionMenuItem>
                      </ActionMenu>
                  </div>
                </div>
              </div>
            ))}

            {visibleCompletedActivities.map((activity) => (
              <div
                key={activity.id}
                className="border-t border-slate-200 pt-3 dark:border-slate-800"
              >
                <p className="font-semibold text-slate-950 dark:text-white">
                  {activityTypeLabels[activity.type]}
                </p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {activity.durationMinutes} min réalisés
                </p>
                <span className="mt-2 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check aria-hidden="true" className="size-4" />
                  Terminée
                </span>
              </div>
            ))}

            {additionalCompletedActivityCount > 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3 text-sm dark:border-slate-800">
                <p className="font-semibold text-slate-700 dark:text-slate-200">
                  + {additionalCompletedActivityCount} autre{additionalCompletedActivityCount > 1 ? 's' : ''} activité{additionalCompletedActivityCount > 1 ? 's' : ''} aujourd’hui
                </p>
                <Link
                  to={`${routePaths.activities}?date=${encodeURIComponent(date)}`}
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                >
                  Voir les activités du jour
                </Link>
              </div>
            ) : null}

            <div className="flex flex-col items-start gap-3 pt-1">
              {!hasConcreteSport ? (
                restConfirmed ? (
                  <button
                    type="button"
                    aria-label="Prévoir une activité malgré le repos"
                    className={secondaryActionClassName()}
                    onClick={() => openPlanner()}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Prévoir
                  </button>
                ) : (
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                    <button
                      type="button"
                      aria-label="Prévoir une activité"
                      className={primaryActionClassName()}
                      onClick={() => openPlanner()}
                    >
                      <Plus aria-hidden="true" className="size-4" />
                      Prévoir
                    </button>
                    <button
                      type="button"
                      aria-label="Prévoir du repos aujourd’hui"
                      className={restActionClassName()}
                      onClick={() => void confirmRest()}
                    >
                      <Moon aria-hidden="true" className="size-4" />
                      Repos
                    </button>
                  </div>
                )
              ) : (
                <div>
                  <button
                    type="button"
                    aria-label="Prévoir une autre activité"
                    className={primaryActionClassName()}
                    onClick={() => openPlanner()}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Prévoir
                  </button>
                </div>
              )}
              <Link
                to={`${routePaths.weeklyPlanning}?date=${encodeURIComponent(date)}&section=upcoming`}
                className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-semibold leading-5 text-brand-700 hover:underline dark:text-brand-300"
              >
                <CalendarDays aria-hidden="true" className="size-4" />
                Planification avancée
              </Link>
            </div>
          </div>
        </StageCard>

        <StageCard
          eyebrow="Nutrition"
          title={nutritionComplete ? 'Journal complet' : 'Nutrition'}
          icon={Utensils}
          state={stageState('nutrition', nutritionComplete)}
          summary={
            nutrition.consumed.entryCount > 0
              ? (
                  <span
                    aria-label={`${consumedCalories} kilocalories, ${consumedCarbohydrates} grammes de glucides, ${consumedProtein} grammes de protéines, ${consumedFat} grammes de lipides`}
                    className="whitespace-normal break-words text-[0.8125rem] sm:text-sm"
                  >
                    <span aria-hidden="true">
                      {consumedCalories} kcal · {consumedCarbohydrates} g G · {consumedProtein} g P · {consumedFat} g L
                    </span>
                  </span>
                )
              : `Ajouter ton ${mealLabels[preferredMealSlot]}.`
          }
          action={
            <button
              type="button"
              aria-label="Ajouter un repas"
              data-responsive-essential="action"
              className={`${nutritionComplete ? secondaryActionClassName() : primaryActionClassName()} min-h-11 px-3`}
              onClick={() => navigate(dashboardMealAddPath(preferredMealSlot))}
            >
              <Plus aria-hidden="true" className="size-4" />
              Ajouter
            </button>
          }
        />

        <StageCard
          eyebrow="Soir"
          title="Check-out"
          icon={Footprints}
          state={stageState('checkOut', checkOutComplete)}
          summary={
            checkOutComplete
              ? [
                  snapshot.stepsEntry
                    ? `${snapshot.stepsEntry.totalSteps.toLocaleString('fr-FR')} pas`
                    : 'pas ignorés',
                  dailyCoaching.checkOut?.foodJournalComplete
                    ? 'journal complet'
                    : 'journal à compléter',
                ].join(' · ')
              : currentHour < 16
                ? 'Disponible dès que ta journée est terminée.'
                : 'Pas · faim · énergie · journal'
          }
          action={
            checkOutComplete ? (
              <EditButton label="Modifier le check-out" onClick={() => setOpenSheet('checkOut')} />
            ) : (
              <button
                type="button"
                className={priority === 'checkOut' ? primaryActionClassName() : secondaryActionClassName()}
                onClick={() => setOpenSheet('checkOut')}
              >
                Clôturer la journée
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            )
          }
        />
      </div>

      <DailyCheckInSheet
        open={openSheet === 'checkIn'}
        date={date}
        {...(dailyCoaching.checkIn ? { checkIn: dailyCoaching.checkIn } : {})}
        {...(snapshot.dateWeightEntry ? { weightEntry: snapshot.dateWeightEntry } : {})}
        fallbackWeightKg={snapshot.weight.weightKg}
        onClose={() => setOpenSheet(undefined)}
        onSubmit={saveCheckIn}
      />
      <DailyActivityPlannerSheet
        open={openSheet === 'sport'}
        date={date}
        templates={activityPlanning.templates}
        {...(plannerEdit ? { edit: plannerEdit } : {})}
        onClose={() => {
          setOpenSheet(undefined);
          setPlannerEdit(undefined);
        }}
        onPlanStrength={onPlanStrength}
        onUpdateStrength={onUpdateStrength}
        onSaveEndurance={onSaveEndurance}
      />
      <FoodJournalAddSheet
        open={Boolean(mealAddPanel)}
        date={date}
        navigationStates={nutritionNavigationStates}
        entryCounts={nutrition.entryCounts}
        currentHour={currentHour}
        {...(mealAddPanel
          ? {
              initialSlot: mealAddPanel.slot,
              initialStep: mealAddPanel.step,
            }
          : {})}
        onStepChange={(step, slot) => {
          navigate(dashboardMealAddPath(slot, step), { replace: true });
        }}
        onFinish={() => {
          navigate(routePaths.dashboard, { replace: true });
        }}
        onClose={() => {
          navigate(routePaths.dashboard, { replace: true });
        }}
      />
      <DailyCheckOutSheet
        open={openSheet === 'checkOut'}
        date={date}
        {...(dailyCoaching.checkOut ? { checkOut: dailyCoaching.checkOut } : {})}
        {...(snapshot.stepsEntry
          ? { actualSteps: snapshot.stepsEntry.totalSteps }
          : {})}
        foodJournalComplete={Boolean(nutrition.journalStatus?.isComplete)}
        consumedCaloriesKcal={nutrition.consumed.caloriesKcal}
        completedActivityCount={actualActivityCount}
        unresolvedPlannedCount={plannedCount}
        onClose={() => setOpenSheet(undefined)}
        onSubmit={saveCheckOut}
      />
    </section>
  );
}
