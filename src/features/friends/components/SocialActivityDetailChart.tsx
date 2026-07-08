import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { SocialActivityChartPresentation } from '@/features/friends/components/socialActivityFeedPresentation';
import {
  formatSocialActivityChartValue,
  formatSocialActivityElapsedTime,
} from '@/features/friends/components/socialActivityFeedPresentation';

interface SocialActivityDetailChartProps {
  readonly chart: SocialActivityChartPresentation;
}

export function SocialActivityDetailChart({ chart }: SocialActivityDetailChartProps) {
  const data = chart.points.map((point) => ({
    elapsedSeconds: point.elapsedSeconds,
    elapsedLabel: formatSocialActivityElapsedTime(point.elapsedSeconds),
    value: point.value,
  }));

  return (
    <section className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
      <h4 className="font-bold text-slate-950 dark:text-white">{chart.title}</h4>
      <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
        {chart.description}
      </p>
      <div
        className="mt-3 h-56 min-w-0 sm:h-64"
        aria-label={`${chart.title}, ${data.length} points`}
        style={{ touchAction: 'pan-y' }}
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 320, height: 224 }}
        >
          <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="elapsedSeconds"
              fontSize={10}
              minTickGap={28}
              tickFormatter={(value) => formatSocialActivityElapsedTime(Number(value))}
            />
            <YAxis
              domain={['auto', 'auto']}
              fontSize={10}
              reversed={chart.reverseYAxis}
              tickFormatter={(value) => formatSocialActivityChartValue(chart.metric, Number(value))}
              width={62}
            />
            <Tooltip
              formatter={(value) => [
                formatSocialActivityChartValue(chart.metric, Number(value)),
                chart.title,
              ]}
              labelFormatter={(value) => `Temps écoulé : ${formatSocialActivityElapsedTime(Number(value))}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={chart.title}
              stroke="#2563eb"
              strokeWidth={3}
              dot={data.length <= 20 ? { r: 2.5 } : false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <ol className="sr-only" aria-label="Valeurs du graphique">
        {data.map((point, index) => (
          <li key={`${point.elapsedSeconds}-${index}`}>
            {point.elapsedLabel} : {formatSocialActivityChartValue(chart.metric, point.value)}
          </li>
        ))}
      </ol>
    </section>
  );
}
