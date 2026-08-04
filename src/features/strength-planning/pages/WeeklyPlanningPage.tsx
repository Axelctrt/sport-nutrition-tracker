import {
  Activity,
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Layers3,
  Plus,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import { strengthSessionStyleLabels } from '@/application/planning/plannedActivityCalories';
import { formatWeekRange } from '@/application/strength/weeklyPlanningService';
import { getWorkoutSessionTitle } from '@/application/strength/workoutSessionService';
import { routePaths, workoutSessionPath } from '@/app/routePaths';
import type { LocalDate } from '@/domain/models/common';
import type { StrengthSessionStyle } from '@/domain/models/strength';
import { EndurancePlanningCreateForm } from '@/features/strength-planning/components/EndurancePlanningCreateForm';
import { EndurancePlanningPanel } from '@/features/strength-planning/components/EndurancePlanningPanel';
import { RepeatTrainingWeekPanel } from '@/features/strength-planning/components/RepeatTrainingWeekPanel';
import { WeeklyPlanningSessionCard } from '@/features/strength-planning/components/WeeklyPlanningSessionCard';
import { useWeeklyPlanning } from '@/features/strength-planning/hooks/useWeeklyPlanning';
import { inputClassName } from '@/shared/forms/formStyles';
import { useToast } from '@/shared/toast/useToast';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { RefreshStatus } from '@/shared/ui/RefreshStatus';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { isValidLocalDate } from '@/shared/validation/localDate';
import './weeklyPlanningPage.css';

type PlanningMode = 'choice' | 'strength' | 'endurance';

export function WeeklyPlanningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const focusHandledRef = useRef(false);
  const sectionHandledRef = useRef(false);
  const planActionHandledRef = useRef(false);
  const requestedDateValue = searchParams.get('date');
  const requestedDate =
    requestedDateValue && isValidLocalDate(requestedDateValue)
      ? (requestedDateValue as LocalDate)
      : undefined;
  const requestedSessionId = searchParams.get('session');
  const requestedSection = searchParams.get('section');
  const requestedAction = searchParams.get('action');
  const {
    weekStart,
    days,
    templates,
    calorieProjections,
    status,
    errorMessage,
    isRefreshing,
    actionId,
    refresh,
    changeWeek,
    goToCurrentWeek,
    goToDate,
    plan,
    start,
    reschedule,
    skip,
  } = useWeeklyPlanning();
  const [templateId, setTemplateId] = useState('');
  const [scheduledDate, setScheduledDate] = useState<LocalDate>(toLocalDate());
  const [plannedDurationMinutes, setPlannedDurationMinutes] = useState('60');
  const [strengthSessionStyle, setStrengthSessionStyle] =
    useState<StrengthSessionStyle>('classic');
  const [expandedDays, setExpandedDays] =
    useState<Set<LocalDate>>(() => new Set());
  const [planningOpen, setPlanningOpen] = useState(false);
  const [planningMode, setPlanningMode] = useState<PlanningMode>('choice');

  const openPlanning = (mode: PlanningMode = 'choice') => {
    setPlanningMode(mode);
    setPlanningOpen(true);
  };

  const closePlanning = () => {
    setPlanningOpen(false);
  };

  useEffect(() => {
    if (!templateId && templates[0]) {
      setTemplateId(templates[0].template.id);
    }
  }, [templateId, templates]);

  useEffect(() => {
    if (requestedDate) {
      goToDate(requestedDate);
      setScheduledDate(requestedDate);
    }
  }, [goToDate, requestedDate]);

  useEffect(() => {
    if (requestedAction !== 'plan') {
      planActionHandledRef.current = false;
      return;
    }
    if (planActionHandledRef.current) return;

    planActionHandledRef.current = true;
    openPlanning();
  }, [requestedAction]);

  useEffect(() => {
    setExpandedDays(new Set());
  }, [weekStart]);

  useEffect(() => {
    if (!requestedDate || !requestedSessionId) return;

    setExpandedDays((current) => {
      if (current.has(requestedDate)) return current;
      const next = new Set(current);
      next.add(requestedDate);
      return next;
    });
  }, [requestedDate, requestedSessionId, weekStart]);

  useEffect(() => {
    focusHandledRef.current = false;
  }, [requestedSessionId]);

  useEffect(() => {
    sectionHandledRef.current = false;
  }, [requestedSection]);

  useEffect(() => {
    if (
      status !== 'ready'
      || !requestedSessionId
      || focusHandledRef.current
      || (requestedDate && !expandedDays.has(requestedDate))
    ) return;

    const target = document.getElementById(
      `planning-session-${requestedSessionId}`,
    );
    if (!target) return;

    focusHandledRef.current = true;
    target.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    const focusTimeout = window.setTimeout(() => {
      target.focus({ preventScroll: true });
    }, 0);

    return () => window.clearTimeout(focusTimeout);
  }, [
    days,
    expandedDays,
    requestedDate,
    requestedSessionId,
    status,
  ]);

  useEffect(() => {
    if (
      status !== 'ready'
      || requestedSection !== 'upcoming'
      || sectionHandledRef.current
    ) return;

    const target = document.getElementById('weekly-planning-upcoming');
    if (!target) return;

    sectionHandledRef.current = true;
    target.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    target.focus({ preventScroll: true });
  }, [requestedSection, status, weekStart]);

  const sessionCount = useMemo(
    () => days.reduce((total, day) => total + day.sessions.length, 0),
    [days],
  );

  const submitPlan = async (event?: FormEvent) => {
    event?.preventDefault();
    const parsedDuration = Number(plannedDurationMinutes);
    if (
      !templateId
      || !scheduledDate
      || !Number.isFinite(parsedDuration)
      || parsedDuration <= 0
      || parsedDuration > 1_440
    ) return;

    const created = await plan(
      templateId,
      scheduledDate,
      parsedDuration,
      strengthSessionStyle,
    );

    if (!created) return;

    toast.success(
      'Séance planifiée',
      `${getWorkoutSessionTitle(created)} a été ajoutée au planning du ${formatLocalDate(scheduledDate)}.`,
    );
    setExpandedDays((current) => {
      const next = new Set(current);
      next.add(scheduledDate);
      return next;
    });
    goToDate(scheduledDate);
    closePlanning();
  };

  const startAndOpen = async (sessionId: string) => {
    const session = await start(sessionId);
    if (session) await navigate(workoutSessionPath(session.id));
  };

  const sheetTitle = planningMode === 'choice'
    ? 'Planifier une activité'
    : planningMode === 'strength'
      ? 'Planifier une séance de musculation'
      : 'Planifier une activité d’endurance';
  const sheetDescription = planningMode === 'choice'
    ? 'Choisis le type d’activité à ajouter à cette semaine.'
    : planningMode === 'strength'
      ? 'La séance sera créée depuis un modèle existant.'
      : 'Course, natation, vélo, marche ou cardio.';

  return (
    <section aria-labelledby="weekly-planning-title" className="min-w-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Organisation sportive
          </p>
          <h1
            id="weekly-planning-title"
            className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
          >
            Planning sportif
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Consulte d’abord la semaine, puis planifie la musculation ou l’endurance dans une surface dédiée.
          </p>
        </div>
        <Button size="lg" onClick={() => openPlanning()}>
          <Plus aria-hidden="true" className="size-5" />
          Planifier
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex">
        <Link
          to={routePaths.workoutSessions}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Dumbbell aria-hidden="true" className="size-4" />
          Entraînements
        </Link>
        <Link
          to={routePaths.workoutTemplates}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
        >
          <Layers3 aria-hidden="true" className="size-4" />
          Modèles
        </Link>
      </div>

      <div
        id="weekly-planning-upcoming"
        tabIndex={-1}
        className="mt-5 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 outline-none dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Semaine affichée
          </p>
          <h2 className="mt-1 text-xl font-bold capitalize text-slate-950 dark:text-white">
            {formatWeekRange(weekStart)}
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {sessionCount} séance{sessionCount > 1 ? 's' : ''} de musculation planifiée{sessionCount > 1 ? 's' : ''}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            aria-label="Semaine précédente"
            onClick={() => changeWeek(-1)}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <Button variant="secondary" onClick={goToCurrentWeek}>
            Aujourd’hui
          </Button>
          <Button
            variant="secondary"
            aria-label="Semaine suivante"
            onClick={() => changeWeek(1)}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-4" tone="error" title="Action impossible">
          <p>{errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      <RefreshStatus
        visible={isRefreshing}
        label="Actualisation du planning…"
        className="mt-4"
      />

      <section className="mt-6" aria-labelledby="strength-week-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Cette semaine
            </p>
            <h2 id="strength-week-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Musculation
            </h2>
          </div>
          <Button size="sm" variant="secondary" onClick={() => openPlanning('strength')}>
            <Plus aria-hidden="true" className="size-4" />
            Ajouter
          </Button>
        </div>

        {status === 'loading' ? <PageSkeleton className="mt-4" variant="list" /> : null}

        {status === 'ready' && sessionCount === 0 ? (
          <EmptyState
            className="mt-4"
            icon={CalendarDays}
            title="Aucune séance de musculation prévue"
            description="Utilise l’action Planifier pour ajouter une séance à cette semaine."
            primaryAction={(
              <Button onClick={() => openPlanning('strength')}>
                Planifier une séance
              </Button>
            )}
          />
        ) : null}

        {status === 'ready' && sessionCount > 0 ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {days.map((day) => {
              const isOpen = expandedDays.has(day.date);

              return (
                <details
                  key={day.date}
                  id={`planning-day-${day.date}`}
                  open={isOpen}
                  onToggle={(event) => {
                    const nextOpen = event.currentTarget.open;
                    setExpandedDays((current) => {
                      const next = new Set(current);
                      if (nextOpen) next.add(day.date);
                      else next.delete(day.date);
                      return next;
                    });
                  }}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-slate-950/40"
                >
                  <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 flex-1 font-bold capitalize text-slate-950 dark:text-white">
                      {day.label}
                    </span>
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">
                      {day.sessions.length}
                    </span>
                    <ChevronDown
                      aria-hidden="true"
                      className="size-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                    />
                  </summary>

                  <div className="border-t border-slate-200 p-4 dark:border-slate-800">
                    {day.sessions.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Repos ou séance non planifiée.
                      </p>
                    ) : (
                      <div className="grid gap-3">
                        {day.sessions.map((summary) => (
                          <WeeklyPlanningSessionCard
                            key={summary.session.id}
                            summary={summary}
                            {...(calorieProjections[summary.session.id]
                              ? { calorieProjection: calorieProjections[summary.session.id] }
                              : {})}
                            busy={actionId === summary.session.id}
                            highlighted={summary.session.id === requestedSessionId}
                            onStart={(sessionId) => void startAndOpen(sessionId)}
                            onReschedule={reschedule}
                            onSkip={skip}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="mt-6" aria-labelledby="endurance-week-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="endurance-week-title" className="text-xl font-bold text-slate-950 dark:text-white">
              Endurance et cardio
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Consulte le prévu, le réalisé et les activités à replanifier.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={() => openPlanning('endurance')}>
            <Plus aria-hidden="true" className="size-4" />
            Ajouter
          </Button>
        </div>
        <div className="planning-overview-only -mt-2">
          <EndurancePlanningPanel weekStart={weekStart} />
        </div>
      </section>

      <section className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800" aria-labelledby="planning-secondary-actions-title">
        <h2 id="planning-secondary-actions-title" className="text-lg font-bold text-slate-950 dark:text-white">
          Actions secondaires
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Réutilise une semaine existante ou gère les modèles et historiques.
        </p>
        <RepeatTrainingWeekPanel weekStart={weekStart} onOpenWeek={goToDate} />
      </section>

      <BottomSheet
        open={planningOpen}
        title={sheetTitle}
        description={sheetDescription}
        onClose={closePlanning}
        initialFocusSelector={planningMode === 'choice' ? '[data-planning-choice]' : undefined}
        className="planning-create-sheet sm:max-w-3xl"
      >
        {planningMode === 'choice' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              data-planning-choice
              className="flex min-h-28 items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-brand-400 hover:bg-brand-50/60 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
              onClick={() => setPlanningMode('strength')}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200">
                <Dumbbell aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-bold text-slate-950 dark:text-white">Musculation</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                  Planifier une séance à partir d’un modèle.
                </span>
              </span>
            </button>
            <button
              type="button"
              className="flex min-h-28 items-start gap-3 rounded-2xl border border-slate-200 p-4 text-left hover:border-brand-400 hover:bg-brand-50/60 dark:border-slate-800 dark:hover:border-brand-700 dark:hover:bg-brand-950/20"
              onClick={() => setPlanningMode('endurance')}
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                <Activity aria-hidden="true" className="size-5" />
              </span>
              <span>
                <span className="block font-bold text-slate-950 dark:text-white">Endurance</span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                  Planifier une course, une natation, du vélo, de la marche ou du cardio.
                </span>
              </span>
            </button>
          </div>
        ) : null}

        {planningMode === 'strength' ? (
          <div>
            <Button className="mb-4" size="sm" variant="ghost" onClick={() => setPlanningMode('choice')}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Choisir un autre type
            </Button>

            {templates.length > 0 ? (
              <form className="space-y-4" onSubmit={(event) => void submitPlan(event)}>
                <div data-form-field>
                  <label htmlFor="planning-sheet-template" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Séance modèle
                  </label>
                  <select
                    id="planning-sheet-template"
                    value={templateId}
                    onChange={(event) => setTemplateId(event.target.value)}
                    className={`${inputClassName} mt-1`}
                  >
                    {templates.map(({ template }) => (
                      <option key={template.id} value={template.id}>{template.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div data-form-field>
                    <label htmlFor="planning-sheet-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Date prévue
                    </label>
                    <input
                      id="planning-sheet-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(event) => setScheduledDate(event.target.value)}
                      className={`${inputClassName} mt-1`}
                    />
                  </div>
                  <div data-form-field>
                    <label htmlFor="planning-sheet-duration" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Durée prévue
                    </label>
                    <input
                      id="planning-sheet-duration"
                      type="number"
                      min="1"
                      max="1440"
                      step="1"
                      value={plannedDurationMinutes}
                      onChange={(event) => setPlannedDurationMinutes(event.target.value)}
                      className={`${inputClassName} mt-1`}
                    />
                  </div>
                </div>
                <div data-form-field>
                  <label htmlFor="planning-sheet-strength-style" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Type de séance
                  </label>
                  <select
                    id="planning-sheet-strength-style"
                    value={strengthSessionStyle}
                    onChange={(event) => setStrengthSessionStyle(event.target.value as StrengthSessionStyle)}
                    className={`${inputClassName} mt-1`}
                  >
                    {Object.entries(strengthSessionStyleLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </div>
                {errorMessage ? (
                  <InlineNotice tone="error" title="Planification impossible">
                    {errorMessage}
                  </InlineNotice>
                ) : null}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    actionId === 'create'
                    || !templateId
                    || !scheduledDate
                    || !plannedDurationMinutes
                    || Number(plannedDurationMinutes) <= 0
                    || Number(plannedDurationMinutes) > 1_440
                  }
                >
                  <CalendarDays aria-hidden="true" className="size-5" />
                  {actionId === 'create' ? 'Planification…' : 'Planifier la séance'}
                </Button>
              </form>
            ) : (
              <InlineNotice title="Aucun modèle disponible">
                <p>Crée d’abord une séance modèle contenant au moins un exercice.</p>
                <Link
                  to={routePaths.newWorkoutTemplate}
                  className="mt-2 inline-flex font-semibold text-brand-700 hover:underline dark:text-brand-300"
                  onClick={closePlanning}
                >
                  Créer un modèle
                </Link>
              </InlineNotice>
            )}
          </div>
        ) : null}

        {planningMode === 'endurance' ? (
          <div>
            <Button className="mb-4" size="sm" variant="ghost" onClick={() => setPlanningMode('choice')}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Choisir un autre type
            </Button>
            <EndurancePlanningCreateForm
              initialDate={scheduledDate}
              onSaved={(session) => {
                setScheduledDate(session.date);
                goToDate(session.date);
                closePlanning();
              }}
            />
          </div>
        ) : null}
      </BottomSheet>
    </section>
  );
}
