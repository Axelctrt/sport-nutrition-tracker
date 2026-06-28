import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Layers3,
  Plus,
  ChevronDown,
} from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  useRef,
} from 'react';
import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import type { LocalDate } from '@/domain/models/common';
import { formatWeekRange } from '@/application/strength/weeklyPlanningService';
import { routePaths, workoutSessionPath } from '@/app/routePaths';
import { WeeklyPlanningSessionCard } from '@/features/strength-planning/components/WeeklyPlanningSessionCard';
import { EndurancePlanningPanel } from '@/features/strength-planning/components/EndurancePlanningPanel';
import { RepeatTrainingWeekPanel } from '@/features/strength-planning/components/RepeatTrainingWeekPanel';
import { useWeeklyPlanning } from '@/features/strength-planning/hooks/useWeeklyPlanning';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import {
  toLocalDate,
  formatLocalDate,
} from '@/shared/utils/dates';
import {
  getWorkoutSessionTitle,
} from '@/application/strength/workoutSessionService';
import {
  isValidLocalDate,
} from '@/shared/validation/localDate';
import {
  useToast,
} from '@/shared/toast/useToast';

export function WeeklyPlanningPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();
  const focusHandledRef = useRef(false);
  const sectionHandledRef = useRef(false);
  const requestedDateValue =
    searchParams.get('date');
  const requestedDate =
    requestedDateValue &&
    isValidLocalDate(requestedDateValue)
      ? (requestedDateValue as LocalDate)
      : undefined;
  const requestedSessionId =
    searchParams.get('session');
  const requestedSection =
    searchParams.get('section');
  const {
    weekStart,
    days,
    templates,
    status,
    errorMessage,
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
  const [expandedDays, setExpandedDays] =
    useState<Set<LocalDate>>(
      () => new Set(),
    );

  useEffect(() => {
    if (!templateId && templates[0]) setTemplateId(templates[0].template.id);
  }, [templateId, templates]);

  useEffect(() => {
    if (requestedDate) {
      goToDate(requestedDate);
    }
  }, [goToDate, requestedDate]);

  useEffect(() => {
    setExpandedDays(new Set());
  }, [weekStart]);

  useEffect(() => {
    if (
      !requestedDate ||
      !requestedSessionId
    ) {
      return;
    }

    setExpandedDays((current) => {
      if (current.has(requestedDate)) {
        return current;
      }

      const next = new Set(current);
      next.add(requestedDate);
      return next;
    });
  }, [
    requestedDate,
    requestedSessionId,
    weekStart,
  ]);

  useEffect(() => {
    focusHandledRef.current = false;
  }, [requestedSessionId]);

  useEffect(() => {
    sectionHandledRef.current = false;
  }, [requestedSection]);

  useEffect(() => {
    if (
      status !== 'ready' ||
      !requestedSessionId ||
      focusHandledRef.current ||
      (requestedDate &&
        !expandedDays.has(requestedDate))
    ) {
      return;
    }

    const target = document.getElementById(
      `planning-session-${requestedSessionId}`,
    );

    if (!target) {
      return;
    }

    focusHandledRef.current = true;
    target.scrollIntoView?.({
      behavior: 'smooth',
      block: 'center',
    });

    const focusTimeout = window.setTimeout(() => {
      target.focus({
        preventScroll: true,
      });
    }, 0);

    return () => {
      window.clearTimeout(focusTimeout);
    };
  }, [
    days,
    expandedDays,
    requestedDate,
    requestedSessionId,
    status,
  ]);

  useEffect(() => {
    if (
      status !== 'ready' ||
      requestedSection !== 'upcoming' ||
      sectionHandledRef.current
    ) {
      return;
    }

    const target = document.getElementById(
      'weekly-planning-upcoming',
    );

    if (!target) {
      return;
    }

    sectionHandledRef.current = true;
    target.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    });
    target.focus({
      preventScroll: true,
    });
  }, [
    requestedSection,
    status,
    weekStart,
  ]);

  const sessionCount = useMemo(
    () => days.reduce((total, day) => total + day.sessions.length, 0),
    [days],
  );

  const submitPlan = async () => {
    if (!templateId || !scheduledDate) return;
    const created = await plan(
      templateId,
      scheduledDate,
    );

    if (created) {
      toast.success(
        'Séance planifiée',
        `${getWorkoutSessionTitle(
          created,
        )} a été ajoutée au planning du ${formatLocalDate(
          scheduledDate,
        )}.`,
      );
      setExpandedDays((current) => {
        const next = new Set(current);
        next.add(scheduledDate);
        return next;
      });
      goToDate(scheduledDate);
    }
  };

  const startAndOpen = async (sessionId: string) => {
    const session = await start(sessionId);
    if (session) await navigate(workoutSessionPath(session.id));
  };

  return (
    <section aria-labelledby="weekly-planning-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Planning sportif</p>
          <h1 id="weekly-planning-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Planning hebdomadaire</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Planifie la musculation et les activités d’endurance, puis compare automatiquement le prévu avec ce qui a réellement été effectué.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link to={routePaths.workoutSessions} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <Dumbbell aria-hidden="true" className="size-4" />Entraînements
          </Link>
          <Link to={routePaths.workoutTemplates} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <Layers3 aria-hidden="true" className="size-4" />Modèles
          </Link>
        </div>
      </div>

      <RepeatTrainingWeekPanel
        weekStart={weekStart}
        onOpenWeek={goToDate}
      />

      <EndurancePlanningPanel weekStart={weekStart} />

<Card className="mt-6 p-4 sm:p-5" aria-label="Planifier une séance de musculation">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <Plus aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950 dark:text-white">Ajouter une séance de musculation</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Le contenu du modèle est figé au moment de la planification.</p>
          </div>
        </div>

        {templates.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(11rem,0.55fr)_auto] sm:items-end">
            <div>
              <label htmlFor="planning-template" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Séance modèle</label>
              <select id="planning-template" value={templateId} onChange={(event) => setTemplateId(event.target.value)} className={`${inputClassName} mt-1`}>
                {templates.map(({ template }) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="planning-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Date prévue</label>
              <input id="planning-date" type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className={`${inputClassName} mt-1`} />
            </div>
            <Button size="lg" disabled={actionId === 'create' || !templateId || !scheduledDate} onClick={() => void submitPlan()}>
              <CalendarDays aria-hidden="true" className="size-5" />{actionId === 'create' ? 'Planification…' : 'Planifier'}
            </Button>
          </div>
        ) : (
          <InlineNotice className="mt-4" title="Aucun modèle disponible">
            <p>Crée d’abord une séance modèle contenant au moins un exercice.</p>
            <Link to={routePaths.newWorkoutTemplate} className="mt-2 inline-flex font-semibold text-brand-700 hover:underline dark:text-brand-300">Créer un modèle</Link>
          </InlineNotice>
        )}
      </Card>

      {errorMessage ? <InlineNotice className="mt-4" tone="error" title="Action impossible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}

      <div
        id="weekly-planning-upcoming"
        tabIndex={-1}
        className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 outline-none dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Semaine affichée</p>
          <h2 className="mt-1 text-xl font-bold capitalize text-slate-950 dark:text-white">{formatWeekRange(weekStart)}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{sessionCount} séance{sessionCount > 1 ? 's' : ''} liée{sessionCount > 1 ? 's' : ''} à cette semaine</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" aria-label="Semaine précédente" onClick={() => changeWeek(-1)}><ChevronLeft aria-hidden="true" className="size-5" /></Button>
          <Button variant="secondary" onClick={goToCurrentWeek}>Aujourd’hui</Button>
          <Button variant="secondary" aria-label="Semaine suivante" onClick={() => changeWeek(1)}><ChevronRight aria-hidden="true" className="size-5" /></Button>
        </div>
      </div>

      {status === 'loading' ? <PageSkeleton className="mt-5" variant="list" /> : null}

      {status === 'ready' && sessionCount === 0 ? (
        <EmptyState className="mt-5" icon={CalendarDays} title="Aucune séance prévue cette semaine" description="Utilise le formulaire ci-dessus pour ajouter ta première séance au planning." />
      ) : null}

      {status === 'ready' ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {days.map((day) => {
            const isOpen =
              expandedDays.has(day.date);

            return (
              <details
                key={day.date}
                id={`planning-day-${day.date}`}
                open={isOpen}
                onToggle={(event) => {
                  const nextOpen =
                    event.currentTarget.open;

                  setExpandedDays(
                    (current) => {
                      const next =
                        new Set(current);

                      if (nextOpen) {
                        next.add(day.date);
                      } else {
                        next.delete(day.date);
                      }

                      return next;
                    },
                  );
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
                      {day.sessions.map(
                        (summary) => (
                          <WeeklyPlanningSessionCard
                            key={
                              summary.session.id
                            }
                            summary={summary}
                            busy={
                              actionId ===
                              summary.session.id
                            }
                            highlighted={
                              summary.session.id ===
                              requestedSessionId
                            }
                            onStart={(sessionId) =>
                              void startAndOpen(
                                sessionId,
                              )
                            }
                            onReschedule={
                              reschedule
                            }
                            onSkip={skip}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
