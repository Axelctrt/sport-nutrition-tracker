import { CalendarCheck, CircleStop, Clock3, TrendingUp } from 'lucide-react';
import type { WorkoutSessionSummaryWithProgression } from '@/features/strength-sessions/hooks/useWorkoutSessions';
import { Card } from '@/shared/ui/Card';

interface MetricProps {
  icon: typeof CalendarCheck;
  label: string;
  value: string | number;
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70" aria-label={`${label} : ${value}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon aria-hidden="true" className="size-4" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export function WorkoutSessionsSummary({ sessions }: { sessions: WorkoutSessionSummaryWithProgression[] }) {
  const completed = sessions.filter(({ session }) => session.status === 'completed');
  const abandoned = sessions.filter(({ session }) => session.status === 'abandoned').length;
  const totalMinutes = completed.reduce((total, { session }) => total + (session.durationMinutes ?? 0), 0);
  const pending = sessions.reduce((total, session) => total + session.pendingProgressionCount, 0);

  return (
    <Card className="mt-5 p-4 sm:p-5" aria-label="Résumé des entraînements">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">Historique de musculation</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Vue synthétique des séances enregistrées sur cet appareil.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
          {sessions.length} séance{sessions.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric icon={CalendarCheck} label="Terminées" value={completed.length} />
        <Metric icon={Clock3} label="Minutes" value={totalMinutes} />
        <Metric icon={TrendingUp} label="Progressions" value={pending} />
        <Metric icon={CircleStop} label="Abandonnées" value={abandoned} />
      </div>
    </Card>
  );
}
