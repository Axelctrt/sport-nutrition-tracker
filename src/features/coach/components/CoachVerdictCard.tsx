import { Sparkles } from 'lucide-react';
import type { CoachHubDailyVerdict } from '@/domain/coach/coachHub';
import { Card } from '@/shared/ui/Card';

export function CoachVerdictCard({
  verdict,
}: {
  verdict: CoachHubDailyVerdict;
}) {
  const title = verdict.status === 'available'
    ? verdict.result.title
    : verdict.status === 'checkInRequired'
      ? 'Verdict après check-in'
      : 'Verdict indisponible';
  const message = verdict.status === 'available'
    ? verdict.result.message
    : verdict.status === 'checkInRequired'
      ? 'Effectue ton check-in pour obtenir ton verdict du jour.'
      : 'Le verdict du jour ne peut pas être chargé. Tes autres données restent disponibles.';

  return (
    <Card padding="md" aria-labelledby="coach-hub-verdict-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-accent-primary)]">
          <Sparkles aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
            Verdict du jour
          </p>
          <h2 id="coach-hub-verdict-title" className="mt-1 text-xl font-bold text-[var(--sp-text-primary)]">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
            {message}
          </p>
        </div>
      </div>
    </Card>
  );
}
