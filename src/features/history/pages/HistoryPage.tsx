import { addDays, parseISO } from 'date-fns';
import { BarChart3, CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import { HistoryDayCard } from '@/features/history/components/HistoryDayCard';
import { HistoryPeriodControls } from '@/features/history/components/HistoryPeriodControls';
import { HistorySummary } from '@/features/history/components/HistorySummary';
import { useHistory } from '@/features/history/hooks/useHistory';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

function initialFromDate(): string {
  return toLocalDate(addDays(new Date(), -27));
}

export function HistoryPage() {
  const { profile } = useProfile();
  const [from, setFrom] = useState(initialFromDate());
  const [to, setTo] = useState(toLocalDate());
  const { days, status, errorMessage } = useHistory(from, to);
  const invalidRange = from > to;
  const periodLength = Math.max(
    0,
    Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1,
  );

  return (
    <section className="min-w-0" aria-labelledby="history-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Vue chronologique
          </p>
          <h1 id="history-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Historique
          </h1>
          <p className="mt-2 hidden max-w-3xl text-slate-600 dark:text-slate-300 sm:block">
            Parcours les journées suivies et retrouve rapidement leur poids, leurs pas, leurs activités et leur alimentation.
          </p>
        </div>
        <Link
          to={routePaths.analytics}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
        >
          <BarChart3 aria-hidden="true" className="size-4" />
          Analyses sur 12 semaines
        </Link>
      </div>

      <HistoryPeriodControls
        from={from}
        to={to}
        onChange={(nextFrom, nextTo) => {
          setFrom(nextFrom);
          setTo(nextTo);
        }}
      />

      {invalidRange ? (
        <InlineNotice className="mt-4" tone="error" title="Période invalide" role="alert">
          La date de début doit précéder la date de fin.
        </InlineNotice>
      ) : null}

      {status === 'error' ? (
        <InlineNotice className="mt-4" tone="error" title="Historique indisponible" role="alert">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {status === 'loading' ? <PageSkeleton className="mt-5" variant="list" /> : null}

      {status === 'ready' && !invalidRange ? (
        <>
          <HistorySummary days={days} dailyStepGoal={profile?.dailyStepGoal ?? 0} />

          {days.length === 0 ? (
            <EmptyState
              className="mt-4"
              icon={CalendarDays}
              title="Aucune donnée sur cette période"
              description="Élargis la période ou commence à renseigner ton suivi quotidien."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {days.map((day) => <HistoryDayCard key={day.date} day={day} />)}
            </div>
          )}

          <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {days.length} {days.length > 1 ? 'journées comportant des données' : 'journée comportant des données'} entre le {formatLocalDate(from)} et le {formatLocalDate(to)} ({periodLength} jours calendaires).
          </p>
        </>
      ) : null}
    </section>
  );
}
