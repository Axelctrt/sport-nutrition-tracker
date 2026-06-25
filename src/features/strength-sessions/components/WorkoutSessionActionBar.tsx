import { CheckCircle2, CircleStop, Clock3 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { WorkoutSession } from '@/domain/models/strength';
import { Button } from '@/shared/ui/Button';
import { SaveStatus, type SaveStatusValue } from '@/shared/ui/SaveStatus';
import { StickyActionBar } from '@/shared/ui/StickyActionBar';

interface WorkoutSessionActionBarProps {
  session: WorkoutSession;
  saveStatus: SaveStatusValue;
  isPending: boolean;
  onFinish: () => void;
  onAbandon: () => void;
}

function elapsedMinutes(session: WorkoutSession, now: number): number {
  if (session.durationMinutes !== undefined) return session.durationMinutes;
  if (!session.startedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(session.startedAt).getTime()) / 60_000));
}

export function WorkoutSessionActionBar({
  session,
  saveStatus,
  isPending,
  onFinish,
  onAbandon,
}: WorkoutSessionActionBarProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const duration = useMemo(() => elapsedMinutes(session, now), [now, session]);

  return (
    <StickyActionBar>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-950 dark:text-white">
            <Clock3 aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />
            {duration} min
          </div>
          <SaveStatus status={saveStatus} className="mt-0.5" />
        </div>
        <Button
          variant="dangerGhost"
          size="sm"
          className="size-11 shrink-0 px-0"
          aria-label="Abandonner la séance"
          disabled={isPending}
          onClick={onAbandon}
        >
          <CircleStop aria-hidden="true" className="size-5" />
        </Button>
        <Button className="shrink-0" disabled={isPending} onClick={onFinish}>
          <CheckCircle2 aria-hidden="true" className="size-4" />
          Terminer
        </Button>
      </div>
    </StickyActionBar>
  );
}
