import {
  Activity,
  Bike,
  Check,
  ChevronRight,
  Circle,
  Dumbbell,
  Footprints,
  Moon,
  Pencil,
  Play,
  Plus,
  ScanLine,
  Utensils,
  Waves,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type {
  CompleteDailyCheckInInput,
  CompleteDailyCheckOutInput,
  DailyCoachingDay,
  SetDailyActivityDecisionInput,
} from '@/application/daily/dailyCoachingService';
import type { DailyTargetSnapshot } from '@/application/daily/dailyTargetCoordinator';
import {
  addFoodPath,
  barcodeScannerPath,
  foodJournalPath,
  routePaths,
  workoutSessionPath,
} from '@/app/routePaths';
import type { DailyDashboardNutrition, ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { DailyCheckInSheet } from '@/features/dashboard/components/DailyCheckInSheet';
import { DailyCheckOutSheet } from '@/features/dashboard/components/DailyCheckOutSheet';
import { DailySportDecisionSheet } from '@/features/dashboard/components/DailySportDecisionSheet';
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
  activeWorkout?: ActiveWorkoutSummary;
  currentHour?: number;
  onSaveCheckIn: (input: CompleteDailyCheckInInput) => Promise<void>;
  onSaveActivityDecision: (input: SetDailyActivityDecisionInput) => Promise<void>;
  onSaveCheckOut: (input: CompleteDailyCheckOutInput) => Promise<void>;
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

function preferredMealSlotForHour(hour: number): keyof typeof mealLabels {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'snacks';
}

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

export function DashboardDailyAssistant({
  date,
  snapshot,
  nutrition,
  dailyCoaching,
  activeWorkout,
  currentHour = new Date().getHours(),
  onSaveCheckIn,
  onSaveActivityDecision,
  onSaveCheckOut,
}: DashboardDailyAssistantProps) {
  const actionToast = useActionToast();
  const [openSheet, setOpenSheet] = useState<AssistantStage>();
  const checkInComplete = Boolean(dailyCoaching.checkIn);
  const sportComplete = Boolean(
    dailyCoaching.activityDecision
    && dailyCoaching.activityDecision.decision !== 'open',
  );
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
  const activityDecision = dailyCoaching.activityDecision?.decision;
  const actualActivityCount = snapshot.activities.length;
  const plannedCount = snapshot.plannedActivities.length;
  const preferredMealSlot = preferredMealSlotForHour(currentHour);

  const saveCheckIn = async (input: CompleteDailyCheckInInput) => {
    await onSaveCheckIn(input);
    actionToast.success({
      key: `daily-check-in:${date}`,
      title: 'Check-in enregistré',
      description: 'Tes repères du matin sont à jour.',
    });
  };
  const saveActivityDecision = async (input: SetDailyActivityDecisionInput) => {
    await onSaveActivityDecision(input);
    actionToast.success({
      key: `daily-sport-decision:${date}`,
      title: input.decision === 'rest' ? 'Journée de repos confirmée' : 'Sport du jour mis à jour',
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
            activityDecision === 'rest'
              ? 'Repos confirmé'
              : sportComplete
                ? 'Sport prévu'
                : 'Sport aujourd’hui ?'
          }
          icon={activityDecision === 'rest' ? Moon : Dumbbell}
          state={stageState('sport', sportComplete)}
          summary={
            activityDecision === 'rest'
              ? 'Aucune séance prévue aujourd’hui.'
              : actualActivityCount > 0 || plannedCount > 0
                ? `${plannedCount} prévue${plannedCount > 1 ? 's' : ''} · ${actualActivityCount} réalisée${actualActivityCount > 1 ? 's' : ''}`
                : sportComplete
                  ? 'Choisis maintenant une activité ou ajoute-la plus tard.'
                  : 'Repos, musculation, endurance ou plusieurs activités.'
          }
          action={
            sportComplete && activityDecision === 'rest' ? (
              <EditButton label="Modifier le sport du jour" onClick={() => setOpenSheet('sport')} />
            ) : sportComplete ? (
              <EditButton label="Modifier la décision sportive" onClick={() => setOpenSheet('sport')} />
            ) : (
              <button type="button" className={primaryActionClassName()} onClick={() => setOpenSheet('sport')}>
                Choisir
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            )
          }
        >
          {activityDecision === 'activities' ? (
            <div className="mt-3">
              {activeWorkout ? (
                <Link
                  to={workoutSessionPath(activeWorkout.session.id)}
                  className={`${primaryActionClassName()} mb-2`}
                >
                  <Play aria-hidden="true" className="size-4" />
                  Reprendre la séance
                </Link>
              ) : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Link to={routePaths.workoutSessions} className={secondaryActionClassName()}>
                  <Dumbbell aria-hidden="true" className="size-4" />
                  Musculation
                </Link>
                <Link to={`${routePaths.addRunningActivity}?date=${encodeURIComponent(date)}`} className={secondaryActionClassName()}>
                  <Activity aria-hidden="true" className="size-4" />
                  Course
                </Link>
                <Link to={`${routePaths.addSwimmingActivity}?date=${encodeURIComponent(date)}`} className={secondaryActionClassName()}>
                  <Waves aria-hidden="true" className="size-4" />
                  Natation
                </Link>
                <Link to={`${routePaths.addOtherActivity}?date=${encodeURIComponent(date)}&type=cycling`} className={secondaryActionClassName()}>
                  <Bike aria-hidden="true" className="size-4" />
                  Vélo / autre
                </Link>
              </div>
              <Link
                to={`${routePaths.weeklyPlanning}?date=${encodeURIComponent(date)}&section=upcoming`}
                className="mt-2 inline-flex min-h-10 items-center text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
              >
                Préparer plusieurs jours
              </Link>
            </div>
          ) : null}
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
            nutritionComplete ? (
              <Link
                to={foodJournalPath(date)}
                aria-label="Ouvrir le journal alimentaire"
                title="Ouvrir le journal alimentaire"
                className="inline-flex size-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </Link>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link to={addFoodPath(date, preferredMealSlot)} className={primaryActionClassName()}>
                  <Plus aria-hidden="true" className="size-4" />
                  Ajouter un repas
                </Link>
                <Link to={barcodeScannerPath(date, preferredMealSlot)} className={secondaryActionClassName()}>
                  <ScanLine aria-hidden="true" className="size-4" />
                  Scanner
                </Link>
                <Link to={foodJournalPath(date)} className={secondaryActionClassName()}>
                  Journal
                </Link>
              </div>
            )
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
      <DailySportDecisionSheet
        open={openSheet === 'sport'}
        date={date}
        {...(dailyCoaching.activityDecision
          ? { decision: dailyCoaching.activityDecision }
          : {})}
        plannedCount={plannedCount}
        onClose={() => setOpenSheet(undefined)}
        onSubmit={saveActivityDecision}
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
