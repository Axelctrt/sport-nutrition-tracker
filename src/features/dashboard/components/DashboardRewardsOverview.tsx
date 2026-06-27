import { Award, ChevronRight, Medal, Target, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { liveQuery } from "dexie";

import {
  loadAchievementPreview,
  type AchievementSnapshot,
} from "@/application/rewards/achievementService";
import { routePaths } from "@/app/routePaths";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

export type AchievementSnapshotListener = (
  snapshot: AchievementSnapshot,
) => void;

export type AchievementSnapshotObserver = (
  onSnapshot: AchievementSnapshotListener,
  onError: (error: unknown) => void,
) => () => void;

interface DashboardRewardsOverviewProps {
  className?: string;
  observeSnapshot?: AchievementSnapshotObserver;
}

export function observeAchievementPreview(
  onSnapshot: AchievementSnapshotListener,
  onError: (error: unknown) => void,
): () => void {
  const subscription = liveQuery(() => loadAchievementPreview()).subscribe({
    next: onSnapshot,
    error: onError,
  });

  return () => subscription.unsubscribe();
}

function formatEarnedAt(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function DashboardRewardsOverview({
  className,
  observeSnapshot = observeAchievementPreview,
}: DashboardRewardsOverviewProps) {
  const [snapshot, setSnapshot] = useState<AchievementSnapshot>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    return observeSnapshot(
      (nextSnapshot) => {
        setSnapshot(nextSnapshot);
        setLoadError(undefined);
      },
      (error) => {
        setLoadError(
          error instanceof Error
            ? error.message
            : "La progression des récompenses n’a pas pu être chargée.",
        );
      },
    );
  }, [observeSnapshot]);

  const nextAchievement = snapshot?.achievements.find(
    (progress) => !progress.earned,
  );
  const latestAchievements = useMemo(
    () =>
      snapshot?.achievements
        .filter(
          (progress) => progress.earned && progress.earnedAt !== undefined,
        )
        .sort((left, right) =>
          (right.earnedAt ?? "").localeCompare(left.earnedAt ?? ""),
        )
        .slice(0, 2) ?? [],
    [snapshot],
  );

  return (
    <section aria-labelledby="dashboard-rewards-title" className={className}>
      <Card className="overflow-hidden p-0">
        <div className="bg-gradient-to-br from-amber-50 via-white to-brand-50 p-4 sm:p-5 dark:from-amber-950/35 dark:via-slate-900 dark:to-brand-950/35">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <Trophy aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <h2
                  id="dashboard-rewards-title"
                  className="font-semibold text-slate-950 dark:text-white"
                >
                  Tes accomplissements
                </h2>
                <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                  Garde ton prochain objectif visible sans quitter le tableau de
                  bord.
                </p>
              </div>
            </div>

            {snapshot ? (
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-white/80 px-3 text-sm font-semibold text-amber-800 shadow-sm dark:bg-slate-900/80 dark:text-amber-200">
                <Medal aria-hidden="true" className="size-4" />
                {snapshot.earnedCount}/{snapshot.totalCount}
              </span>
            ) : null}
          </div>

          {loadError ? (
            <InlineNotice
              className="mt-4"
              tone="error"
              title="Récompenses indisponibles"
              role="alert"
            >
              {loadError}
            </InlineNotice>
          ) : null}

          {!snapshot && !loadError ? (
            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
              Calcul de ta progression…
            </p>
          ) : null}

          {snapshot && nextAchievement ? (
            <div className="mt-4 rounded-2xl border border-amber-200/80 bg-white/75 p-4 dark:border-amber-900 dark:bg-slate-900/70">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <Target
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-950 dark:text-white">
                      Prochain badge : {nextAchievement.achievement.name}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {nextAchievement.achievement.requirementLabel}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {Math.min(nextAchievement.current, nextAchievement.target)}/
                  {nextAchievement.target}
                </span>
              </div>

              <div
                className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                role="progressbar"
                aria-label={`Progression ${nextAchievement.achievement.name}`}
                aria-valuemin={0}
                aria-valuemax={nextAchievement.target}
                aria-valuenow={Math.min(
                  nextAchievement.current,
                  nextAchievement.target,
                )}
              >
                <div
                  className="h-full rounded-full bg-brand-700 transition-[width] dark:bg-brand-500"
                  style={{ width: `${nextAchievement.percentage}%` }}
                />
              </div>

              <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                Encore {nextAchievement.remaining} à accomplir
              </p>
            </div>
          ) : null}

          {snapshot && snapshot.earnedCount === snapshot.totalCount ? (
            <InlineNotice
              className="mt-4"
              tone="success"
              title="Tous les badges sont gagnés"
              role="status"
            >
              Ton tableau actuel est complet. De nouveaux défis pourront être
              ajoutés lors de prochaines versions.
            </InlineNotice>
          ) : null}

          {latestAchievements.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Derniers badges
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {latestAchievements.map((progress) => (
                  <span
                    key={progress.achievement.id}
                    className="inline-flex min-h-8 items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-900 dark:border-amber-900 dark:bg-amber-950/45 dark:text-amber-100"
                  >
                    <Award aria-hidden="true" className="size-4" />
                    {progress.achievement.name}
                    {progress.earnedAt ? (
                      <span className="font-normal opacity-75">
                        {formatEarnedAt(progress.earnedAt)}
                      </span>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <Link
            to={routePaths.settings}
            className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl text-sm font-semibold text-brand-800 hover:text-brand-950 dark:text-brand-300 dark:hover:text-brand-100"
          >
            Voir tous les badges et thèmes
            <ChevronRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </Card>
    </section>
  );
}
