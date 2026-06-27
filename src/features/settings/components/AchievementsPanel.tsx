import { LockKeyhole, Medal, Target, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import {
  loadAchievementSnapshot,
  type AchievementSnapshot,
} from "@/application/rewards/achievementService";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

interface AchievementsPanelProps {
  className?: string;
  loadSnapshot?: () => Promise<AchievementSnapshot>;
}

function formatEarnedAt(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function AchievementsPanel({
  className,
  loadSnapshot = loadAchievementSnapshot,
}: AchievementsPanelProps) {
  const [snapshot, setSnapshot] = useState<AchievementSnapshot>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const nextSnapshot = await loadSnapshot();
        if (isMounted) setSnapshot(nextSnapshot);
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Les badges n’ont pas pu être calculés.",
          );
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [loadSnapshot]);

  const nextAchievement = snapshot?.achievements.find(
    (progress) => !progress.earned,
  );

  return (
    <section aria-labelledby="achievements-title" className={className}>
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Medal aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="achievements-title"
                  className="font-semibold text-slate-950 dark:text-white"
                >
                  Accomplissements
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Suis tes jalons sportifs et conserve les badges déjà gagnés,
                  même après le nettoyage de données de test.
                </p>
              </div>
              {snapshot ? (
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-amber-50 px-3 text-sm font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
                  <Trophy aria-hidden="true" className="size-4" />
                  {`${snapshot.earnedCount}/${snapshot.totalCount} badges gagnés`}
                </span>
              ) : null}
            </div>

            {loadError ? (
              <InlineNotice
                className="mt-4"
                tone="error"
                title="Accomplissements indisponibles"
                role="alert"
              >
                {loadError}
              </InlineNotice>
            ) : null}

            {!snapshot && !loadError ? (
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                Analyse de tes progrès…
              </p>
            ) : null}

            {snapshot && nextAchievement ? (
              <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                <Target
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
                />
                <div>
                  <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                    Prochain objectif : {nextAchievement.achievement.name}
                  </p>
                  <p className="mt-1 text-sm text-amber-900/80 dark:text-amber-100/80">
                    {nextAchievement.remaining} restant
                    {nextAchievement.remaining > 1 ? "s" : ""} — {" "}
                    {nextAchievement.achievement.requirementLabel}
                  </p>
                </div>
              </div>
            ) : null}

            {snapshot && snapshot.earnedCount === snapshot.totalCount ? (
              <InlineNotice
                className="mt-4"
                tone="success"
                title="Tous les badges sont gagnés"
                role="status"
              >
                Ton tableau d’accomplissements actuel est complet.
              </InlineNotice>
            ) : null}

            {snapshot ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {snapshot.achievements.map((progress) => (
                  <article
                    key={progress.achievement.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950 dark:text-white">
                          {progress.achievement.name}
                        </h3>
                        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                          {progress.achievement.description}
                        </p>
                      </div>
                      {progress.earned ? (
                        <Medal
                          aria-label="Badge gagné"
                          className="size-5 shrink-0 text-amber-600 dark:text-amber-400"
                        />
                      ) : (
                        <LockKeyhole
                          aria-label="Badge verrouillé"
                          className="size-5 shrink-0 text-slate-400"
                        />
                      )}
                    </div>

                    <div className="mt-3">
                      <div className="flex justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{progress.achievement.requirementLabel}</span>
                        <span>
                          {Math.min(progress.current, progress.target)}/
                          {progress.target}
                        </span>
                      </div>
                      <div
                        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
                        role="progressbar"
                        aria-label={`Progression ${progress.achievement.name}`}
                        aria-valuemin={0}
                        aria-valuemax={progress.target}
                        aria-valuenow={Math.min(
                          progress.current,
                          progress.target,
                        )}
                      >
                        <div
                          className="h-full rounded-full bg-brand-700 transition-[width] dark:bg-brand-500"
                          style={{ width: `${progress.percentage}%` }}
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      {progress.earned && progress.earnedAt
                        ? `Gagné le ${formatEarnedAt(progress.earnedAt)}`
                        : `Encore ${progress.remaining} à accomplir`}
                    </p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </section>
  );
}
