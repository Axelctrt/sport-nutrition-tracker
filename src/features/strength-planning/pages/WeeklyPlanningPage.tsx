import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Layers3, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { LocalDate } from '@/domain/models/common';
import { formatWeekRange } from '@/application/strength/weeklyPlanningService';
import { routePaths, workoutSessionPath } from '@/app/routePaths';
import { WeeklyPlanningSessionCard } from '@/features/strength-planning/components/WeeklyPlanningSessionCard';
import { EndurancePlanningPanel } from '@/features/strength-planning/components/EndurancePlanningPanel';
import { useWeeklyPlanning } from '@/features/strength-planning/hooks/useWeeklyPlanning';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { toLocalDate } from '@/shared/utils/dates';

export function WeeklyPlanningPage() {
  const navigate = useNavigate();
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

  useEffect(() => {
    if (!templateId && templates[0]) setTemplateId(templates[0].template.id);
  }, [templateId, templates]);

  const sessionCount = useMemo(
    () => days.reduce((total, day) => total + day.sessions.length, 0),
    [days],
  );

  const submitPlan = async () => {
    if (!templateId || !scheduledDate) return;
    const created = await plan(templateId, scheduledDate);
    if (created) goToDate(scheduledDate);
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

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
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
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {days.map((day) => (
            <section key={day.date} aria-labelledby={`planning-day-${day.date}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <h2 id={`planning-day-${day.date}`} className="font-bold capitalize text-slate-950 dark:text-white">{day.label}</h2>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm dark:bg-slate-900 dark:text-slate-300">{day.sessions.length}</span>
              </div>
              {day.sessions.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Repos ou séance non planifiée.</p>
              ) : (
                <div className="mt-3 grid gap-3">
                  {day.sessions.map((summary) => (
                    <WeeklyPlanningSessionCard
                      key={summary.session.id}
                      summary={summary}
                      busy={actionId === summary.session.id}
                      onStart={(sessionId) => void startAndOpen(sessionId)}
                      onReschedule={reschedule}
                      onSkip={skip}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      ) : null}
    </section>
  );
}
