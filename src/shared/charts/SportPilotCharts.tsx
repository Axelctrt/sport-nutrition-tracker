import { ArrowRight, ChartNoAxesCombined } from "lucide-react";
import {
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { Link } from "react-router-dom";
import { ResponsiveContainer } from "recharts";

import { useMotionVisibility } from "@/shared/motion/useMotionVisibility";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { Card } from "@/shared/ui/Card";
import { cn } from "@/shared/utils/cn";

export interface SportPilotChartRow {
  label: string;
  values: readonly {
    label: string;
    value: string;
  }[];
}

interface SportPilotChartCardProps {
  title: string;
  description: string;
  metric?: string | undefined;
  metricLabel?: string | undefined;
  action?: {
    label: string;
    to: string;
  };
  children: ReactNode;
  className?: string | undefined;
}

export function SportPilotChartCard({
  title,
  description,
  metric,
  metricLabel,
  action,
  children,
  className,
}: SportPilotChartCardProps) {
  return (
    <Card
      padding="md"
      className={cn("min-w-0 border-[var(--sp-border-subtle)]", className)}
    >
      <section aria-labelledby={`chart-${title.toLowerCase().replaceAll(" ", "-")}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id={`chart-${title.toLowerCase().replaceAll(" ", "-")}`}
              className="text-base font-bold text-[var(--sp-text-primary)]"
            >
              {title}
            </h2>
            <p className="mt-1 text-sm leading-5 text-[var(--sp-text-secondary)]">
              {description}
            </p>
          </div>
          {metric ? (
            <div className="shrink-0 text-right">
              <strong className="block text-lg text-[var(--sp-text-primary)]">
                {metric}
              </strong>
              {metricLabel ? (
                <span className="text-xs text-[var(--sp-text-muted)]">
                  {metricLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="mt-4">{children}</div>
        {action ? (
          <Link
            to={action.to}
            className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sp-accent-primary)]"
          >
            {action.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        ) : null}
      </section>
    </Card>
  );
}

interface ChartElementProps {
  data?: readonly unknown[];
}

interface SportPilotChartContainerProps {
  label: string;
  children: ReactElement<ChartElementProps>;
  height?: "compact" | "standard" | "large";
  className?: string;
}

const heightClasses = {
  compact: "h-36",
  standard: "h-60 sm:h-72",
  large: "h-72 sm:h-80",
} as const;

export function SportPilotChartContainer({
  label,
  children,
  height = "standard",
  className,
}: SportPilotChartContainerProps) {
  const reducedMotion = useReducedMotion();
  const { ref, visible } = useMotionVisibility<HTMLDivElement>();
  const pointCount = Array.isArray(children.props.data)
    ? children.props.data.length
    : undefined;
  const resolvedHeight = height === "standard" && pointCount !== undefined && pointCount <= 2
    ? "compact"
    : height;
  const density = pointCount === undefined
    ? "unknown"
    : pointCount <= 1
      ? "single"
      : pointCount <= 3
        ? "sparse"
        : "normal";

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      data-chart-motion={reducedMotion || !visible ? "paused" : "active"}
      data-chart-density={density}
      className={cn(
        "min-w-0 touch-pan-y overflow-hidden rounded-lg border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-elevated)] p-2 transition-[height] duration-300 ease-out motion-reduce:transition-none",
        heightClasses[resolvedHeight],
        className,
      )}
    >
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipEntry {
  name?: string;
  value?: number | string;
  color?: string;
  unit?: string;
}

interface SportPilotChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: readonly TooltipEntry[];
  valueFormatter?: (value: number | string, entry: TooltipEntry) => string;
}

export function SportPilotChartTooltip({
  active,
  label,
  payload,
  valueFormatter = (value, entry) => `${value}${entry.unit ?? ""}`,
}: SportPilotChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="max-w-56 rounded-lg border border-[var(--sp-border-strong)] bg-[var(--sp-surface-elevated)] p-3 text-xs text-[var(--sp-text-primary)] shadow-[var(--sp-shadow-panel)]">
      {label ? <p className="font-bold">{label}</p> : null}
      <dl className="mt-1 space-y-1">
        {payload.map((entry, index) => (
          <div key={`${entry.name ?? "value"}-${index}`} className="flex justify-between gap-4">
            <dt className="text-[var(--sp-text-secondary)]">{entry.name}</dt>
            <dd className="font-semibold">
              {entry.value === undefined ? "—" : valueFormatter(entry.value, entry)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

interface SportPilotLegendProps {
  items: readonly {
    label: string;
    color: string;
    detail?: string;
  }[];
}

export function SportPilotLegend({ items }: SportPilotLegendProps) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Légende du graphique">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-2 text-xs text-[var(--sp-text-secondary)]">
          <i
            aria-hidden="true"
            className="size-2.5 rounded-sm"
            style={{ background: item.color }}
          />
          <span>{item.label}</span>
          {item.detail ? <span className="text-[var(--sp-text-muted)]">{item.detail}</span> : null}
        </li>
      ))}
    </ul>
  );
}

interface SportPilotEmptyChartProps {
  title: string;
  description: string;
  action: {
    label: string;
    to: string;
  };
}

export function SportPilotEmptyChart({
  title,
  description,
  action,
}: SportPilotEmptyChartProps) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-[var(--sp-border-strong)] bg-[var(--sp-surface-muted)] p-5 text-center">
      <div className="max-w-sm">
        <ChartNoAxesCombined
          aria-hidden="true"
          className="mx-auto size-7 text-[var(--sp-accent-primary)]"
        />
        <h3 className="mt-3 font-bold text-[var(--sp-text-primary)]">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
          {description}
        </p>
        <Link
          to={action.to}
          className="sp-button sp-button--secondary mt-4 inline-flex min-h-11 items-center rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
        >
          {action.label}
        </Link>
      </div>
    </div>
  );
}

export function SportPilotAccessibleSummary({
  caption,
  rows,
}: {
  caption: string;
  rows: readonly SportPilotChartRow[];
}) {
  const columns = rows[0]?.values.map(({ label }) => label) ?? [];
  if (rows.length === 0) return null;

  return (
    <details className="mt-3 rounded-lg border border-[var(--sp-border-subtle)]">
      <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-bold text-[var(--sp-text-primary)]">
        Voir les données du graphique
      </summary>
      <div className="overflow-x-auto border-t border-[var(--sp-border-subtle)]">
        <table className="w-full min-w-[26rem] text-left text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="text-[var(--sp-text-muted)]">
            <tr>
              <th className="px-3 py-2">Période</th>
              {columns.map((column) => (
                <th key={column} className="px-3 py-2">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-[var(--sp-border-subtle)]">
                <th className="px-3 py-2 font-semibold">{row.label}</th>
                {row.values.map((value) => (
                  <td key={value.label} className="px-3 py-2">{value.value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function SportPilotMiniChart({
  values,
  label,
}: {
  values: readonly number[];
  label: string;
}) {
  const maximum = Math.max(1, ...values);
  return (
    <div className="mt-3 flex h-12 items-end gap-1" role="img" aria-label={label}>
      {values.map((value, index) => (
        <i
          key={index}
          className="min-w-1 flex-1 rounded-sm bg-[var(--sp-chart-1)] opacity-85"
          style={{ height: `${Math.max(8, value / maximum * 100)}%` }}
        />
      ))}
    </div>
  );
}

export interface SportPilotHeatmapDay {
  date: string;
  label: string;
  score: number;
  detail: string;
}

export function SportPilotHeatmap({
  days,
  label,
}: {
  days: readonly SportPilotHeatmapDay[];
  label: string;
}) {
  const [selectedDate, setSelectedDate] = useState<string>();
  const selected = days.find(({ date }) => date === selectedDate);

  return (
    <div>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-2"
        role="grid"
        aria-label={label}
      >
        {days.map((day) => (
          <button
            key={day.date}
            type="button"
            role="gridcell"
            aria-label={`${day.label} : ${day.detail}`}
            aria-selected={selectedDate === day.date}
            className="size-6 shrink-0 rounded-[3px] border border-[var(--sp-border-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sp-focus-ring)]"
            style={{
              background: day.score === 0
                ? "var(--sp-surface-muted)"
                : `color-mix(in srgb, var(--sp-chart-3) ${30 + Math.min(3, day.score) * 20}%, var(--sp-surface-card))`,
            }}
            onClick={() => setSelectedDate(day.date)}
          />
        ))}
      </div>
      <p className="min-h-6 text-xs text-[var(--sp-text-secondary)]" aria-live="polite">
        {selected?.detail ?? "Sélectionne un jour pour afficher son détail."}
      </p>
    </div>
  );
}
