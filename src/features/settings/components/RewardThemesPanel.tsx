import { CheckCircle2, LockKeyhole, Palette, Trophy } from "lucide-react";
import { useEffect, useState } from "react";

import {
  loadThemeAchievementSnapshot,
  type ThemeAchievementSnapshot,
} from "@/application/rewards/themeAchievementService";
import {
  activateVisualTheme,
  readVisualThemeState,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

interface RewardThemesPanelProps {
  className?: string;
  loadSnapshot?: () => Promise<ThemeAchievementSnapshot>;
  activateTheme?: (themeId: VisualThemeId) => boolean;
}

export function RewardThemesPanel({
  className,
  loadSnapshot = loadThemeAchievementSnapshot,
  activateTheme = activateVisualTheme,
}: RewardThemesPanelProps) {
  const [snapshot, setSnapshot] = useState<ThemeAchievementSnapshot>();
  const [activeThemeId, setActiveThemeId] = useState<VisualThemeId>(
    () => readVisualThemeState().activeThemeId,
  );
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
              : "Les accomplissements n’ont pas pu être calculés.",
          );
        }
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [loadSnapshot]);

  const handleActivate = (themeId: VisualThemeId) => {
    if (activateTheme(themeId)) setActiveThemeId(themeId);
  };

  return (
    <section aria-labelledby="reward-themes-title" className={className}>
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-200">
            <Palette aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2
                  id="reward-themes-title"
                  className="font-semibold text-slate-950 dark:text-white"
                >
                  Thèmes récompenses
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Débloque de nouvelles palettes en utilisant réellement
                  SportPilot. Un thème acquis reste disponible, même après un
                  nettoyage des données de test.
                </p>
              </div>
              {snapshot ? (
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full bg-fuchsia-50 px-3 text-sm font-semibold text-fuchsia-800 dark:bg-fuchsia-950/60 dark:text-fuchsia-200">
                  <Trophy aria-hidden="true" className="size-4" />
                  {`${
                    snapshot.themes.filter((progress) => progress.unlocked)
                      .length
                  }/${snapshot.themes.length} débloqués`}
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
                Analyse des accomplissements…
              </p>
            ) : null}

            {snapshot ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {snapshot.themes.map((progress) => {
                  const isActive = activeThemeId === progress.theme.id;
                  const remaining = Math.max(
                    0,
                    progress.target - progress.current,
                  );
                  const percentage = Math.min(
                    100,
                    Math.round((progress.current / progress.target) * 100),
                  );

                  return (
                    <article
                      key={progress.theme.id}
                      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700"
                    >
                      <div
                        aria-hidden="true"
                        className="h-14 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${progress.theme.previewFrom}, ${progress.theme.previewTo})`,
                        }}
                      />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-950 dark:text-white">
                            {progress.theme.name}
                          </h3>
                          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                            {progress.theme.description}
                          </p>
                        </div>
                        {progress.unlocked ? (
                          <CheckCircle2
                            aria-label="Thème débloqué"
                            className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400"
                          />
                        ) : (
                          <LockKeyhole
                            aria-label="Thème verrouillé"
                            className="size-5 shrink-0 text-slate-400"
                          />
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>{progress.requirementLabel}</span>
                          <span>
                            {Math.min(progress.current, progress.target)}/
                            {progress.target}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-brand-700 transition-[width] dark:bg-brand-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                        disabled={!progress.unlocked || isActive}
                        aria-pressed={isActive}
                        onClick={() => handleActivate(progress.theme.id)}
                      >
                        {isActive
                          ? "Thème actif"
                          : progress.unlocked
                            ? "Utiliser ce thème"
                            : `Encore ${remaining} à accomplir`}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </Card>
    </section>
  );
}
