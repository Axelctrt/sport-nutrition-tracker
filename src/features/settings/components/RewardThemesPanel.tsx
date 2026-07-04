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
import { createPortal } from "react-dom";

import {
  loadThemeAchievementSnapshot,
  type ThemeAchievementSnapshot,
  type ThemeAchievementProgress,
} from "@/application/rewards/themeAchievementService";
import {
  activateVisualTheme,
  readVisualThemeState,
  readVisualThemeStyleMode,
  updateVisualThemeStyleMode,
  type VisualThemeId,
  type VisualThemeStyleMode,
} from "@/domain/rewards/visualThemes";
import { REWARDS_ROUTINES_CHANGED_EVENT } from "@/infrastructure/sync-prototype/rewardsRoutinesSyncEvents";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

interface RewardThemesPanelProps {
  className?: string;
  loadSnapshot?: () => Promise<ThemeAchievementSnapshot>;
  activateTheme?: (themeId: VisualThemeId) => boolean;
}

const tierLabels: Record<string, string> = {
  base: "Base",
  accessible: "Accessible",
  advanced: "Avancé",
  legendary: "Légendaire",
};

const CLASSIC_THEME_ID: VisualThemeId = "classic";

function ThemePreviewMockup({
  progress,
}: {
  progress: ThemeAchievementProgress;
}) {
  return (
    <div
      className="overflow-hidden rounded-3xl border border-white/30 bg-slate-950 shadow-2xl"
      data-theme-quick-preview={progress.theme.id}
    >
      <div
        aria-hidden="true"
        className="sport-theme-preview relative min-h-64 overflow-hidden"
        data-sport-preview={progress.theme.id}
        style={{
          background: `linear-gradient(135deg, ${progress.theme.previewFrom}, ${progress.theme.previewTo})`,
        }}
      >
        <span className="sport-theme-preview__scene" />
        <span className="sport-theme-preview__glow" />
        <div className="relative z-10 flex min-h-64 flex-col justify-between p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                Aperçu rapide
              </p>
              <h3 className="mt-2 text-2xl font-bold drop-shadow">
                {progress.theme.name}
              </h3>
            </div>
            <span className="rounded-full bg-white/18 px-3 py-1 text-xs font-semibold uppercase tracking-wide backdrop-blur-md">
              {tierLabels[progress.theme.tier]}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1.3fr_0.9fr]">
            <div className="rounded-2xl border border-white/20 bg-white/18 p-4 shadow-xl backdrop-blur-md">
              <p className="text-sm font-semibold text-white/90">
                Bilan hebdomadaire
              </p>
              <div className="mt-3 h-2 rounded-full bg-white/25">
                <div className="h-2 w-2/3 rounded-full bg-white/80" />
              </div>
              <p className="mt-3 text-xs leading-5 text-white/78">
                Exemple de rendu avec cartes lisibles au-dessus du fond.
              </p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-slate-950/28 p-4 shadow-xl backdrop-blur-md">
              <p className="text-sm font-semibold text-white/90">Progression</p>
              <p className="mt-2 text-3xl font-bold text-white">72 %</p>
              <p className="mt-1 text-xs text-white/72">Objectifs actifs</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [themeStyleMode, setThemeStyleMode] = useState<VisualThemeStyleMode>(
    () => readVisualThemeStyleMode(),
  );
  const [quickPreviewThemeId, setQuickPreviewThemeId] =
    useState<VisualThemeId>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const nextSnapshot = await loadSnapshot();
        if (isMounted) {
          setSnapshot(nextSnapshot);
          const themeState = readVisualThemeState();
          setActiveThemeId(themeState.activeThemeId);
          setThemeStyleMode(readVisualThemeStyleMode());
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
      setActiveThemeId(themeId);
    }
  };

  const handleThemeStyleModeChange = (styleMode: VisualThemeStyleMode) => {
    const nextState = updateVisualThemeStyleMode(styleMode);
    setThemeStyleMode(styleMode);
    setActiveThemeId(nextState.activeThemeId);
  };

  const quickPreviewProgress = snapshot?.themes.find(
    (progress) => progress.theme.id === quickPreviewThemeId,
  );
  const quickPreviewDialog = quickPreviewProgress ? (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-slate-950/55 p-3 backdrop-blur-[2px] sm:p-6"
      data-theme-preview-backdrop="true"
      onClick={() => setQuickPreviewThemeId(undefined)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="theme-quick-preview-title"
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-3xl bg-white p-4 shadow-2xl dark:bg-slate-950 sm:p-5"
        data-theme-preview-dialog="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">
              Mini aperçu
            </p>
            <h3
              id="theme-quick-preview-title"
              className="mt-1 text-lg font-bold text-slate-950 dark:text-white"
            >
              {quickPreviewProgress.theme.name}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Aperçu indicatif du fond et des cartes, sans appliquer le
              thème à l’application.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            onClick={() => setQuickPreviewThemeId(undefined)}
            aria-label="Fermer l’aperçu du thème"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="mt-4">
          <ThemePreviewMockup progress={quickPreviewProgress} />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
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
                  Consulte les thèmes depuis l’icône œil, puis active seulement
                  ceux qui sont réellement débloqués par tes accomplissements.
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
              title="Deux styles d’application"
              role="status"
            >
              Le style complet applique le fond coloré à toute l’interface. Le
              style minimaliste conserve une interface neutre et limite le thème
              aux icônes, accents et barres de progression.
            </InlineNotice>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    Style du thème
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    Choisis entre un rendu immersif complet ou une touche
                    minimaliste sur les éléments d’accent.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1 shadow-sm dark:bg-slate-950">
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      themeStyleMode === "full"
                        ? "bg-brand-700 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                    }`}
                    aria-pressed={themeStyleMode === "full"}
                    onClick={() => handleThemeStyleModeChange("full")}
                  >
                    Complet
                  </button>
                  <button
                    type="button"
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                      themeStyleMode === "minimal"
                        ? "bg-brand-700 text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                    }`}
                    aria-pressed={themeStyleMode === "minimal"}
                    onClick={() => handleThemeStyleModeChange("minimal")}
                  >
                    Minimaliste
                  </button>
                </div>
              </div>
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
                  const isClassicFullMode =
                    progress.theme.id === CLASSIC_THEME_ID &&
                    themeStyleMode === "full";

                  return (
                    <article
                      key={progress.theme.id}
                      className={`rounded-2xl border border-slate-200 p-4 transition-opacity dark:border-slate-700 ${
                        isClassicFullMode
                          ? "bg-slate-50/70 opacity-75 dark:bg-slate-900/55"
                          : ""
                      }`}
                    >
                      <div
                        className={`sport-theme-preview relative h-20 overflow-hidden rounded-xl ${
                          isClassicFullMode ? "grayscale" : ""
                        }`}
                        data-sport-preview={progress.theme.id}
                        style={{
                          background: `linear-gradient(135deg, ${progress.theme.previewFrom}, ${progress.theme.previewTo})`,
                        }}
                      >
                        <span className="sport-theme-preview__scene" />
                        <span className="sport-theme-preview__glow" />
                        <button
                          type="button"
                          className="absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-full border border-white/45 bg-slate-950/45 text-white shadow-lg backdrop-blur-md transition-colors hover:bg-slate-950/65 focus:outline-none focus:ring-2 focus:ring-white/80 disabled:cursor-not-allowed disabled:opacity-45"
                          disabled={isClassicFullMode}
                          onClick={() =>
                            setQuickPreviewThemeId(progress.theme.id)
                          }
                          aria-label={
                            isClassicFullMode
                              ? "SportPilot classique n’a pas d’aperçu complet"
                              : `Voir un aperçu rapide de ${progress.theme.name}`
                          }
                        >
                          <Eye aria-hidden="true" className="size-4" />
                        </button>
                        {isClassicFullMode ? (
                          <span className="absolute bottom-2 left-2 z-10 rounded-full bg-slate-950/55 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur-md">
                            Minimaliste uniquement
                          </span>
                        ) : null}
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
                                <Sparkles
                                  aria-hidden="true"
                                  className="size-3"
                                />
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

                      <div className="mt-4">
                        <button
                          type="button"
                          className="inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
                          disabled={
                            !progress.unlocked || isActive || isClassicFullMode
                          }
                          aria-pressed={isActive}
                          onClick={() => handleActivate(progress.theme.id)}
                        >
                          {isClassicFullMode
                            ? "Minimaliste uniquement"
                            : isActive
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
      {quickPreviewDialog
        ? createPortal(quickPreviewDialog, document.body)
        : null}
    </>
  );
}
