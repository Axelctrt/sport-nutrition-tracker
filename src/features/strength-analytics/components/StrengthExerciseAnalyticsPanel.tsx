import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { StrengthExerciseAnalytics } from '@/application/strength/strengthAnalyticsService';
import { workoutSessionPath } from '@/app/routePaths';
import { Link } from 'react-router-dom';
import { ChartCard } from '@/shared/charts/ChartCard';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { cn } from '@/shared/utils/cn';
import { formatLocalDate } from '@/shared/utils/dates';

interface StrengthExerciseAnalyticsPanelProps {
  analytics: StrengthExerciseAnalytics;
  embedded?: boolean;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value);
}

function formatSigned(value: number, suffix = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatNumber(value)}${suffix}`;
}

function comparisonTone(value: number): string {
  if (value > 0) return 'text-emerald-700 dark:text-emerald-300';
  if (value < 0) return 'text-amber-700 dark:text-amber-300';
  return 'text-slate-600 dark:text-slate-300';
}

export function StrengthExerciseAnalyticsPanel({ analytics, embedded = false }: StrengthExerciseAnalyticsPanelProps) {
  const { summary, sessions, comparison, loadRepetitionRecords } = analytics;

  if (sessions.length === 0) {
    return (
      <InlineNotice className={embedded ? undefined : 'mt-6'} tone="info" title="Statistiques en attente">
        Termine au moins une série de travail pour générer les records et les graphiques. Les séries d’échauffement seules ne sont pas comptabilisées.
      </InlineNotice>
    );
  }

  const chartData = sessions.map((session) => ({
    date: formatLocalDate(session.date, 'd MMM yy'),
    chargeMaximale: session.bestLoadKg,
    chargeMoyenne: session.averageLoadKg,
    estimationUnRm: session.estimatedOneRepMaxKg,
    volume: session.totalVolumeKg,
    repetitions: session.totalRepetitions,
  }));

  const metrics = [
    ['Meilleure charge', `${formatNumber(summary.bestLoadKg)} kg`],
    ['Charge moyenne', `${formatNumber(summary.averageLoadKg)} kg`],
    ['Meilleure série', `${formatNumber(summary.bestSetVolumeKg)} kg`],
    ['Meilleur volume', `${formatNumber(summary.bestSessionVolumeKg)} kg`],
    ['Record répétitions', summary.bestRepetitions.toString()],
    ['1RM estimé', summary.estimatedOneRepMaxKg === undefined ? '—' : `${formatNumber(summary.estimatedOneRepMaxKg)} kg`],
  ] as const;

  return (
    <div className={cn('space-y-4', !embedded && 'mt-8')}>
      {!embedded ? (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Analyse de progression</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Records et tendances</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Calculs basés uniquement sur les séries de travail validées.</p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
            <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>

      {comparison ? (
        <Card className="p-4 sm:p-5">
          <h3 className="font-semibold text-slate-950 dark:text-white">Comparaison avec la séance précédente</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatLocalDate(comparison.latest.date)} contre {formatLocalDate(comparison.previous.date)}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Volume', comparison.volumeDeltaKg, ' kg'],
              ['Charge max.', comparison.bestLoadDeltaKg, ' kg'],
              ['Répétitions', comparison.repetitionsDelta, ''],
              ['Charge moyenne', comparison.averageLoadDeltaKg, ' kg'],
            ].map(([label, value, suffix]) => (
              <div key={label as string} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                <p className={`mt-1 font-bold ${comparisonTone(value as number)}`}>{formatSigned(value as number, suffix as string)}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <InlineNotice tone="info" title="Comparaison bientôt disponible">Une deuxième séance de travail est nécessaire pour mesurer l’évolution.</InlineNotice>
      )}

      <details className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer list-none px-4 py-4 font-semibold text-slate-950 dark:text-white [&::-webkit-details-marker]:hidden">Graphiques de progression</summary>
        <div className="space-y-4 border-t border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          <ChartCard title="Évolution des charges" description="Charge maximale, moyenne et estimation du 1RM.">
            <div className="h-64" aria-label="Graphique de l’évolution des charges">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 256 }}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} unit=" kg" />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="chargeMaximale" name="Max." stroke="#0f766e" strokeWidth={3} connectNulls />
                  <Line type="monotone" dataKey="chargeMoyenne" name="Moy." stroke="#2563eb" strokeWidth={2} connectNulls />
                  <Line type="monotone" dataKey="estimationUnRm" name="1RM" stroke="#7c3aed" strokeDasharray="6 4" strokeWidth={2} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard title="Évolution du volume" description="Volume total et répétitions par séance.">
            <div className="h-64" aria-label="Graphique de l’évolution du volume et des répétitions">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 256 }}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis yAxisId="volume" fontSize={10} />
                  <YAxis yAxisId="repetitions" orientation="right" fontSize={10} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar yAxisId="volume" dataKey="volume" name="Volume" fill="#0f766e" radius={[5, 5, 0, 0]} />
                  <Line yAxisId="repetitions" type="monotone" dataKey="repetitions" name="Rép." stroke="#d97706" strokeWidth={3} connectNulls />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer list-none px-4 py-4 font-semibold text-slate-950 dark:text-white [&::-webkit-details-marker]:hidden">Records de répétitions par charge</summary>
        <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          {loadRepetitionRecords.map((record) => (
            <div key={record.weightKg} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">{formatNumber(record.weightKg)} kg</p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatLocalDate(record.date)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-700 dark:text-brand-300">{record.repetitions} répétition{record.repetitions > 1 ? 's' : ''}</p>
                <Link to={workoutSessionPath(record.sessionId)} className="mt-1 inline-flex text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300">Voir la séance</Link>
              </div>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
