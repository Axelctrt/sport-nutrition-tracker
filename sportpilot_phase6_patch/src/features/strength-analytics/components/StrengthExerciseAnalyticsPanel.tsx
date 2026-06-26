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
import type {
  StrengthExerciseAnalytics,
  StrengthExerciseComparison,
} from '@/application/strength/strengthAnalyticsService';
import { workoutSessionPath } from '@/app/routePaths';
import { Link } from 'react-router-dom';
import type { StrengthTrackingMode } from '@/domain/models/strength';
import {
  formatStrengthDuration,
  formatStrengthNumber,
  trackingModeTitle,
} from '@/features/strength-history/utils/strengthPerformanceFormatting';
import { ChartCard } from '@/shared/charts/ChartCard';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { cn } from '@/shared/utils/cn';
import { formatLocalDate } from '@/shared/utils/dates';

interface StrengthExerciseAnalyticsPanelProps {
  analytics: StrengthExerciseAnalytics;
  embedded?: boolean;
}

interface Metric {
  label: string;
  value: string;
}

interface ComparisonMetric {
  label: string;
  value: number;
  suffix?: string;
  formatter?: (value: number) => string;
  positiveIsBetter?: boolean;
}

function formatSigned(value: number, suffix = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${formatStrengthNumber(value)}${suffix}`;
}

function comparisonTone(value: number, positiveIsBetter = true): string {
  if (value === 0) return 'text-slate-600 dark:text-slate-300';
  const isImprovement = positiveIsBetter ? value > 0 : value < 0;
  return isImprovement
    ? 'text-emerald-700 dark:text-emerald-300'
    : 'text-amber-700 dark:text-amber-300';
}

function metricsForMode(analytics: StrengthExerciseAnalytics): Metric[] {
  const { summary, trackingMode } = analytics;
  switch (trackingMode) {
    case 'loadRepetitions':
      return [
        { label: 'Meilleure charge', value: `${formatStrengthNumber(summary.bestLoadKg)} kg` },
        { label: 'Charge moyenne', value: `${formatStrengthNumber(summary.averageLoadKg)} kg` },
        { label: 'Meilleure série', value: `${formatStrengthNumber(summary.bestSetVolumeKg)} kg` },
        { label: 'Meilleur volume', value: `${formatStrengthNumber(summary.bestSessionVolumeKg)} kg` },
        { label: 'Record répétitions', value: summary.bestRepetitions.toString() },
        { label: '1RM estimé', value: summary.estimatedOneRepMaxKg === undefined ? '—' : `${formatStrengthNumber(summary.estimatedOneRepMaxKg)} kg` },
      ];
    case 'bodyweightRepetitions':
      return [
        { label: 'Record répétitions', value: summary.bestRepetitions.toString() },
        { label: 'Total répétitions', value: summary.totalRepetitions.toString() },
        { label: 'Séries de travail', value: summary.workingSetCount.toString() },
        { label: 'Meilleur lest', value: summary.maximumAdditionalLoadKg > 0 ? `+${formatStrengthNumber(summary.maximumAdditionalLoadKg)} kg` : 'Sans lest' },
        { label: 'Volume additionnel', value: `${formatStrengthNumber(summary.totalAdditionalVolumeKg)} kg` },
        { label: 'Charge totale max.', value: summary.hasEffectiveLoadData ? `${formatStrengthNumber(summary.bestLoadKg)} kg` : 'Poids requis' },
      ];
    case 'assistedRepetitions':
      return [
        { label: 'Assistance minimale', value: `${formatStrengthNumber(summary.minimumAssistanceKg)} kg` },
        { label: 'Record répétitions', value: summary.bestRepetitions.toString() },
        { label: 'Total répétitions', value: summary.totalRepetitions.toString() },
        { label: 'Séries de travail', value: summary.workingSetCount.toString() },
        { label: 'Charge effective max.', value: summary.hasEffectiveLoadData ? `${formatStrengthNumber(summary.bestLoadKg)} kg` : 'Poids requis' },
        { label: 'Volume effectif', value: summary.hasEffectiveLoadData ? `${formatStrengthNumber(summary.totalVolumeKg)} kg` : 'Poids requis' },
      ];
    case 'repetitions':
      return [
        { label: 'Record répétitions', value: summary.bestRepetitions.toString() },
        { label: 'Total répétitions', value: summary.totalRepetitions.toString() },
        { label: 'Séries de travail', value: summary.workingSetCount.toString() },
        { label: 'Séances', value: summary.sessionCount.toString() },
      ];
    case 'duration':
      return [
        { label: 'Meilleure durée', value: formatStrengthDuration(summary.bestDurationSeconds) },
        { label: 'Durée totale', value: formatStrengthDuration(summary.totalDurationSeconds) },
        { label: 'Séries de travail', value: summary.workingSetCount.toString() },
        { label: 'Séances', value: summary.sessionCount.toString() },
      ];
    case 'distance':
      return [
        { label: 'Meilleure distance', value: `${formatStrengthNumber(summary.bestDistanceMeters)} m` },
        { label: 'Distance totale', value: `${formatStrengthNumber(summary.totalDistanceMeters)} m` },
        { label: 'Séries de travail', value: summary.workingSetCount.toString() },
        { label: 'Séances', value: summary.sessionCount.toString() },
      ];
  }
}

function comparisonsForMode(
  comparison: StrengthExerciseComparison,
  mode: StrengthTrackingMode,
): ComparisonMetric[] {
  switch (mode) {
    case 'loadRepetitions':
      return [
        { label: 'Volume', value: comparison.volumeDeltaKg, suffix: ' kg' },
        { label: 'Charge max.', value: comparison.bestLoadDeltaKg, suffix: ' kg' },
        { label: 'Répétitions', value: comparison.repetitionsDelta },
        { label: 'Charge moyenne', value: comparison.averageLoadDeltaKg, suffix: ' kg' },
      ];
    case 'bodyweightRepetitions':
      return [
        { label: 'Répétitions', value: comparison.repetitionsDelta },
        { label: 'Lest maximal', value: comparison.additionalLoadDeltaKg, suffix: ' kg' },
        { label: 'Volume additionnel', value: comparison.latest.totalAdditionalVolumeKg - comparison.previous.totalAdditionalVolumeKg, suffix: ' kg' },
        { label: 'Charge totale max.', value: comparison.bestLoadDeltaKg, suffix: ' kg' },
      ];
    case 'assistedRepetitions':
      return [
        { label: 'Répétitions', value: comparison.repetitionsDelta },
        { label: 'Assistance minimale', value: comparison.assistanceDeltaKg, suffix: ' kg', positiveIsBetter: false },
        { label: 'Charge effective max.', value: comparison.bestLoadDeltaKg, suffix: ' kg' },
        { label: 'Volume effectif', value: comparison.volumeDeltaKg, suffix: ' kg' },
      ];
    case 'repetitions':
      return [
        { label: 'Répétitions totales', value: comparison.repetitionsDelta },
        { label: 'Meilleure série', value: comparison.latest.bestRepetitions - comparison.previous.bestRepetitions },
        { label: 'Séries de travail', value: comparison.latest.workingSetCount - comparison.previous.workingSetCount },
      ];
    case 'duration':
      return [
        {
          label: 'Durée totale',
          value: comparison.durationDeltaSeconds,
          formatter: (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatStrengthDuration(Math.abs(value))}`,
        },
        {
          label: 'Meilleure série',
          value: comparison.latest.bestDurationSeconds - comparison.previous.bestDurationSeconds,
          formatter: (value) => `${value > 0 ? '+' : value < 0 ? '−' : ''}${formatStrengthDuration(Math.abs(value))}`,
        },
        { label: 'Séries de travail', value: comparison.latest.workingSetCount - comparison.previous.workingSetCount },
      ];
    case 'distance':
      return [
        { label: 'Distance totale', value: comparison.distanceDeltaMeters, suffix: ' m' },
        { label: 'Meilleure série', value: comparison.latest.bestDistanceMeters - comparison.previous.bestDistanceMeters, suffix: ' m' },
        { label: 'Séries de travail', value: comparison.latest.workingSetCount - comparison.previous.workingSetCount },
      ];
  }
}

