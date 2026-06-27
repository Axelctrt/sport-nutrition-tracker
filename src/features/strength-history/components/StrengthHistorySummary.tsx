import { BarChart3, Clock3, Dumbbell, Hash, History, Route } from 'lucide-react';
import type { StrengthExerciseAnalytics } from '@/application/strength/strengthAnalyticsService';
import {
  formatStrengthDuration,
  formatStrengthNumber,
} from '@/features/strength-history/utils/strengthPerformanceFormatting';
import { Card } from '@/shared/ui/Card';

interface StrengthHistorySummaryProps {
  sessionCount: number;
  analytics: StrengthExerciseAnalytics;
}

export function StrengthHistorySummary({ sessionCount, analytics }: StrengthHistorySummaryProps) {
  const common = [
    { icon: History, label: 'Séances', value: sessionCount.toString() },
    { icon: Dumbbell, label: 'Séries travail', value: analytics.summary.workingSetCount.toString() },
  ];
  const specific = (() => {
    switch (analytics.trackingMode) {
      case 'loadRepetitions':
        return [
          { icon: Hash, label: 'Répétitions', value: analytics.summary.totalRepetitions.toString() },
          { icon: BarChart3, label: 'Volume', value: `${formatStrengthNumber(analytics.summary.totalVolumeKg)} kg` },
        ];
      case 'bodyweightRepetitions':
      case 'assistedRepetitions':
      case 'repetitions':
        return [
          { icon: Hash, label: 'Répétitions', value: analytics.summary.totalRepetitions.toString() },
          { icon: BarChart3, label: 'Meilleure série', value: `${analytics.summary.bestRepetitions} rép.` },
        ];
      case 'duration':
        return [
          { icon: Clock3, label: 'Durée totale', value: formatStrengthDuration(analytics.summary.totalDurationSeconds) },
          { icon: BarChart3, label: 'Meilleure série', value: formatStrengthDuration(analytics.summary.bestDurationSeconds) },
        ];
      case 'distance':
        return [
          { icon: Route, label: 'Distance totale', value: `${formatStrengthNumber(analytics.summary.totalDistanceMeters)} m` },
          { icon: BarChart3, label: 'Meilleure série', value: `${formatStrengthNumber(analytics.summary.bestDistanceMeters)} m` },
        ];
    }
  })();
  const metrics = [...common, ...specific];

  return (
    <Card className="mt-5 p-4 sm:p-5" aria-label="Résumé de l’historique de l’exercice">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">Progression enregistrée</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Les échauffements restent visibles mais sont exclus des statistiques principales.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {metrics.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70" aria-label={`${label} : ${value}`}>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Icon aria-hidden="true" className="size-4" />
              <span>{label}</span>
            </div>
            <p className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
