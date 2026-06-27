import {
  Activity,
  Bike,
  CheckCircle2,
  Dumbbell,
  Salad,
  Scale,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  observeWeeklyMissions,
  type WeeklyMissionErrorListener,
  type WeeklyMissionId,
  type WeeklyMissionListener,
  type WeeklyMissionSnapshot,
} from "@/application/rewards/weeklyMissionService";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

type WeeklyMissionObserver = (
  onSnapshot: WeeklyMissionListener,
  onError?: WeeklyMissionErrorListener,
) => () => void;

interface DashboardWeeklyMissionsProps {
  className?: string;
  observeSnapshot?: WeeklyMissionObserver;
}

const missionIcons: Record<WeeklyMissionId, LucideIcon> = {
  activeDays: Activity,
  enduranceActivities: Bike,
  strengthSessions: Dumbbell,
  nutritionDays: Salad,
  weighInDays: Scale,
};

function formatWeekDate(value: string): string {
  const [yearText, monthText, dayText] = value.split("-");
  if (!yearText || !monthText || !dayText) return value;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(
    new Date(
      Number(yearText),
      Number(monthText) - 1,
      Number(dayText),
    ),
  );
}

export function DashboardWeeklyMissions({
  className,
  observeSnapshot = observeWeeklyMissions,
}: DashboardWeeklyMissionsProps) {
  const [snapshot, setSnapshot] =
    useState<WeeklyMissionSnapshot>();
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
              : "Les missions hebdomadaires n’ont pas pu être calculées.",
          );
        },
      ),
    [observeSnapshot],
  );

  return (
    <section
      aria-labelledby="dashboard-weekly-missions-title"
      className={className}
    >
      <Card className="h-full overflow-hidden p-0">
        <div className="h-full bg-gradient-to-br from-emerald-50 via-white to-cyan-50 p-4 sm:p-5 dark:from-emerald-950/35 dark:via-slate-900 dark:to-cyan-950/35">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                <Target aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2
                  id="dashboard-weekly-missions-title"
                  className="font-semibold text-slate-950 dark:text-white"
                >
                  Missions de la semaine
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  Des objectifs simples renouvelés automatiquement chaque lundi.
                </p>
              </div>
            </div>

            {snapshot ? (
              <span
                aria-label={`Missions terminées : ${snapshot.completedCount} sur ${snapshot.totalCount}`}
                className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/80 px-3 text-sm font-semibold text-emerald-800 shadow-sm dark:bg-slate-900/80 dark:text-emerald-200"
              >
                <CheckCircle2 aria-hidden="true" className="size-4" />
                {snapshot.completedCount}/{snapshot.totalCount}
              </span>
            ) : null}
          </div>

          {loadError ? (
            <InlineNotice
              className="mt-4"
              tone="error"
              title="Missions indisponibles"
              role="alert"
            >
              {loadError}
            </InlineNotice>
          ) : null}

          {!snapshot && !loadError ? (
            <p
              aria-live="polite"
              className="mt-4 text-sm text-slate-500 dark:text-slate-400"
            >
              Calcul de tes missions…
            </p>
          ) : null}

          {snapshot ? (
            <>
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>
                    Du {formatWeekDate(snapshot.weekStart)} au{" "}
                    {formatWeekDate(snapshot.weekEnd)}
                  </span>
                  <span>{snapshot.completionPercentage}%</span>
                </div>
                <div
                  className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                  role="progressbar"
                  aria-label="Missions hebdomadaires terminées"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={snapshot.completionPercentage}
                >
                  <div
                    className="h-full rounded-full bg-emerald-600 transition-[width] dark:bg-emerald-400"
                    style={{
                      width: `${snapshot.completionPercentage}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {snapshot.missions.map((mission) => {
                  const Icon = missionIcons[mission.id];

                  return (
                    <div
                      key={mission.id}
                      className="rounded-xl border border-slate-200/90 bg-white/75 p-3 dark:border-slate-800 dark:bg-slate-900/70"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={
                            mission.completed
                              ? "grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
                              : "grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                          }
                        >
                          {mission.completed ? (
                            <CheckCircle2
                              aria-hidden="true"
                              className="size-4"
                            />
                          ) : (
                            <Icon
                              aria-hidden="true"
                              className="size-4"
                            />
                          )}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-semibold text-slate-950 dark:text-white">
                              {mission.title}
                            </p>
                            <span className="shrink-0 text-xs font-semibold text-slate-600 dark:text-slate-300">
                              {mission.current}/{mission.target}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            {mission.description}
                          </p>
                          <div
                            className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                            role="progressbar"
                            aria-label={`Progression ${mission.title}`}
                            aria-valuemin={0}
                            aria-valuemax={mission.target}
                            aria-valuenow={Math.min(
                              mission.current,
                              mission.target,
                            )}
                          >
                            <div
                              className="h-full rounded-full bg-brand-700 transition-[width] dark:bg-brand-500"
                              style={{
                                width: `${mission.percentage}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {snapshot.completedCount === snapshot.totalCount ? (
                <InlineNotice
                  className="mt-4"
                  tone="success"
                  title="Semaine accomplie"
                  role="status"
                >
                  Les cinq missions sont terminées. La prochaine série arrivera
                  lundi.
                </InlineNotice>
              ) : null}
            </>
          ) : null}
        </div>
      </Card>
    </section>
  );
}
