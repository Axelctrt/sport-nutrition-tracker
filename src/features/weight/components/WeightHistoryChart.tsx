import { addDays, parseISO } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
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
import { Button } from '@/shared/ui/Button';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

interface WeightHistoryChartProps {
  entries: readonly WeightEntry[];
  profile: UserProfile;
}

type ChartRange = 30 | 90 | 'all';

const rangeOptions: readonly { value: ChartRange; label: string }[] = [
  { value: 30, label: '30 j' },
  { value: 90, label: '90 j' },
  { value: 'all', label: 'Tout' },
];

export function WeightHistoryChart({ entries, profile }: WeightHistoryChartProps) {
  const [range, setRange] = useState<ChartRange>(30);
  const data = useMemo(() => {
    const points = calculateWeightMovingAverage(entries, profile);
    const latestDate = points.at(-1)?.date;
    const filtered = range === 'all' || !latestDate
      ? points
      : points.filter((point) => (
          point.date >= toLocalDate(addDays(parseISO(latestDate), -(range - 1)))
        ));

    return filtered.map((point) => ({
      date: formatLocalDate(point.date, 'd MMM'),
      poids: point.weightKg,
      moyenne: point.movingAverageKg,
      cible: point.targetWeightKg,
    }));
  }, [entries, profile, range]);

  if (data.length === 0) return null;

  return (
    <div className="border-b border-slate-200 p-4 dark:border-slate-800 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-slate-950 dark:text-white">Évolution du poids</h3>
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
            Pesées, moyenne mobile sur sept jours et trajectoire du profil.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800" aria-label="Période du graphique">
          {rangeOptions.map((option) => (
            <Button
              key={String(option.value)}
              size="sm"
              variant={range === option.value ? 'primary' : 'ghost'}
              className="min-h-9 px-2"
              aria-pressed={range === option.value}
              onClick={() => setRange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-300" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-blue-600" /> Pesée</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-violet-600" /> Moyenne 7 j</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-slate-600" /> Trajectoire</span>
      </div>

      <div className="mt-3 h-64 min-w-0 sm:h-72" aria-label="Graphique de l’évolution du poids">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" fontSize={11} minTickGap={24} />
            <YAxis domain={['auto', 'auto']} fontSize={11} width={48} />
            <Tooltip
              formatter={(value, name) => [`${Number(value).toLocaleString('fr-FR')} kg`, String(name)]}
            />
            <Line type="monotone" dataKey="poids" name="Pesée" stroke="#2563eb" strokeWidth={1.5} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="moyenne" name="Moyenne 7 jours" stroke="#7c3aed" strokeWidth={3} connectNulls dot={false} />
            <Line type="monotone" dataKey="cible" name="Trajectoire" stroke="#475569" strokeDasharray="6 4" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
