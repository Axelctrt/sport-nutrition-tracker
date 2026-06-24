import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { calculateWeightMovingAverage } from '@/domain/aggregations/analytics';
import type { UserProfile } from '@/domain/models/profile';
import type { WeightEntry } from '@/domain/models/weight';
import { formatLocalDate } from '@/shared/utils/dates';

interface WeightHistoryChartProps {
  entries: readonly WeightEntry[];
  profile: UserProfile;
}

export function WeightHistoryChart({ entries, profile }: WeightHistoryChartProps) {
  const data = calculateWeightMovingAverage(entries, profile).map((point) => ({
    date: formatLocalDate(point.date, 'd MMM'),
    poids: point.weightKg,
    moyenne: point.movingAverageKg,
    cible: point.targetWeightKg,
  }));

  if (data.length === 0) return null;

  return (
    <div className="border-b border-slate-200 p-5 dark:border-slate-800">
      <h3 className="font-semibold text-slate-950 dark:text-white">Évolution et moyenne mobile</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        Moyenne mobile sur les sept derniers jours calendaires comportant des pesées, comparée à la trajectoire cible.
      </p>
      <div className="mt-4 h-72" aria-label="Graphique de l’évolution du poids">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis domain={['auto', 'auto']} fontSize={12} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="poids" name="Pesée (kg)" stroke="#2563eb" strokeWidth={1.5} dot />
            <Line type="monotone" dataKey="moyenne" name="Moyenne 7 jours (kg)" stroke="#7c3aed" strokeWidth={3} connectNulls />
            <Line type="monotone" dataKey="cible" name="Trajectoire cible (kg)" stroke="#475569" strokeDasharray="6 4" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
