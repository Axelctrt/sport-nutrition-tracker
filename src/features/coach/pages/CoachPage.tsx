import { useProfile } from '@/app/providers/profile/useProfile';
import { CoachObjectiveCard, CoachPlanCard } from '@/features/coach/components/CoachPlanCard';
import { CoachPriorityCard } from '@/features/coach/components/CoachPriorityCard';
import { CoachReviewCard } from '@/features/coach/components/CoachReviewCard';
import { CoachSafetyCard } from '@/features/coach/components/CoachSafetyCard';
import { CoachVerdictCard } from '@/features/coach/components/CoachVerdictCard';
import { useCoachHub } from '@/features/coach/hooks/useCoachHub';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { toLocalDate } from '@/shared/utils/dates';

export function CoachPage() {
  const { profile } = useProfile();
  const hub = useCoachHub(toLocalDate(), profile);

  if (!profile) return null;

  return (
    <section className="min-w-0" aria-labelledby="coach-hub-title">
      <div>
        <p className="text-sm font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
          Vue transverse
        </p>
        <h1 id="coach-hub-title" className="mt-1 text-3xl font-bold tracking-tight text-[var(--sp-text-primary)]">
          Coach
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--sp-text-secondary)] sm:text-base">
          Retrouve ton verdict, ton plan actuel et les bilans déjà disponibles au même endroit.
        </p>
      </div>

      {hub.status === 'loading' || !hub.data ? (
        <PageSkeleton className="mt-5" variant="dashboard" />
      ) : null}

      {hub.status === 'error' ? (
        <InlineNotice className="mt-5" tone="error" title="Coach indisponible" role="alert">
          <p>{hub.errorMessage}</p>
          <Button className="mt-3" variant="secondary" onClick={() => void hub.refresh()}>
            Réessayer
          </Button>
        </InlineNotice>
      ) : null}

      {hub.status === 'ready' && hub.data ? (
        <div className="mt-5 space-y-6">
          <CoachVerdictCard verdict={hub.data.dailyVerdict} />
          <CoachObjectiveCard snapshot={hub.data} />
          <CoachPlanCard snapshot={hub.data} />
          <CoachSafetyCard snapshot={hub.data} />
          <div className="grid gap-3 lg:grid-cols-2">
            <CoachPriorityCard snapshot={hub.data} />
            <CoachReviewCard snapshot={hub.data} />
          </div>
        </div>
      ) : null}
    </section>
  );
}
