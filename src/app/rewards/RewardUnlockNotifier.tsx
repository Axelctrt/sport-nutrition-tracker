import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { routePaths } from "@/app/routePaths";
import { router } from "@/app/router";
import { rewardRevealContextIsSafe } from "@/app/rewards/rewardRevealContext";
import {
  observeRewardUnlocks,
  type RewardUnlockBatch,
  type RewardUnlockListener,
} from "@/application/rewards/rewardUnlockObserver";
import {
  beginVisualThemeTrial,
  cancelVisualThemeTrial,
  confirmVisualThemeTrial,
  getVisualThemeDefinition,
  markVisualThemeRevealSeen,
  readVisualThemeState,
  visualThemeCatalog,
  type VisualThemeId,
} from "@/domain/rewards/visualThemes";
import { SportPilotBadgeReveal } from "@/shared/ui/SportPilotBadgeReveal";
import {
  SportPilotThemeTrialBar,
  SportPilotUnlockReveal,
} from "@/shared/ui/SportPilotUnlockReveal";
import { useToast } from "@/shared/toast/useToast";

export type RewardUnlockObserver = (
  onUnlocks: RewardUnlockListener,
  onError?: (error: unknown) => void,
) => () => void;

type AchievementUnlock = RewardUnlockBatch["achievements"][number];

interface RewardUnlockNotifierProps {
  observeUnlocks?: RewardUnlockObserver;
  currentPathname?: string;
  navigateToDashboard?: () => void | Promise<void>;
}

function joinNames(names: readonly string[]): string {
  return names.join(", ");
}

function initialPendingThemeIds(): VisualThemeId[] {
  const state = readVisualThemeState();
  return visualThemeCatalog.flatMap(({ id }) => {
    const metadata = state.unlockMetadata[id];
    return id !== "core"
      && state.unlockedThemeIds.includes(id)
      && metadata?.unlockedAt
      && !metadata.revealSeenAt
      ? [id]
      : [];
  });
}

