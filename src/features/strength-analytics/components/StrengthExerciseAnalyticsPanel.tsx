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
import { ChartCard } from '@/shared/charts/ChartCard';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatLocalDate } from '@/shared/utils/dates';

interface StrengthExerciseAnalyticsPanelProps {
  analytics: StrengthExerciseAnalytics;
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

export function StrengthExerciseAnalyticsPanel({ analytics }: StrengthExerciseAnalyticsPanelProps) {
  const { summary, sessions, comparison, loadRepetitionRecords } = analytics;

  if (sessions.length === 0) {
    return (
      <InlineNotice className="mt-6" tone="info" title="Statistiques en attente">
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

  return (
    <div className="mt-8 space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Analyse de progression
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Records et tendances
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
          Les calculs utilisent uniquement les séries de travail validées. La charge moyenne correspond à la moyenne des charges par série, et non à une mesure physiologique.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Meilleure charge</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{formatNumber(summary.bestLoadKg)} kg</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Charge moyenne</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{formatNumber(summary.averageLoadKg)} kg</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Moyenne par série de travail</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Meilleure série</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{formatNumber(summary.bestSetVolumeKg)} kg</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Charge × répétitions</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Meilleur volume séance</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{formatNumber(summary.bestSessionVolumeKg)} kg</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">Record de répétitions</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{summary.bestRepetitions}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Sur une série de travail</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm text-slate-500 dark:text-slate-400">1RM estimé</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
            {summary.estimatedOneRepMaxKg === undefined ? '—' : `${formatNumber(summary.estimatedOneRepMaxKg)} kg`}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Formule d’Epley, séries de 1 à 12 répétitions</p>
        </Card>
      </div>

      {comparison ? (
        <Card className="p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
            Comparaison avec la séance précédente
          </h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {formatLocalDate(comparison.latest.date)} comparé au {formatLocalDate(comparison.previous.date)}.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Volume</p>
              <p className={`mt-1 text-lg font-bold ${comparisonTone(comparison.volumeDeltaKg)}`}>
                {formatSigned(comparison.volumeDeltaKg, ' kg')}
              </p>
              {comparison.volumeDeltaPercent === undefined ? null : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {formatSigned(comparison.volumeDeltaPercent, ' %')}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Charge maximale</p>
              <p className={`mt-1 text-lg font-bold ${comparisonTone(comparison.bestLoadDeltaKg)}`}>
                {formatSigned(comparison.bestLoadDeltaKg, ' kg')}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Répétitions</p>
              <p className={`mt-1 text-lg font-bold ${comparisonTone(comparison.repetitionsDelta)}`}>
                {formatSigned(comparison.repetitionsDelta)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Charge moyenne</p>
              <p className={`mt-1 text-lg font-bold ${comparisonTone(comparison.averageLoadDeltaKg)}`}>
                {formatSigned(comparison.averageLoadDeltaKg, ' kg')}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <InlineNotice tone="info" title="Comparaison bientôt disponible">
          Une deuxième séance avec des séries de travail validées est nécessaire pour mesurer l’évolution.
        </InlineNotice>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartCard
          title="Évolution des charges"
          description="Charge maximale, charge moyenne et estimation du 1RM par séance terminée."
        >
          <div className="h-80" aria-label="Graphique de l’évolution des charges">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} unit=" kg" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="chargeMaximale" name="Charge maximale (kg)" stroke="#0f766e" strokeWidth={3} connectNulls />
                <Line type="monotone" dataKey="chargeMoyenne" name="Charge moyenne (kg)" stroke="#2563eb" strokeWidth={2} connectNulls />
                <Line type="monotone" dataKey="estimationUnRm" name="1RM estimé (kg)" stroke="#7c3aed" strokeDasharray="6 4" strokeWidth={2} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Évolution du volume"
          description="Volume total et répétitions des séries de travail validées par séance."
        >
          <div className="h-80" aria-label="Graphique de l’évolution du volume et des répétitions">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 640, height: 320 }}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis yAxisId="volume" fontSize={12} />
                <YAxis yAxisId="repetitions" orientation="right" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="volume" dataKey="volume" name="Volume (kg)" fill="#0f766e" radius={[5, 5, 0, 0]} />
                <Line yAxisId="repetitions" type="monotone" dataKey="repetitions" name="Répétitions" stroke="#d97706" strokeWidth={3} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-200 p-5 dark:border-slate-800">
          <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Records de répétitions par charge</h3>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Meilleur nombre de répétitions validées pour chaque charge utilisée.
          </p>
        </div>
        <div className="overflow-x-auto p-4 sm:p-5">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead className="text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-3">Charge</th>
                <th className="pb-3">Record</th>
                <th className="pb-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {loadRepetitionRecords.map((record) => (
                <tr key={record.weightKg}>
                  <td className="py-3 font-semibold text-slate-950 dark:text-white">{formatNumber(record.weightKg)} kg</td>
                  <td className="py-3">{record.repetitions} répétition{record.repetitions > 1 ? 's' : ''}</td>
                  <td className="py-3">{formatLocalDate(record.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
