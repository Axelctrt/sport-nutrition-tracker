import {
  Activity,
  BarChart3,
  CalendarCheck2,
  ChartNoAxesCombined,
  Check,
  Eye,
  Home,
  LockKeyhole,
  Palette,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  loadThemeAchievementSnapshot,
  type ThemeAchievementProgress,
  type ThemeAchievementSnapshot,
} from "@/application/rewards/themeAchievementService";
import {
  activateVisualTheme,
  beginVisualThemeTrial,
  cancelVisualThemeTrial,
  confirmVisualThemeTrial,
  readVisualThemeState,
  type SportPilotThemeRarity,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import { REWARDS_ROUTINES_CHANGED_EVENT } from "@/infrastructure/sync-prototype/rewardsRoutinesSyncEvents";
import { BottomSheet } from "@/shared/ui/BottomSheet";
import { InlineNotice } from "@/shared/ui/InlineNotice";
import {
  SportPilotActiveBorder,
  SportPilotProgressTransition,
} from "@/shared/ui/SportPilotMotion";
import { SportPilotStatefulButton } from "@/shared/ui/SportPilotStatefulButton";
import { cn } from "@/shared/utils/cn";

interface RewardThemesPanelProps {
  className?: string;
  loadSnapshot?: () => Promise<ThemeAchievementSnapshot>;
  activateTheme?: (themeId: VisualThemeId) => boolean | Promise<boolean>;
}

type ThemeApplyState = "idle" | "loading" | "success" | "error";

const rarityLabels: Record<SportPilotThemeRarity, string> = {
  standard: "Standard",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

const rarityClasses: Record<SportPilotThemeRarity, string> = {
  standard: "border-[var(--sp-border-subtle)] text-[var(--sp-text-secondary)]",
  rare: "border-cyan-500/45 text-cyan-700 dark:text-cyan-300",
  epic: "border-violet-500/45 text-violet-700 dark:text-violet-300",
  legendary: "border-amber-500/50 text-amber-700 dark:text-amber-300",
};

const previewNavigation = [Home, Activity, BarChart3, Trophy] as const;

function formatUnlockDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function ThemeMiniInterface({
  progress,
  compact = false,
}: {
  progress: ThemeAchievementProgress;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden border border-white/25 shadow-lg",
        compact ? "h-36 rounded-lg" : "min-h-72 rounded-lg",
      )}
      data-theme-preview={progress.theme.id}
      aria-label={`Aperçu du thème ${progress.theme.name}`}
    >
      <div className={cn("relative z-10 flex h-full flex-col", compact ? "p-3" : "p-5")}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase text-white/80">
            SportPilot
          </span>
          <span className="h-2 w-12 rounded-full bg-white/45" />
        </div>
        <div className={cn("grid flex-1 gap-2", compact ? "mt-3 grid-cols-[1.4fr_0.8fr]" : "mt-6 grid-cols-[1.3fr_0.9fr]")}>
          <div className="border border-white/25 bg-black/20 p-3 backdrop-blur-md">
            <p className="text-xs font-semibold text-white/70">Prochaine action</p>
            <p className={cn("mt-1 font-bold text-white", compact ? "text-sm" : "text-lg")}>
              Bilan du jour
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/20">
              <span className="block h-full w-3/4 rounded-full bg-white/85" />
            </div>
          </div>
          <div className="border border-white/25 bg-white/15 p-3 backdrop-blur-md">
            <p className="text-xs text-white/70">Nutrition</p>
            <p className={cn("mt-1 font-bold text-white", compact ? "text-base" : "text-2xl")}>
              82 %
            </p>
            <div className="mt-3 flex h-8 items-end gap-1">
              {[45, 70, 52, 86, 66].map((height, index) => (
                <span
                  key={index}
                  className="flex-1 rounded-t-sm bg-white/70"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className={cn("grid grid-cols-4 gap-2", compact ? "mt-2" : "mt-4")}>
          {previewNavigation.map((Icon, index) => (
            <span
              key={Icon.displayName ?? index}
              className={cn(
                "grid place-items-center border border-white/20 text-white",
                compact ? "h-6" : "h-9",
                index === 2 ? "bg-white/25" : "bg-black/15",
              )}
            >
              <Icon aria-hidden="true" className={compact ? "size-3" : "size-4"} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ThemeCriteria({ progress }: { progress: ThemeAchievementProgress }) {
  if (progress.criteria.length === 0) {
    return (
      <p className="text-sm text-[var(--sp-text-secondary)]">
        Disponible immédiatement.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {progress.criteria.map((item) => (
        <div key={item.id}>
          <div className="flex items-start justify-between gap-3 text-sm">
            <span className="text-[var(--sp-text-secondary)]">{item.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-[var(--sp-text-primary)]">
              {Math.min(item.current, item.target)} / {item.target}
              {item.met ? <Check aria-hidden="true" className="ml-1 inline size-4 text-[var(--sp-success)]" /> : null}
            </span>
          </div>
          <SportPilotProgressTransition
            value={item.current}
            max={item.target}
            label={item.label}
            showValue={false}
            className="mt-1.5"
          />
        </div>
      ))}
    </div>
  );
}

export function RewardThemesPanel({
  className,
  loadSnapshot = loadThemeAchievementSnapshot,
  activateTheme = activateVisualTheme,
}: RewardThemesPanelProps) {
  const [snapshot, setSnapshot] = useState<ThemeAchievementSnapshot>();
  const [activeThemeId, setActiveThemeId] = useState(
    () => readVisualThemeState().activeThemeId,
  );
  const [previewThemeId, setPreviewThemeId] = useState<VisualThemeId>();
  const [trialThemeId, setTrialThemeId] = useState<VisualThemeId>();
  const [themeApplyStates, setThemeApplyStates] = useState<
    Partial<Record<VisualThemeId, ThemeApplyState>>
  >({});
  const applyResetTimersRef = useRef(new Map<VisualThemeId, number>());
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => () => {
    for (const timer of applyResetTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    applyResetTimersRef.current.clear();
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const next = await loadSnapshot();
        if (!mounted) return;
        setSnapshot(next);
        setActiveThemeId(readVisualThemeState().activeThemeId);
        setLoadError(undefined);
      } catch (error) {
        if (!mounted) return;
        setLoadError(
          error instanceof Error
            ? error.message
            : "La collection de thèmes est indisponible.",
        );
      }
    };
    const reload = () => void load();
    void load();
    window.addEventListener(REWARDS_ROUTINES_CHANGED_EVENT, reload);
    return () => {
      mounted = false;
      window.removeEventListener(REWARDS_ROUTINES_CHANGED_EVENT, reload);
    };
  }, [loadSnapshot]);

  const activeTheme = snapshot?.themes.find(
    ({ theme }) => theme.id === activeThemeId,
  );
  const previewTheme = snapshot?.themes.find(
    ({ theme }) => theme.id === previewThemeId,
  );
  const previewIsActive = previewTheme?.theme.id === activeThemeId;
  const unlockedCount = snapshot?.themes.filter(({ unlocked }) => unlocked).length ?? 0;

  const sortedThemes = useMemo(
    () => snapshot?.themes ?? [],
    [snapshot],
  );

  const setThemeApplyState = (
    themeId: VisualThemeId,
    state: ThemeApplyState,
  ) => {
    setThemeApplyStates((current) => ({ ...current, [themeId]: state }));
  };

  const scheduleThemeApplyReset = (themeId: VisualThemeId) => {
    const currentTimer = applyResetTimersRef.current.get(themeId);
    if (currentTimer !== undefined) window.clearTimeout(currentTimer);
    const timer = window.setTimeout(() => {
      setThemeApplyStates((current) => {
        const next = { ...current };
        delete next[themeId];
        return next;
      });
      applyResetTimersRef.current.delete(themeId);
    }, 900);
    applyResetTimersRef.current.set(themeId, timer);
  };

  const applyTheme = async (themeId: VisualThemeId) => {
    setThemeApplyState(themeId, "loading");
    let applied = false;
    try {
      applied = await activateTheme(themeId);
    } catch {
      applied = false;
    }
    setThemeApplyState(themeId, applied ? "success" : "error");
    if (applied) {
      setActiveThemeId(themeId);
      setTrialThemeId(undefined);
      setPreviewThemeId(undefined);
    }
    scheduleThemeApplyReset(themeId);
  };

  const tryTheme = (themeId: VisualThemeId) => {
    if (!beginVisualThemeTrial(themeId)) return;
    setTrialThemeId(themeId);
    setPreviewThemeId(undefined);
  };

  const confirmTrial = () => {
    if (confirmVisualThemeTrial()) {
      setActiveThemeId(readVisualThemeState().activeThemeId);
      setTrialThemeId(undefined);
    }
  };

  const cancelTrial = () => {
    cancelVisualThemeTrial();
    setTrialThemeId(undefined);
  };

  return (
    <section aria-labelledby="reward-themes-title" className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase text-[var(--sp-accent-primary)]">
            Collection visuelle
          </p>
          <h2 id="reward-themes-title" className="mt-1 text-xl font-bold text-[var(--sp-text-primary)]">
            Thèmes
          </h2>
          <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
            Chaque identité se débloque avec tes données réelles.
          </p>
        </div>
        {snapshot ? (
          <span className="inline-flex min-h-9 items-center gap-2 border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-card)] px-3 text-sm font-semibold text-[var(--sp-text-primary)]">
            <Palette aria-hidden="true" className="size-4 text-[var(--sp-accent-primary)]" />
            {unlockedCount} / {snapshot.themes.length}
          </span>
        ) : null}
      </div>

      {trialThemeId ? (
        <InlineNotice
          className="mt-4"
          tone="info"
          title="Thème en essai"
          role="status"
        >
          <p>La préférence synchronisée reste inchangée jusqu’à ta confirmation.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SportPilotStatefulButton
              state="idle"
              idleLabel="Conserver ce thème"
              successLabel="Thème conservé"
              onClick={confirmTrial}
            />
            <button
              type="button"
              className="sp-button sp-button--secondary min-h-12 rounded-[var(--sp-radius-control)] px-4 text-sm font-semibold"
              onClick={cancelTrial}
            >
              Revenir à l’ancien thème
            </button>
          </div>
        </InlineNotice>
      ) : null}

      {loadError ? (
        <InlineNotice className="mt-4" tone="error" title="Thèmes indisponibles" role="alert">
          {loadError}
        </InlineNotice>
      ) : null}

      {!snapshot && !loadError ? (
        <div className="mt-4 h-72 animate-pulse bg-[var(--sp-surface-muted)] motion-reduce:animate-none" aria-label="Chargement des thèmes" />
      ) : null}

      {activeTheme ? (
        <section className="mt-5" aria-labelledby="active-theme-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[var(--sp-text-muted)]">Thème actif</p>
              <h3 id="active-theme-title" className="mt-1 text-lg font-bold text-[var(--sp-text-primary)]">
                {activeTheme.theme.name}
              </h3>
            </div>
            <span className={cn("border px-2 py-1 text-xs font-bold uppercase", rarityClasses[activeTheme.theme.rarity])}>
              {rarityLabels[activeTheme.theme.rarity]}
            </span>
          </div>
          <ThemeMiniInterface progress={activeTheme} />
        </section>
      ) : null}

      {snapshot ? (
        <section className="mt-7" aria-labelledby="theme-collection-title">
          <div className="flex items-center justify-between gap-3">
            <h3 id="theme-collection-title" className="text-lg font-bold text-[var(--sp-text-primary)]">
              Ma collection
            </h3>
            <span className="text-sm text-[var(--sp-text-muted)]">
              {snapshot.previewableCount} aperçus
            </span>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {sortedThemes.map((progress) => {
              const active = activeThemeId === progress.theme.id;
              const applyState = themeApplyStates[progress.theme.id] ?? "idle";
              return (
                <SportPilotActiveBorder
                  key={progress.theme.id}
                  active={active}
                  rarity={progress.theme.rarity}
                  className="overflow-hidden bg-[var(--sp-surface-card)]"
                >
                  <article aria-labelledby={`theme-${progress.theme.id}-title`}>
                    <ThemeMiniInterface progress={progress} compact />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 id={`theme-${progress.theme.id}-title`} className="font-bold text-[var(--sp-text-primary)]">
                            {progress.theme.name}
                          </h4>
                          <p className="mt-0.5 text-xs font-semibold uppercase text-[var(--sp-text-muted)]">
                            {rarityLabels[progress.theme.rarity]}
                          </p>
                        </div>
                        {progress.unlocked ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--sp-success)]">
                            <Check aria-hidden="true" className="size-4" />
                            {active ? "Actif" : "Débloqué"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--sp-text-muted)]">
                            <LockKeyhole aria-hidden="true" className="size-4" />
                            Verrouillé
                          </span>
                        )}
                      </div>

                      <p className="mt-3 text-sm leading-6 text-[var(--sp-text-secondary)]">
                        {progress.theme.description}
                      </p>
                      <div className="mt-4">
                        <ThemeCriteria progress={progress} />
                      </div>
                      {progress.unlockedAt ? (
                        <p className="mt-3 inline-flex items-center gap-2 text-xs text-[var(--sp-text-muted)]">
                          <CalendarCheck2 aria-hidden="true" className="size-4" />
                          Débloqué le {formatUnlockDate(progress.unlockedAt)}
                        </p>
                      ) : null}

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="sp-button sp-button--secondary inline-flex min-h-11 items-center gap-2 rounded-[var(--sp-radius-control)] px-3 text-sm font-semibold"
                          onClick={() => setPreviewThemeId(progress.theme.id)}
                        >
                          <Eye aria-hidden="true" className="size-4" />
                          {progress.unlocked ? "Prévisualiser" : "Voir ma progression"}
                        </button>
                        {progress.unlocked && (!active || applyState !== "idle") ? (
                          <SportPilotStatefulButton
                            state={applyState}
                            idleLabel="Appliquer"
                            loadingLabel="Application…"
                            successLabel="Thème appliqué"
                            errorLabel="Indisponible"
                            onClick={() => void applyTheme(progress.theme.id)}
                          />
                        ) : null}
                      </div>
                    </div>
                  </article>
                </SportPilotActiveBorder>
              );
            })}
          </div>
        </section>
      ) : null}

      <BottomSheet
        open={Boolean(previewTheme)}
        title={previewTheme?.theme.name ?? "Aperçu du thème"}
        description={previewTheme?.theme.description}
        onClose={() => setPreviewThemeId(undefined)}
      >
        {previewTheme ? (
          <div>
            <div className="flex items-center justify-between gap-3">
              <span className={cn("border px-2 py-1 text-xs font-bold uppercase", rarityClasses[previewTheme.theme.rarity])}>
                {rarityLabels[previewTheme.theme.rarity]}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--sp-text-muted)]">
                {previewTheme.theme.rarity === "epic" || previewTheme.theme.rarity === "legendary"
                  ? <Sparkles aria-hidden="true" className="size-4" />
                  : <ChartNoAxesCombined aria-hidden="true" className="size-4" />}
                {previewTheme.theme.motionProfile.name}
              </span>
            </div>
            <div className="mt-4">
              <ThemeMiniInterface progress={previewTheme} />
            </div>
            <div className="mt-5">
              <h4 className="font-bold text-[var(--sp-text-primary)]">Conditions</h4>
              <div className="mt-3">
                <ThemeCriteria progress={previewTheme} />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {previewIsActive ? (
                <div className="flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] border border-[var(--sp-success)] bg-[color-mix(in_srgb,var(--sp-success)_10%,var(--sp-surface-card))] px-4 text-sm font-semibold text-[var(--sp-success)]">
                  <Check aria-hidden="true" className="size-4" />
                  Thème actuellement utilisé
                </div>
              ) : previewTheme.unlocked ? (
                <>
                  <SportPilotStatefulButton
                    fullWidth
                    state="idle"
                    idleLabel="Essayer maintenant"
                    onClick={() => tryTheme(previewTheme.theme.id)}
                  />
                  <SportPilotStatefulButton
                    fullWidth
                    state={themeApplyStates[previewTheme.theme.id] ?? "idle"}
                    idleLabel="Appliquer ce thème"
                    loadingLabel="Application…"
                    successLabel="Thème appliqué"
                    errorLabel="Indisponible"
                    onClick={() => void applyTheme(previewTheme.theme.id)}
                  />
                </>
              ) : (
                <button
                  type="button"
                  className="sp-button sp-button--secondary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-semibold"
                  onClick={() => setPreviewThemeId(undefined)}
                >
                  <X aria-hidden="true" className="size-4" />
                  Revenir à la collection
                </button>
              )}
            </div>
          </div>
        ) : null}
      </BottomSheet>
    </section>
  );
}
