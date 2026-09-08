import { CircleHelp, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import type { CoachExplanation } from '@/domain/coach/coachExplanation';
import type { CoachNextReview } from '@/domain/coach/coachState';
import { BottomSheet } from '@/shared/ui/BottomSheet';
import { Button } from '@/shared/ui/Button';
import { formatLocalDate } from '@/shared/utils/dates';

const conditionLabels: Record<
  Extract<CoachNextReview, { type: 'condition' }>['condition'],
  string
> = {
  moreData: 'Lorsque davantage de données seront disponibles',
  foodTrackingImproved: 'Lorsque le suivi alimentaire sera suffisamment complet',
  temporaryContextResolved: 'Lorsque le contexte temporaire sera résolu',
  recoveryReassessed: 'Après réévaluation de la récupération',
};

function nextReviewLabel(nextReview: CoachNextReview): string {
  return nextReview.type === 'date'
    ? formatLocalDate(nextReview.date)
    : conditionLabels[nextReview.condition];
}

export function CoachExplanationPanel({
  explanation,
}: {
  explanation: CoachExplanation;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        className="mt-4 w-full sm:w-auto"
        variant="secondary"
        onClick={() => setOpen(true)}
      >
        <CircleHelp aria-hidden="true" className="size-4" />
        Comprendre cette décision
      </Button>

      <BottomSheet
        open={open}
        title="Comprendre la décision"
        description="Une lecture déterministe des éléments déjà retenus par le Coach."
        onClose={() => setOpen(false)}
      >
        <div className="space-y-5">
          <div className="rounded-2xl bg-[var(--sp-surface-muted)] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-[var(--sp-accent-primary)]">
              Décision actuelle
            </p>
            <p className="mt-1 font-bold text-[var(--sp-text-primary)]">
              {explanation.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
              {explanation.summary}
            </p>
            {explanation.confidence ? (
              <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
                <span className="font-bold text-[var(--sp-text-primary)]">Confiance : </span>
                {explanation.confidence.label}
              </p>
            ) : null}
          </div>

          <section aria-labelledby="coach-explanation-reasons-title">
            <h3 id="coach-explanation-reasons-title" className="font-bold text-[var(--sp-text-primary)]">
              Pourquoi cette décision ?
            </h3>
            {explanation.reasons.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
                {explanation.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
                Aucune raison fiable supplémentaire n’est disponible.
              </p>
            )}
          </section>

          <section aria-labelledby="coach-explanation-changes-title">
            <h3 id="coach-explanation-changes-title" className="font-bold text-[var(--sp-text-primary)]">
              Qu’est-ce qui a changé ?
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
              {explanation.comparison.summary}
            </p>
            {explanation.comparison.changes.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
                {explanation.comparison.changes.map((change) => <li key={change}>• {change}</li>)}
              </ul>
            ) : null}
          </section>

          <section aria-labelledby="coach-explanation-watch-title">
            <h3 id="coach-explanation-watch-title" className="font-bold text-[var(--sp-text-primary)]">
              Que dois-je surveiller ?
            </h3>
            {explanation.safety ? (
              <div
                className="mt-2 rounded-2xl bg-[var(--sp-surface-muted)] p-3"
                aria-label="Protection Safety active"
              >
                <p className="flex items-center gap-2 text-sm font-bold text-[var(--sp-text-primary)]">
                  <ShieldAlert aria-hidden="true" className="size-4 text-[var(--sp-accent-primary)]" />
                  {explanation.safety.title}
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
                  {explanation.safety.reasons.map((reason) => <li key={reason}>• {reason}</li>)}
                </ul>
              </div>
            ) : null}
            {explanation.watchPoints.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
                {explanation.watchPoints.map((point) => <li key={point}>• {point}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
                Aucun point supplémentaire n’est identifié dans la décision actuelle.
              </p>
            )}
            {explanation.blockingFactors.length > 0 ? (
              <div className="mt-3">
                <p className="text-sm font-bold text-[var(--sp-text-primary)]">Points bloquants</p>
                <ul className="mt-1 space-y-1 text-sm leading-6 text-[var(--sp-text-secondary)]">
                  {explanation.blockingFactors.map((factor) => <li key={factor}>• {factor}</li>)}
                </ul>
              </div>
            ) : null}
            {explanation.nextReview ? (
              <p className="mt-3 text-sm leading-6 text-[var(--sp-text-secondary)]">
                <span className="font-bold text-[var(--sp-text-primary)]">Prochaine revue : </span>
                {nextReviewLabel(explanation.nextReview)}
              </p>
            ) : null}
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
