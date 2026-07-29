import { useEffect, useState } from "react";

import { routePaths } from '@/app/routePaths';
import { router } from '@/app/router';
import { rewardRevealContextIsSafe } from '@/app/rewards/rewardRevealContext';
import {
  observeWeeklyMissionCompletions,
  type WeeklyMissionCompletionErrorListener,
  type WeeklyMissionCompletionListener,
} from "@/application/rewards/weeklyMissionCompletionService";
import { SportPilotEventReveal } from '@/shared/ui/SportPilotEventReveal';

export type WeeklyMissionCompletionObserver = (
  onCompletion: WeeklyMissionCompletionListener,
  onError?: WeeklyMissionCompletionErrorListener,
) => () => void;

interface WeeklyMissionCompletionNotifierProps {
  observeCompletions?: WeeklyMissionCompletionObserver;
}

type CompletedWeek = NonNullable<Parameters<WeeklyMissionCompletionListener>[0]['newlyCompletedWeek']>;

export function WeeklyMissionCompletionNotifier({
  observeCompletions = observeWeeklyMissionCompletions,
}: WeeklyMissionCompletionNotifierProps) {
  const [pending, setPending] = useState<CompletedWeek>();
  const [pathname, setPathname] = useState(() => router.state.location.pathname);
  const [, setContextRevision] = useState(0);

  useEffect(() => router.subscribe((state) => setPathname(state.location.pathname)), []);

  useEffect(
    () =>
      observeCompletions(
        (snapshot) => {
          if (snapshot.newlyCompletedWeek) setPending(snapshot.newlyCompletedWeek);
        },
        () => undefined,
      ),
    [observeCompletions],
  );

  const contextSafe = rewardRevealContextIsSafe(pathname);

  useEffect(() => {
    if (!pending || contextSafe) return undefined;
    const timer = window.setInterval(() => setContextRevision((value) => value + 1), 300);
    return () => window.clearInterval(timer);
  }, [contextSafe, pending]);

  if (!pending || !contextSafe) return null;

  return (
    <SportPilotEventReveal
      eyebrow="Missions hebdomadaires"
      title="Semaine accomplie"
      description="Les cinq missions sont terminées. Cette semaine rejoint ton historique de régularité."
      metrics={[
        { label: 'Missions', value: '5 sur 5' },
        { label: 'Statut', value: 'Terminée' },
        { label: 'Semaine', value: pending.weekStart },
      ]}
      primaryLabel="Voir ma progression"
      onContinue={() => setPending(undefined)}
      onPrimary={() => {
        setPending(undefined);
        void router.navigate(routePaths.progression);
      }}
    />
  );
}