function chartDescription(mode: StrengthTrackingMode): string {
  switch (mode) {
    case 'loadRepetitions':
      return 'Charge maximale, moyenne, estimation du 1RM et volume.';
    case 'bodyweightRepetitions':
      return 'Répétitions, lest additionnel et charge totale lorsque le poids est connu.';
    case 'assistedRepetitions':
      return 'Répétitions et niveau d’assistance. Une courbe qui descend indique une progression.';
    case 'repetitions':
      return 'Répétitions totales et meilleure série par séance.';
    case 'duration':
      return 'Durée totale et meilleure série par séance.';
    case 'distance':
      return 'Distance totale et meilleure série par séance.';
  }
}

function recordLoadLabel(mode: StrengthTrackingMode, weightKg: number): string {
  if (mode === 'bodyweightRepetitions') {
    return weightKg > 0 ? `Poids du corps + ${formatStrengthNumber(weightKg)} kg` : 'Poids du corps';
  }
  if (mode === 'assistedRepetitions') return `Assistance ${formatStrengthNumber(weightKg)} kg`;
  return `${formatStrengthNumber(weightKg)} kg`;
}

export function StrengthExerciseAnalyticsPanel({ analytics, embedded = false }: StrengthExerciseAnalyticsPanelProps) {
  const { summary, sessions, comparison, loadRepetitionRecords, trackingMode } = analytics;

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
    volumeAdditionnel: session.totalAdditionalVolumeKg,
    repetitions: session.totalRepetitions,
    meilleureSerie: session.bestRepetitions,
    lest: session.maximumAdditionalLoadKg,
    assistance: session.minimumAssistanceKg,
    duree: session.totalDurationSeconds,
    meilleureDuree: session.bestDurationSeconds,
    distance: session.totalDistanceMeters,
    meilleureDistance: session.bestDistanceMeters,
  }));
  const metrics = metricsForMode(analytics);
  const comparisonMetrics = comparison ? comparisonsForMode(comparison, trackingMode) : [];

  return (
    <div className={cn('space-y-4', !embedded && 'mt-8')}>
      {!embedded ? (
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Analyse de progression</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Records et tendances</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">Calculs adaptés au suivi « {trackingModeTitle(trackingMode)} » et basés uniquement sur les séries de travail validées.</p>
        </div>
      ) : null}

      {(trackingMode === 'bodyweightRepetitions' || trackingMode === 'assistedRepetitions') ? (
        <InlineNotice tone="info" title="Règle de charge totale">
          La charge totale est estimée avec le dernier poids enregistré à la date de la séance, ou le poids initial du profil. Elle sert de repère comparatif et ne représente pas exactement la part du corps déplacée pour chaque mouvement.
        </InlineNotice>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {metrics.map(({ label, value }) => (
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
            {comparisonMetrics.map((metric) => (
              <div key={metric.label} className="rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{metric.label}</p>
                <p className={`mt-1 font-bold ${comparisonTone(metric.value, metric.positiveIsBetter)}`}>
                  {metric.formatter ? metric.formatter(metric.value) : formatSigned(metric.value, metric.suffix)}
                </p>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <InlineNotice tone="info" title="Comparaison bientôt disponible">Une deuxième séance de travail est nécessaire pour mesurer l’évolution.</InlineNotice>
      )}

      <details className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <summary className="cursor-pointer list-none px-4 py-4 font-semibold text-slate-950 dark:text-white [&::-webkit-details-marker]:hidden">Graphique de progression</summary>
        <div className="border-t border-slate-200 p-3 dark:border-slate-800 sm:p-4">
          <ChartCard title="Évolution par séance" description={chartDescription(trackingMode)}>
            <div className="h-64" aria-label="Graphique de progression de l’exercice">
              <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 256 }}>
                <ComposedChart data={chartData} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trackingMode === 'loadRepetitions' ? (
                    <>
                      <Bar dataKey="volume" name="Volume" fill="#0f766e" radius={[5, 5, 0, 0]} />
                      <Line type="monotone" dataKey="chargeMaximale" name="Charge max." stroke="#2563eb" strokeWidth={3} connectNulls />
                      <Line type="monotone" dataKey="estimationUnRm" name="1RM" stroke="#7c3aed" strokeDasharray="6 4" strokeWidth={2} connectNulls />
                    </>
                  ) : null}
                  {trackingMode === 'bodyweightRepetitions' ? (
                    <>
                      <Bar dataKey="repetitions" name="Répétitions" fill="#0f766e" radius={[5, 5, 0, 0]} />
                      <Line type="monotone" dataKey="lest" name="Lest ajouté" stroke="#2563eb" strokeWidth={3} connectNulls />
                      {summary.hasEffectiveLoadData ? <Line type="monotone" dataKey="chargeMaximale" name="Charge totale max." stroke="#7c3aed" strokeDasharray="6 4" strokeWidth={2} connectNulls /> : null}
                    </>
                  ) : null}
                  {trackingMode === 'assistedRepetitions' ? (
                    <>
                      <Bar dataKey="repetitions" name="Répétitions" fill="#0f766e" radius={[5, 5, 0, 0]} />
                      <Line type="monotone" dataKey="assistance" name="Assistance min." stroke="#d97706" strokeWidth={3} connectNulls />
                    </>
                  ) : null}
                  {trackingMode === 'repetitions' ? (
                    <>
                      <Bar dataKey="repetitions" name="Répétitions totales" fill="#0f766e" radius={[5, 5, 0, 0]} />
                      <Line type="monotone" dataKey="meilleureSerie" name="Meilleure série" stroke="#2563eb" strokeWidth={3} connectNulls />
                    </>
                  ) : null}
                  {trackingMode === 'duration' ? (
                    <>
                      <Bar dataKey="duree" name="Durée totale (s)" fill="#0f766e" radius={[5, 5, 0, 0]} />
                      <Line type="monotone" dataKey="meilleureDuree" name="Meilleure série (s)" stroke="#2563eb" strokeWidth={3} connectNulls />
                    </>
                  ) : null}
                  {trackingMode === 'distance' ? (
                    <>
                      <Bar dataKey="distance" name="Distance totale (m)" fill="#0f766e" radius={[5, 5, 0, 0]} />
                      <Line type="monotone" dataKey="meilleureDistance" name="Meilleure série (m)" stroke="#2563eb" strokeWidth={3} connectNulls />
                    </>
                  ) : null}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      </details>

      {loadRepetitionRecords.length > 0 ? (
        <details className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <summary className="cursor-pointer list-none px-4 py-4 font-semibold text-slate-950 dark:text-white [&::-webkit-details-marker]:hidden">
            {trackingMode === 'assistedRepetitions' ? 'Records par niveau d’assistance' : trackingMode === 'bodyweightRepetitions' ? 'Records par niveau de lest' : 'Records de répétitions par charge'}
          </summary>
          <div className="space-y-2 border-t border-slate-200 p-3 dark:border-slate-800 sm:p-4">
            {loadRepetitionRecords.map((record) => (
              <div key={record.weightKg} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/70">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">{recordLoadLabel(trackingMode, record.weightKg)}</p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {formatLocalDate(record.date)}
                    {record.effectiveLoadKg !== undefined && trackingMode !== 'loadRepetitions'
                      ? ` · charge effective ${formatStrengthNumber(record.effectiveLoadKg)} kg`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-brand-700 dark:text-brand-300">{record.repetitions} répétition{record.repetitions > 1 ? 's' : ''}</p>
                  <Link to={workoutSessionPath(record.sessionId)} className="mt-1 inline-flex text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300">Voir la séance</Link>
                </div>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
