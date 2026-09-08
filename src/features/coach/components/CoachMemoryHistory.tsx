import { History } from 'lucide-react';
import type { CoachDecisionMemoryRecord } from '@/domain/coach/coachMemory';
import { COACH_REVIEW_ACTION_LABELS } from '@/domain/coach/coachReview';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

const statusLabels: Record<CoachDecisionMemoryRecord['status'], string> = {
  maintained: 'Plan maintenu',
  accepted: 'Proposition acceptée',
  rejected: 'Proposition refusée',
  blocked: 'Proposition non applicable',
};

const outcomeLabels: Record<NonNullable<CoachDecisionMemoryRecord['observedOutcome']>['type'], string> = {
  progressOnTrack: 'Progression conforme',
  trendImproved: 'Tendance améliorée',
  trendUnchanged: 'Tendance inchangée',
  insufficientData: 'Données insuffisantes pour conclure',
};

export function CoachMemoryHistory({
  memories,
}: {
  memories: readonly CoachDecisionMemoryRecord[];
}) {
  return (
    <section aria-labelledby="coach-memory-title">
      <h2 id="coach-memory-title" className="flex items-center gap-2 text-xl font-bold text-[var(--sp-text-primary)]">
        <History aria-hidden="true" className="size-5 text-[var(--sp-accent-primary)]" />
        Historique des décisions
      </h2>
      {memories.length === 0 ? (
        <Card className="mt-3" padding="md">
          <p className="text-sm leading-6 text-[var(--sp-text-secondary)]">
            Aucune décision Coach mémorisée pour le moment.
          </p>
        </Card>
      ) : (
        <ol className="mt-3 grid gap-3 lg:grid-cols-2">
          {memories.map((memory) => (
            <li key={memory.id} className="min-w-0">
              <Card padding="md" className="h-full">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
                      {memory.phase.label}
                    </p>
                    <h3 className="mt-1 font-bold text-[var(--sp-text-primary)]">
                      {COACH_REVIEW_ACTION_LABELS[memory.primaryAction]}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[var(--sp-surface-raised)] px-3 py-1 text-xs font-semibold text-[var(--sp-text-secondary)]">
                    {statusLabels[memory.status]}
                  </span>
                </div>
                <p className="mt-3 text-xs text-[var(--sp-text-muted)]">
                  Semaine du {formatLocalDate(memory.period.weekStart)} au {formatLocalDate(memory.period.weekEnd)}
                </p>
                {memory.reasons[0] ? (
                  <p className="mt-2 break-words text-sm leading-6 text-[var(--sp-text-secondary)]">
                    {memory.reasons[0]}
                  </p>
                ) : null}
                {memory.observedOutcome ? (
                  <p className="mt-3 text-sm font-semibold text-[var(--sp-text-primary)]">
                    Résultat observé : {outcomeLabels[memory.observedOutcome.type]}
                  </p>
                ) : null}
              </Card>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