export function RewardUnlockNotifier({
  observeUnlocks = observeRewardUnlocks,
  currentPathname,
  navigateToDashboard = () => router.navigate(routePaths.dashboard),
}: RewardUnlockNotifierProps) {
  const { showToast } = useToast();
  const [routerPathname, setRouterPathname] = useState(
    () => router.state.location.pathname,
  );
  const [pendingThemeIds, setPendingThemeIds] = useState(
    initialPendingThemeIds,
  );
  const [pendingAchievements, setPendingAchievements] = useState<AchievementUnlock[]>([]);
  const [explicitRevealId, setExplicitRevealId] = useState<VisualThemeId>();
  const [trialThemeId, setTrialThemeId] = useState<VisualThemeId>();
  const [, setContextRevision] = useState(0);
  const notifiedThemeIds = useRef(new Set<VisualThemeId>());
  const pathname = currentPathname ?? routerPathname;

  useEffect(() => {
    if (currentPathname !== undefined) return undefined;
    return router.subscribe((state) => {
      setRouterPathname(state.location.pathname);
    });
  }, [currentPathname]);

  const contextSafe = rewardRevealContextIsSafe(pathname);
  const revealThemeId = explicitRevealId
    ?? (contextSafe ? pendingThemeIds[0] : undefined);
  const revealTheme = revealThemeId
    ? getVisualThemeDefinition(revealThemeId)
    : undefined;
  const trialTheme = trialThemeId
    ? getVisualThemeDefinition(trialThemeId)
    : undefined;
  const achievementReveal = contextSafe && !revealTheme
    ? pendingAchievements[0]
    : undefined;

  const announceDeferredTheme = useCallback((themeId: VisualThemeId) => {
    if (notifiedThemeIds.current.has(themeId)) return;
    notifiedThemeIds.current.add(themeId);
    const theme = getVisualThemeDefinition(themeId);
    showToast({
      tone: "success",
      title: "Nouveau thème débloqué",
      description: `${theme.name} rejoint ta collection.`,
      action: {
        label: "Voir",
        ariaLabel: `Voir le thème ${theme.name}`,
        onClick: () => setExplicitRevealId(themeId),
      },
      durationMs: 10_000,
      dedupeKey: `reward-theme-deferred:${themeId}`,
    });
  }, [showToast]);

  useEffect(() => {
    if (pendingThemeIds.length === 0 || revealThemeId) return undefined;
    const nextThemeId = pendingThemeIds[0];
    if (!nextThemeId) return undefined;
    if (!contextSafe) announceDeferredTheme(nextThemeId);

    const timer = window.setInterval(() => {
      setContextRevision((revision) => revision + 1);
    }, 400);
    return () => window.clearInterval(timer);
  }, [
    announceDeferredTheme,
    contextSafe,
    pendingThemeIds,
    revealThemeId,
  ]);

  useEffect(() => {
    if (pendingAchievements.length === 0 || achievementReveal || revealTheme) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setContextRevision((revision) => revision + 1);
    }, 120);
    return () => window.clearInterval(timer);
  }, [achievementReveal, pendingAchievements.length, revealTheme]);

  useEffect(() => {
    if (!revealThemeId) return;
    markVisualThemeRevealSeen(revealThemeId);
  }, [revealThemeId]);

  useEffect(() => {
    const handleUnlocks = (batch: RewardUnlockBatch) => {
      if (batch.achievements.length > 0) {
        setPendingAchievements((current) => {
          const knownIds = new Set(current.map(({ achievement }) => achievement.id));
          return [
            ...current,
            ...batch.achievements.filter(({ achievement }) => !knownIds.has(achievement.id)),
          ];
        });

        if (!rewardRevealContextIsSafe(currentPathname ?? router.state.location.pathname)) {
          const names = batch.achievements.map(
            (progress) => progress.achievement.name,
          );
          const firstAchievement = batch.achievements[0];
          showToast({
            tone: "success",
            title:
              names.length === 1
                ? `Nouveau badge : ${names[0]}`
                : `${names.length} nouveaux badges gagnés`,
            description:
              names.length === 1 && firstAchievement
                ? firstAchievement.achievement.description
                : joinNames(names),
            action: {
              label: "Voir",
              ariaLabel: "Voir les badges débloqués",
              onClick: () => void router.navigate(`${routePaths.rewards}?tab=badges`),
            },
            durationMs: 8_000,
            dedupeKey: `reward-achievements:${batch.achievements
              .map((progress) => progress.achievement.id)
              .join(",")}`,
          });
        }
      }

      const newThemeIds = batch.themes
        .map(({ theme }) => theme.id)
        .filter((themeId) => (
          !readVisualThemeState().unlockMetadata[themeId]?.revealSeenAt
        ));
      if (newThemeIds.length === 0) return;
      setPendingThemeIds((current) => [
        ...current,
        ...newThemeIds.filter((themeId) => !current.includes(themeId)),
      ]);
    };

    return observeUnlocks(handleUnlocks, () => undefined);
  }, [currentPathname, observeUnlocks, showToast]);

  const consumeReveal = useCallback((themeId: VisualThemeId) => {
    setPendingThemeIds((current) => current.filter((id) => id !== themeId));
    setExplicitRevealId((current) => (
      current === themeId ? undefined : current
    ));
    window.setTimeout(() => {
      setContextRevision((revision) => revision + 1);
    }, 0);
  }, []);

  const consumeAchievement = useCallback((achievementId: string) => {
    setPendingAchievements((current) => current.filter(
      ({ achievement }) => achievement.id !== achievementId,
    ));
  }, []);

  const tryTheme = useCallback(() => {
    if (!revealThemeId || !beginVisualThemeTrial(revealThemeId)) return;
    consumeReveal(revealThemeId);
    setTrialThemeId(revealThemeId);
    void navigateToDashboard();
  }, [consumeReveal, navigateToDashboard, revealThemeId]);

  const keepCurrentTheme = useCallback(() => {
    if (revealThemeId) consumeReveal(revealThemeId);
  }, [consumeReveal, revealThemeId]);

  const confirmTrial = useCallback(() => {
    if (confirmVisualThemeTrial()) setTrialThemeId(undefined);
  }, []);

  const cancelTrial = useCallback(() => {
    cancelVisualThemeTrial();
    setTrialThemeId(undefined);
  }, []);

  const continueAfterBadge = useCallback(() => {
    if (achievementReveal) consumeAchievement(achievementReveal.achievement.id);
  }, [achievementReveal, consumeAchievement]);

  const viewBadgeRewards = useCallback(() => {
    if (achievementReveal) consumeAchievement(achievementReveal.achievement.id);
    void router.navigate(`${routePaths.rewards}?tab=badges`);
  }, [achievementReveal, consumeAchievement]);

  return (
    <>
      {revealTheme ? (
        <SportPilotUnlockReveal
          theme={revealTheme}
          onTry={tryTheme}
          onKeepCurrent={keepCurrentTheme}
        />
      ) : null}
      {achievementReveal ? (
        <SportPilotBadgeReveal
          name={achievementReveal.achievement.name}
          description={achievementReveal.achievement.description}
          onContinue={continueAfterBadge}
          onViewRewards={viewBadgeRewards}
        />
      ) : null}
      {trialTheme ? (
        <SportPilotThemeTrialBar
          themeName={trialTheme.name}
          onConfirm={confirmTrial}
          onCancel={cancelTrial}
        />
      ) : null}
    </>
  );
}
