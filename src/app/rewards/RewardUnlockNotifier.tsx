import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { routePaths } from "@/app/routePaths";
import { router } from "@/app/router";
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
import {
  SportPilotThemeTrialBar,
  SportPilotUnlockReveal,
} from "@/shared/ui/SportPilotUnlockReveal";
import { useToast } from "@/shared/toast/useToast";

export type RewardUnlockObserver = (
  onUnlocks: RewardUnlockListener,
  onError?: (error: unknown) => void,
) => () => void;

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

export function rewardRevealContextIsSafe(
  pathname: string,
  root: Document = document,
): boolean {
  if (pathname !== routePaths.dashboard && pathname !== routePaths.rewards) {
    return false;
  }
  const activeElement = root.activeElement;
  if (
    activeElement instanceof HTMLInputElement
    || activeElement instanceof HTMLTextAreaElement
    || activeElement instanceof HTMLSelectElement
    || (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  ) {
    return false;
  }
  return root.querySelector([
    '[role="dialog"]',
    '[aria-busy="true"]',
    "[data-bottom-sheet-content]",
    "form[data-submitting='true']",
  ].join(",")) === null;
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
  const [explicitRevealId, setExplicitRevealId] = useState<VisualThemeId>();
  const [trialThemeId, setTrialThemeId] = useState<VisualThemeId>();
  const [contextRevision, setContextRevision] = useState(0);
  const notifiedThemeIds = useRef(new Set<VisualThemeId>());
  const pathname = currentPathname ?? routerPathname;

  useEffect(() => {
    if (currentPathname !== undefined) return undefined;
    return router.subscribe((state) => {
      setRouterPathname(state.location.pathname);
    });
  }, [currentPathname]);

  const contextSafe = useMemo(
    () => rewardRevealContextIsSafe(pathname),
    [contextRevision, pathname],
  );
  const revealThemeId = explicitRevealId
    ?? (contextSafe ? pendingThemeIds[0] : undefined);
  const revealTheme = revealThemeId
    ? getVisualThemeDefinition(revealThemeId)
    : undefined;
  const trialTheme = trialThemeId
    ? getVisualThemeDefinition(trialThemeId)
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
    if (!revealThemeId) return;
    markVisualThemeRevealSeen(revealThemeId);
  }, [revealThemeId]);

  useEffect(() => {
    const handleUnlocks = (batch: RewardUnlockBatch) => {
      if (batch.achievements.length > 0) {
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
          durationMs: 8_000,
          dedupeKey: `reward-achievements:${batch.achievements
            .map((progress) => progress.achievement.id)
            .join(",")}`,
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
  }, [observeUnlocks, showToast]);

  const consumeReveal = useCallback((themeId: VisualThemeId) => {
    setPendingThemeIds((current) => current.filter((id) => id !== themeId));
    setExplicitRevealId((current) => (
      current === themeId ? undefined : current
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

  return (
    <>
      {revealTheme ? (
        <SportPilotUnlockReveal
          theme={revealTheme}
          onTry={tryTheme}
          onKeepCurrent={keepCurrentTheme}
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
