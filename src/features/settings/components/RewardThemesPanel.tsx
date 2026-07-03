import {
  CheckCircle2,
  Eye,
  LockKeyhole,
  Palette,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  loadThemeAchievementSnapshot,
  type ThemeAchievementSnapshot,
} from "@/application/rewards/themeAchievementService";
import {
  activateVisualTheme,
  clearVisualThemePreview,
  previewVisualTheme,
  readVisualThemeState,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import { REWARDS_ROUTINES_CHANGED_EVENT } from "@/infrastructure/sync-prototype/rewardsRoutinesSyncEvents";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

interface RewardThemesPanelProps {
  className?: string;
  loadSnapshot?: () => Promise<ThemeAchievementSnapshot>;
  activateTheme?: (themeId: VisualThemeId) => boolean;
  previewTheme?: (themeId: VisualThemeId) => void;
  clearPreview?: () => VisualThemeId;
}

const tierLabels: Record<string, string> = {
  base: "Base",
  accessible: "Accessible",
  advanced: "Avancé",
  legendary: "Légendaire",
};

export function RewardThemesPanel({
  className,
  loadSnapshot = loadThemeAchievementSnapshot,
  activateTheme = activateVisualTheme,
  previewTheme = previewVisualTheme,
  clearPreview = clearVisualThemePreview,
}: RewardThemesPanelProps) {
  const [snapshot, setSnapshot] = useState<ThemeAchievementSnapshot>();
  const [activeThemeId, setActiveThemeId] = useState<VisualThemeId>(
    () => readVisualThemeState().activeThemeId,
  );
  const [previewThemeId, setPreviewThemeId] = useState<VisualThemeId>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const nextSnapshot = await loadSnapshot();
        if (isMounted) {
          setSnapshot(nextSnapshot);
          setActiveThemeId(readVisualThemeState().activeThemeId);
          setLoadError(undefined);
        }
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
    const reload = () => void load();

    void load();
    window.addEventListener(REWARDS_ROUTINES_CHANGED_EVENT, reload);
    return () => {
      isMounted = false;
      window.removeEventListener(REWARDS_ROUTINES_CHANGED_EVENT, reload);
    };
  }, [loadSnapshot]);

  const handleActivate = (themeId: VisualThemeId) => {
    if (activateTheme(themeId)) {
      setPreviewThemeId(undefined);
      setActiveThemeId(themeId);
    }
  };

  const handlePreview = (themeId: VisualThemeId) => {
    previewTheme(themeId);
    setPreviewThemeId(themeId);
  };

  const handleClearPreview = () => {
    const restoredThemeId = clearPreview();
    setPreviewThemeId(undefined);
    setActiveThemeId(restoredThemeId);
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
                  Prévisualise tous les thèmes pendant les tests, puis conserve
                  uniquement les thèmes réellement débloqués comme choix
                  permanent.
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

            <InlineNotice
              className="mt-4"
              tone="info"
              title="Mode aperçu disponible"
              role="status"
            >
              Les thèmes verrouillés peuvent être testés visuellement sans être
              ajoutés aux thèmes acquis. Après validation esthétique, les règles
              de déblocage resteront seules responsables du déverrouillage.
            </InlineNotice>

            {previewThemeId ? (
              <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-fuchsia-200 bg-fuchsia-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-fuchsia-900 dark:bg-fuchsia-950/30">
                <p className="text-sm font-semibold text-fuchsia-950 dark:text-fuchsia-100">
                  Aperçu actif : {snapshot?.themes.find((progress) => progress.theme.id === previewThemeId)?.theme.name ?? previewThemeId}
                </p>
                <button
                  type="button"
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-fuchsia-300 bg-white px-3 py-2 text-sm font-semibold text-fuchsia-900 hover:bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-slate-950 dark:text-fuchsia-100 dark:hover:bg-fuchsia-950/40"
                  onClick={handleClearPreview}
                >
                  <X aria-hidden="true" className="size-4" />
                  Quitter l’aperçu
                </button>
              </div>
            ) : null}

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
                  const isActive = activeThemeId === progress.theme.id && !previewThemeId;
                  const isPreviewed = previewThemeId === progress.theme.id;
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
                        className="sport-theme-preview relative h-20 overflow-hidden rounded-xl"
                        data-sport-preview={progress.theme.id}
                        style={{
                          background: `linear-gradient(135deg, ${progress.theme.previewFrom}, ${progress.theme.previewTo})`,
                        }}
                      >
                        <span className="sport-theme-preview__scene" />
                        <span className="sport-theme-preview__glow" />
                      </div>
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-slate-950 dark:text-white">
                              {progress.theme.name}
                            </h3>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {tierLabels[progress.theme.tier]}
                            </span>
                            {progress.theme.dynamic ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                                <Sparkles aria-hidden="true" className="size-3" />
                                Ultime
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                            {progress.theme.description}
                          </p>
                          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Style : {progress.theme.patternLabel}
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

                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          onClick={() => handlePreview(progress.theme.id)}
                          aria-pressed={isPreviewed}
                        >
                          <Eye aria-hidden="true" className="size-4" />
                          {isPreviewed ? "Aperçu actif" : `Prévisualiser ${progress.theme.name}`}
                        </button>
                        <button
                          type="button"
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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
                      </div>
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
