import { Activity, CheckCircle2, Footprints, Scale } from 'lucide-react';
import type { HistoryDaySummary } from '@/domain/models/analytics';
import { Card } from '@/shared/ui/Card';

interface HistorySummaryProps {
  days: readonly HistoryDaySummary[];
  dailyStepGoal: number;
}

function average(values: readonly number[]): number | undefined {
  if (values.length === 0) return undefined;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function HistorySummary({ days, dailyStepGoal }: HistorySummaryProps) {
  const activeDays = days.filter((day) => day.activityCount > 0).length;
  const stepValues = days.flatMap((day) => day.totalSteps === undefined ? [] : [day.totalSteps]);
  const averageSteps = average(stepValues);
  const stepGoalDays = stepValues.filter((steps) => steps >= dailyStepGoal).length;
  const weighInDays = days.filter((day) => day.weightKg !== undefined).length;
  const completedDays = days.filter((day) => day.journalComplete).length;
  const trackedFoodDays = days.filter((day) => day.consumedCaloriesKcal !== undefined).length;

  const metrics = [
    {
      label: 'Sport',
      value: activeDays.toLocaleString('fr-FR'),
      detail: 'jours actifs',
      icon: Activity,
    },
    {
      label: 'Pas moyens',
      value: averageSteps?.toLocaleString('fr-FR') ?? '—',
      detail: `${stepGoalDays} objectif${stepGoalDays > 1 ? 's' : ''} atteint${stepGoalDays > 1 ? 's' : ''}`,
      icon: Footprints,
    },
    {
      label: 'Pesées',
      value: weighInDays.toLocaleString('fr-FR'),
      detail: 'jours renseignés',
      icon: Scale,
    },
    {
      label: 'Journaux terminés',
      value: completedDays.toLocaleString('fr-FR'),
      detail: `${trackedFoodDays} jour(s) alimentaire(s)`,
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="mt-4 overflow-hidden">
      <div className="grid grid-cols-2 gap-px bg-slate-200 dark:bg-slate-800 sm:grid-cols-4">
        {metrics.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="min-w-0 bg-white p-3 dark:bg-slate-900 sm:p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{label}</span>
            </div>
            <p className="mt-2 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
            <p className="mt-0.5 text-xs leading-4 text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
