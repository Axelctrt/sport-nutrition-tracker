import {
  useCallback,
  useEffect,
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
  const [routerPathname, setRouterPathname] = useState(
    () => router.state.location.pathname,
  );
  const [pendingThemeIds, setPendingThemeIds] = useState(
    initialPendingThemeIds,
  );
  const [pendingAchievements, setPendingAchievements] = useState<AchievementUnlock[]>([]);
  const [trialThemeId, setTrialThemeId] = useState<VisualThemeId>();
  const [, setContextRevision] = useState(0);
  const pathname = currentPathname ?? routerPathname;

  useEffect(() => {
    if (currentPathname !== undefined) return undefined;
    return router.subscribe((state) => {
      setRouterPathname(state.location.pathname);
    });
  }, [currentPathname]);

  const contextSafe = rewardRevealContextIsSafe(pathname);
  const revealThemeId = contextSafe ? pendingThemeIds[0] : undefined;
  const revealTheme = revealThemeId
    ? getVisualThemeDefinition(revealThemeId)
    : undefined;
  const trialTheme = trialThemeId
    ? getVisualThemeDefinition(trialThemeId)
    : undefined;
  const achievementReveal = contextSafe && !revealTheme
    ? pendingAchievements[0]
    : undefined;

  useEffect(() => {
    if (pendingThemeIds.length === 0 || revealThemeId) return undefined;
    const timer = window.setInterval(() => {
      setContextRevision((revision) => revision + 1);
    }, 400);
    return () => window.clearInterval(timer);
  }, [pendingThemeIds.length, revealThemeId]);

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
  }, [observeUnlocks]);

  const consumeReveal = useCallback((themeId: VisualThemeId) => {
    setPendingThemeIds((current) => current.filter((id) => id !== themeId));
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
