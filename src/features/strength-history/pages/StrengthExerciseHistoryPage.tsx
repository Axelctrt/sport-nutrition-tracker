import { ArrowLeft, BarChart3, Dumbbell, History, LoaderCircle, Repeat2, Trophy } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { routePaths, workoutSessionPath } from '@/app/routePaths';
import type { StrengthSet } from '@/domain/models/strength';
import { useStrengthExerciseHistory } from '@/features/strength-history/hooks/useStrengthExerciseHistory';
import { strengthSetTypeLabels } from '@/features/strength-sessions/utils/strengthSetLabels';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

function setSummary(set: StrengthSet): string {
  const rpe = set.rpe === undefined ? '' : ` · RPE ${set.rpe}`;
  return `${set.weightKg} kg × ${set.repetitions}${rpe}`;
}

function formatVolume(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

export function StrengthExerciseHistoryPage() {
  const { exerciseId = '' } = useParams();
  const { exercise, history, status, errorMessage, refresh } = useStrengthExerciseHistory(exerciseId);

  if (status === 'loading') {
    return <Card className="p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement de l’historique…</p></Card>;
  }

  if (!exercise) {
    return <InlineNotice tone="error" title="Historique indisponible"><p>{errorMessage ?? 'Cet exercice n’existe pas.'}</p><button className="mt-3 font-semibold text-brand-700 hover:underline dark:text-brand-300" type="button" onClick={() => void refresh()}>Réessayer</button></InlineNotice>;
  }

  const workingSets = history.flatMap((entry) => entry.workingSets);
  const bestLoad = workingSets.reduce((best, set) => Math.max(best, set.weightKg), 0);
  const totalVolume = history.reduce((total, entry) => total + entry.totalVolumeKg, 0);

  return (
    <section aria-labelledby="strength-history-title">
      <Link to={routePaths.strengthExercises} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"><ArrowLeft aria-hidden="true" className="size-4" />Retour au catalogue</Link>
      <div className="mt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Historique de progression</p>
        <h1 id="strength-history-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{exercise.name}</h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Retrouve les séries validées de chaque séance terminée. Les séries d’échauffement restent visibles mais sont exclues du volume principal.</p>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Card className="p-5"><History aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Séances enregistrées</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{history.length}</p></Card>
        <Card className="p-5"><Trophy aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Meilleure charge</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{bestLoad} kg</p></Card>
        <Card className="p-5"><BarChart3 aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" /><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Volume cumulé</p><p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{formatVolume(totalVolume)} kg</p></Card>
      </div>

      {history.length === 0 ? (
        <Card className="mt-8 p-8 text-center"><Dumbbell aria-hidden="true" className="mx-auto size-10 text-slate-400" /><h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Aucune performance enregistrée</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Termine une séance avec au moins une série validée pour faire apparaître cet historique.</p></Card>
      ) : (
        <div className="mt-8 space-y-4">
          {history.map((entry) => (
            <Card key={entry.session.id} className="p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">{formatLocalDate(entry.session.date)}</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-white">{entry.session.sourceTemplateNameSnapshot ?? 'Séance libre'}</h2>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">{entry.sets.length} série{entry.sets.length > 1 ? 's' : ''}</span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">Volume : {formatVolume(entry.totalVolumeKg)} kg</span>
                  </div>
                </div>
                <Link to={workoutSessionPath(entry.session.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Repeat2 aria-hidden="true" className="size-4" />Voir la séance</Link>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {entry.sets.map((set) => (
                  <div key={set.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3"><p className="font-semibold text-slate-950 dark:text-white">Série {set.setNumber}</p><span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{strengthSetTypeLabels[set.type]}</span></div>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{setSummary(set)}</p>
                    {set.notes ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{set.notes}</p> : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
