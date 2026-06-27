import {
  CalendarCheck,
  Flame,
  History,
  Trophy,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  observeConsistencyStreak,
  type ConsistencyStreakErrorListener,
  type ConsistencyStreakListener,
  type ConsistencyStreakSnapshot,
} from "@/application/rewards/consistencyStreakService";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

type ConsistencyStreakObserver = (
  onSnapshot: ConsistencyStreakListener,
  onError?: ConsistencyStreakErrorListener,
) => () => void;

interface ConsistencyStreakPanelProps {
  className?: string;
  observeSnapshot?: ConsistencyStreakObserver;
}

function formatDate(value: string): string {
  const [yearText, monthText, dayText] = value.split("-");

  if (!yearText || !monthText || !dayText) {
    return value;
  }

  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/50">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
        <Icon aria-hidden="true" className="size-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
        {detail}
      </p>
    </div>
  );
}

export function ConsistencyStreakPanel({
  className,
  observeSnapshot = observeConsistencyStreak,
}: ConsistencyStreakPanelProps) {
  const [snapshot, setSnapshot] =
    useState<ConsistencyStreakSnapshot>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(
    () =>
      observeSnapshot(
        (nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setLoadError(undefined);
        },
        (error) => {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Les séries de régularité n’ont pas pu être calculées.",
          );
        },
      ),
    [observeSnapshot],
  );

  return (
    <Card className={className}>
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200">
            <Flame aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-950 dark:text-white">
              Séries de régularité
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Une journée compte dès qu’elle contient une activité, une séance
              terminée ou une pesée.
            </p>
          </div>
        </div>

        {loadError ? (
          <InlineNotice
            className="mt-4"
            role="alert"
            title="Calcul impossible"
            tone="error"
          >
            {loadError}
          </InlineNotice>
        ) : null}

        {!snapshot && !loadError ? (
          <p
            aria-live="polite"
            className="mt-4 text-sm text-slate-500 dark:text-slate-400"
          >
            Calcul de ta régularité…
          </p>
        ) : null}

        {snapshot ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard
                icon={Flame}
                label="Série actuelle"
                value={`${snapshot.currentStreak} j`}
                detail={
                  snapshot.currentStreak > 0
                    ? "Continue aujourd’hui pour prolonger la série."
                    : "Enregistre une donnée aujourd’hui pour repartir."
                }
              />
              <MetricCard
                icon={Trophy}
                label="Meilleur record"
                value={`${snapshot.bestStreak} j`}
                detail="Plus longue suite de journées actives."
              />
              <MetricCard
                icon={CalendarCheck}
                label="7 derniers jours"
                value={`${snapshot.activeDaysLast7}/7`}
                detail="Journées actives sur la semaine glissante."
              />
              <MetricCard
                icon={History}
                label="30 derniers jours"
                value={`${snapshot.activeDaysLast30}/30`}
                detail="Journées actives sur le mois glissant."
              />
            </div>

            <div className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-950 dark:bg-brand-950/50 dark:text-brand-100">
              {snapshot.latestActiveDate
                ? `Dernière journée active : ${formatDate(snapshot.latestActiveDate)}.`
                : "Aucune journée active n’est encore enregistrée."}
            </div>
          </>
        ) : null}
      </div>
    </Card>
  );
}
