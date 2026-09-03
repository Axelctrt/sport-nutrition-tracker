import { ShieldCheck } from 'lucide-react';
import type { CoachHubSnapshot } from '@/domain/coach/coachHub';
import { Card } from '@/shared/ui/Card';

export function CoachSafetyCard({ snapshot }: { snapshot: CoachHubSnapshot }) {
  const assessment = snapshot.safetyAssessment;
  if (!assessment || assessment.status === 'clear') return null;

  const blocked = assessment.status === 'doNotIntensify';
  return (
    <Card padding="md" aria-labelledby="coach-hub-safety-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-accent-primary)]">
          <ShieldCheck aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
            {blocked ? 'Sécurité Coach' : 'Point à surveiller'}
          </p>
          <h2 id="coach-hub-safety-title" className="mt-1 text-xl font-bold text-[var(--sp-text-primary)]">
            {blocked
              ? 'Pas d’intensification pour le moment.'
              : 'Un signal mérite d’être surveillé.'}
          </h2>
          <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
            {assessment.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        </div>
      </div>
    </Card>
  );
}
