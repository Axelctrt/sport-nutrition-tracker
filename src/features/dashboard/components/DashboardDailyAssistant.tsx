import {
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
import { Link, useNavigate } from 'react-router-dom';
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
  routePaths,
  workoutSessionPath,
} from '@/app/routePaths';
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
import { Card } from '@/shared/ui/Card';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { cn } from '@/shared/utils/cn';

type AssistantStage = 'checkIn' | 'sport' | 'nutrition' | 'checkOut';
type StageState = 'todo' | 'current' | 'complete' | 'optional';

interface DashboardDailyAssistantProps {
  date: string;
  snapshot: DailyTargetSnapshot;
  nutrition: DailyDashboardNutrition;
  dailyCoaching: DailyCoachingDay;
  activityPlanning: DailyActivityPlanningSnapshot;
  activeWorkout?: ActiveWorkoutSummary;
  currentHour?: number;
  onSaveCheckIn: (input: CompleteDailyCheckInInput) => Promise<void>;
  onSaveActivityDecision: (input: SetDailyActivityDecisionInput) => Promise<void>;
  onSaveCheckOut: (input: CompleteDailyCheckOutInput) => Promise<void>;
  onPlanStrength: (input: PlanDailyStrengthInput) => Promise<unknown>;
  onUpdateStrength: (input: UpdateDailyStrengthInput) => Promise<unknown>;
  onStartStrength: (sessionId: string) => Promise<{ id: string } | undefined>;
  onSkipStrength: (sessionId: string) => Promise<void>;
  onSaveEndurance: (input: PlannedEnduranceInput, sessionId?: string) => Promise<unknown>;
  onSkipEndurance: (sessionId: string) => Promise<void>;
}

