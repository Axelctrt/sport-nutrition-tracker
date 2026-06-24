import { addDays, parseISO } from 'date-fns';
import {
  Apple,
  CalendarDays,
  CheckCircle2,
  Dumbbell,
  Footprints,
  Scale,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { foodJournalPath, routePaths } from '@/app/routePaths';
import { useHistory } from '@/features/history/hooks/useHistory';
import { inputClassName } from '@/shared/forms/formStyles';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

function initialFromDate(): string {
  return toLocalDate(addDays(new Date(), -27));
}

function formatNumber(value: number | undefined, unit: string): string {
  if (value === undefined) return '—';
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}${unit}`;
}

export function HistoryPage() {
  const [from, setFrom] = useState(initialFromDate());
  const [to, setTo] = useState(toLocalDate());
  const { days, status, errorMessage } = useHistory(from, to);
  const invalidRange = from > to;

  const totals = useMemo(() => ({
    activeDays: days.filter((day) => day.activityCount > 0).length,
    trackedFoodDays: days.filter((day) => day.consumedCaloriesKcal !== undefined).length,
    weighInDays: days.filter((day) => day.weightKg !== undefined).length,
    completedDays: days.filter((day) => day.journalComplete).length,
  }), [days]);

  return (
    <section aria-labelledby="history-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-300">
            Vue chronologique
          </p>
          <h1 id="history-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Historique
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            Consulte les journées comportant au moins une donnée de poids, de pas, d’activité, de nutrition ou d’objectif énergétique.
          </p>
        </div>
        <Link
          to={routePaths.analytics}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800"
        >
          Voir les analyses sur 12 semaines
        </Link>
      </div>

      <Card className="mt-6 p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:max-w-2xl">
          <div>
            <label htmlFor="history-from" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Du
            </label>
            <input
              id="history-from"
              type="date"
              value={from}
              max={to}
              onChange={(event) => setFrom(event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <div>
            <label htmlFor="history-to" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Au
            </label>
            <input
              id="history-to"
              type="date"
              value={to}
              min={from}
              onChange={(event) => setTo(event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          </div>
        </div>
      </Card>

      {invalidRange ? (
        <InlineNotice className="mt-6" tone="error" title="Période invalide" role="alert">
          La date de début doit précéder la date de fin.
        </InlineNotice>
      ) : null}

      {status === 'error' ? (
        <InlineNotice className="mt-6" tone="error" title="Historique indisponible" role="alert">
          {errorMessage}
        </InlineNotice>
      ) : null}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Jours avec sport</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{totals.activeDays}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Jours alimentaires suivis</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{totals.trackedFoodDays}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Pesées</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{totals.weighInDays}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">Journées terminées</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{totals.completedDays}</p>
        </Card>
      </div>

      {status === 'loading' ? (
        <div className="py-16 text-center" role="status">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Chargement de l’historique…</p>
        </div>
      ) : days.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <CalendarDays aria-hidden="true" className="mx-auto size-9 text-slate-400" />
          <p className="mt-3 font-semibold text-slate-950 dark:text-white">Aucune donnée sur cette période</p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Élargis la période ou commence à renseigner ton suivi quotidien.</p>
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {days.map((day) => (
            <Card key={day.date} className="overflow-hidden">
              <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {formatLocalDate(day.date, 'EEEE d MMMM yyyy')}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {day.journalComplete ? 'Journal alimentaire marqué comme terminé' : 'Journée en cours ou non clôturée'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to={foodJournalPath(day.date)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Apple aria-hidden="true" className="size-4" /> Journal
                  </Link>
                  <Link
                    to={`${routePaths.activities}?date=${encodeURIComponent(day.date)}`}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Dumbbell aria-hidden="true" className="size-4" /> Activités
                  </Link>
                </div>
              </div>
              <div className="grid gap-px bg-slate-200 sm:grid-cols-2 xl:grid-cols-5 dark:bg-slate-800">
                <div className="bg-white p-4 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Scale className="size-4" aria-hidden="true" /> Poids</div>
                  <p className="mt-2 font-semibold tabular-nums">{formatNumber(day.weightKg, ' kg')}</p>
                </div>
                <div className="bg-white p-4 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Footprints className="size-4" aria-hidden="true" /> Pas</div>
                  <p className="mt-2 font-semibold tabular-nums">{formatNumber(day.totalSteps, '')}</p>
                </div>
                <div className="bg-white p-4 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Dumbbell className="size-4" aria-hidden="true" /> Sport</div>
                  <p className="mt-2 font-semibold tabular-nums">{day.activityCount} séance(s) · {day.sportMinutes.toLocaleString('fr-FR')} min</p>
                  <p className="mt-1 text-xs text-slate-500">≈ {day.estimatedActivityCaloriesKcal.toLocaleString('fr-FR')} kcal</p>
                </div>
                <div className="bg-white p-4 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><Apple className="size-4" aria-hidden="true" /> Calories</div>
                  <p className="mt-2 font-semibold tabular-nums">
                    {day.consumedCaloriesKcal === undefined ? '—' : day.consumedCaloriesKcal.toLocaleString('fr-FR')}
                    {' / '}
                    {day.targetCaloriesKcal === undefined ? '—' : day.targetCaloriesKcal.toLocaleString('fr-FR')}
                  </p>
                </div>
                <div className="bg-white p-4 dark:bg-slate-900">
                  <div className="flex items-center gap-2 text-sm text-slate-500"><CheckCircle2 className="size-4" aria-hidden="true" /> Protéines</div>
                  <p className="mt-2 font-semibold tabular-nums">
                    {day.consumedProteinGrams === undefined ? '—' : day.consumedProteinGrams.toLocaleString('fr-FR')}
                    {' / '}
                    {day.targetProteinGrams === undefined ? '—' : day.targetProteinGrams.toLocaleString('fr-FR')} g
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-500 dark:text-slate-400">
        Période sélectionnée : {formatLocalDate(from)} au {formatLocalDate(to)} ({Math.max(0, Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / 86_400_000) + 1)} jours).
      </p>
    </section>
  );
}