interface StageCardProps {
  title: string;
  eyebrow: string;
  icon: typeof Circle;
  state: StageState;
  summary: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
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

function StageCard({
  title,
  eyebrow,
  icon: Icon,
  state,
  summary,
  action,
  children,
}: StageCardProps) {
  const isCurrent = state === 'current';
  const isComplete = state === 'complete';

  return (
    <Card
      className={cn(
        'overflow-hidden',
        isCurrent && 'border-brand-400 shadow-md shadow-brand-950/5 dark:border-brand-700',
        isComplete && 'bg-slate-50/90 shadow-none dark:bg-slate-900/60',
      )}
      data-stage-state={state}
    >
      <div className={cn('flex items-start gap-3', isComplete ? 'p-3' : 'p-4 sm:p-5')}>
        <span
          className={cn(
            'grid size-10 shrink-0 place-items-center rounded-xl',
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

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <div>
              <p className={cn(
                'text-xs font-semibold uppercase text-slate-500 dark:text-slate-400',
                isCurrent && 'text-brand-700 dark:text-brand-300',
              )}>
                {eyebrow}
              </p>
              <h3 className="mt-0.5 font-bold text-slate-950 dark:text-white">
                {title}
              </h3>
            </div>
            {isCurrent ? (
              <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-200">
                Prochaine action
              </span>
            ) : null}
          </div>
          <div className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            {summary}
          </div>
          {children}
        </div>

        {isComplete && action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {!isComplete && action ? (
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
      className="inline-flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
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

export function DashboardDailyAssistant({
  date,
  snapshot,
  nutrition,
  dailyCoaching,
  activityPlanning,
  currentHour = new Date().getHours(),
  onSaveCheckIn,
  onSaveActivityDecision,
  onSaveCheckOut,
  onPlanStrength,
  onUpdateStrength,
  onStartStrength,
  onSkipStrength,
  onSaveEndurance,
  onSkipEndurance,
}: DashboardDailyAssistantProps) {
  const actionToast = useActionToast();
  const navigate = useNavigate();
  const [openSheet, setOpenSheet] = useState<AssistantStage>();
  const [plannerEdit, setPlannerEdit] = useState<DailyActivityPlannerEdit>();
  const checkInComplete = Boolean(dailyCoaching.checkIn);
  const actualActivityCount = snapshot.activities.length;
  const plannedActivityCount = activityPlanning.strengthSessions.length
    + activityPlanning.enduranceSessions.length;
  const hasConcreteSport = plannedActivityCount > 0 || actualActivityCount > 0;
  const restConfirmed = dailyCoaching.activityDecision?.decision === 'rest'
    && !hasConcreteSport;
  const sportComplete = hasConcreteSport || restConfirmed;
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
  const linkedActivityIds = new Set([
    ...activityPlanning.strengthSessions
      .map(({ session }) => session.completedActivityId)
      .filter((activityId): activityId is string => Boolean(activityId)),
    ...activityPlanning.enduranceSessions
      .map(({ completedActivity }) => completedActivity?.id)
      .filter((activityId): activityId is string => Boolean(activityId)),
  ]);
  const standaloneActivities = snapshot.activities
    .filter((activity) => !linkedActivityIds.has(activity.id));
  const preferredMealSlot = recommendedMealSlot(currentHour, nutrition.entryCounts);
  const nutritionNavigationStates = new Map(
    (['breakfast', 'lunch', 'dinner', 'snacks'] as const).map((slot) => [
      slot,
      createFoodJournalReturnState(routePaths.dashboard, 'dashboard-nutrition', slot),
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
      if (session) navigate(workoutSessionPath(session.id));
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
        title: 'Séance retirée du planning',
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
        title: 'Activité retirée du planning',
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
          title={checkInComplete ? 'Check-in terminé' : 'Check-in rapide'}
          icon={Circle}
          state={stageState('checkIn', checkInComplete)}
          summary={
            checkInComplete
              ? checkInParts.length > 0
                ? checkInParts.join(' · ')
                : 'Repères du matin enregistrés.'
              : 'Poids facultatif, sommeil et état général.'
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
              : hasConcreteSport
                ? 'Sport prévu'
                : 'Sport aujourd’hui'
          }
          icon={restConfirmed ? Moon : Dumbbell}
          state={stageState('sport', sportComplete)}
          summary={
            restConfirmed
              ? 'Aucune activité prévue.'
              : hasConcreteSport
                ? `${plannedCount} prévue${plannedCount > 1 ? 's' : ''} · ${actualActivityCount} réalisée${actualActivityCount > 1 ? 's' : ''}`
                : legacyActivitiesDecision
                  ? 'Ton ancienne intention sportive est conservée. Choisis maintenant une activité précise.'
                  : 'Aucune activité prévue.'
          }
          action={
            restConfirmed ? (
              <button type="button" className={secondaryActionClassName()} onClick={() => openPlanner()}>
                Prévoir malgré tout
              </button>
            ) : undefined
          }
        >
          <div className="mt-3 space-y-3">
            {activityPlanning.strengthSessions.map(({ session, exerciseCount }) => {
              const isInProgress = session.status === 'inProgress';
              const isCompleted = session.status === 'completed';
              return (
                <div
                  key={session.id}
                  className="border-t border-slate-200 pt-3 dark:border-slate-800"
                >
                  <p className="font-semibold text-slate-950 dark:text-white">
                    {getWorkoutSessionTitle(session)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                    Musculation
                    {session.plannedDurationMinutes
                      ? ` · environ ${session.plannedDurationMinutes} min`
                      : ''}
                    {exerciseCount > 0
                      ? ` · ${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}`
                      : ''}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {isInProgress ? (
                      <Link to={workoutSessionPath(session.id)} className={primaryActionClassName()}>
                        <Play aria-hidden="true" className="size-4" />
                        Reprendre la séance
                      </Link>
                    ) : isCompleted ? (
                      <span className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        <Check aria-hidden="true" className="size-4" />
                        Terminée
                      </span>
                    ) : (
                      <>
                        <button
                          type="button"
                          className={primaryActionClassName()}
                          onClick={() => void startStrength(session.id)}
                        >
                          <Play aria-hidden="true" className="size-4" />
                          Démarrer
                        </button>
                        <button
                          type="button"
                          className={secondaryActionClassName()}
                          onClick={() => openPlanner({ kind: 'strength', session })}
                        >
                          <Pencil aria-hidden="true" className="size-4" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          className={secondaryActionClassName()}
                          onClick={() => void skipStrength(session.id)}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                          Retirer
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {activityPlanning.enduranceSessions.map(({ session, completedActivity }) => (
              <div
                key={session.id}
                className="border-t border-slate-200 pt-3 dark:border-slate-800"
              >
                <p className="font-semibold text-slate-950 dark:text-white">{session.title}</p>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {enduranceTypeLabels[session.activityType]}
                  {completedActivity
                    ? ` · ${completedActivity.durationMinutes} min réalisés`
                    : session.targetDurationMinutes
                      ? ` · ${session.targetDurationMinutes} min`
                      : ''}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {completedActivity ? (
                    <span className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      <Check aria-hidden="true" className="size-4" />
                      Terminée
                    </span>
                  ) : (
                    <>
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
                      <button
                        type="button"
                        className={secondaryActionClassName()}
                        onClick={() => openPlanner({ kind: 'endurance', session })}
                      >
                        <Pencil aria-hidden="true" className="size-4" />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={secondaryActionClassName()}
                        onClick={() => void skipEndurance(session.id)}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                        Retirer
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}

            {standaloneActivities.map((activity) => (
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

            {!hasConcreteSport ? (
              restConfirmed ? null : (
                <div className="flex flex-col items-start gap-2">
                  <button type="button" className={primaryActionClassName()} onClick={() => openPlanner()}>
                    <Plus aria-hidden="true" className="size-4" />
                    Prévoir une activité
                  </button>
                  <button
                    type="button"
                    className="inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 hover:underline dark:text-slate-300"
                    onClick={() => void confirmRest()}
                  >
                    Repos aujourd’hui
                  </button>
                </div>
              )
            ) : (
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
                onClick={() => openPlanner()}
              >
                <Plus aria-hidden="true" className="size-4" />
                Prévoir une autre activité
              </button>
            )}
            <Link
              to={`${routePaths.weeklyPlanning}?date=${encodeURIComponent(date)}&section=upcoming`}
              className="inline-flex min-h-10 items-center text-sm font-semibold text-slate-600 hover:underline dark:text-slate-300"
            >
              Planification avancée
            </Link>
          </div>
        </StageCard>

        <StageCard
          eyebrow="Nutrition"
          title={nutritionComplete ? 'Journal complet' : 'Nutrition'}
          icon={Utensils}
          state={stageState('nutrition', nutritionComplete)}
          summary={
            nutrition.consumed.entryCount > 0
              ? `${Math.round(nutrition.consumed.caloriesKcal).toLocaleString('fr-FR')} kcal · ${Math.round(nutrition.consumed.proteinGrams).toLocaleString('fr-FR')} g de protéines`
              : `Ajouter ton ${mealLabels[preferredMealSlot]}.`
          }
          action={
            <button
              type="button"
              className={nutritionComplete ? secondaryActionClassName() : primaryActionClassName()}
              onClick={() => setOpenSheet('nutrition')}
            >
              <Plus aria-hidden="true" className="size-4" />
              Ajouter un repas
            </button>
          }
        />

        <StageCard
          eyebrow="Soir"
          title={checkOutComplete ? 'Check-out terminé' : 'Check-out'}
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
                ? 'Disponible à tout moment si ta journée est terminée.'
                : 'Pas réels, faim, énergie et journal alimentaire.'
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
        open={openSheet === 'nutrition'}
        date={date}
        navigationStates={nutritionNavigationStates}
        entryCounts={nutrition.entryCounts}
        currentHour={currentHour}
        onClose={() => setOpenSheet(undefined)}
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
