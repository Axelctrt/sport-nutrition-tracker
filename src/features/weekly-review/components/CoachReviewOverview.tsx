import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import type { CoachReviewSnapshot } from '@/domain/coach/coachReview';
import {
  canAcceptCoachWeeklyReview,
  COACH_REVIEW_CONFIDENCE_LABELS,
  COACH_REVIEW_STRENGTH_LABELS,
} from '@/domain/coach/coachReview';
import type { CoachNextReview } from '@/domain/coach/coachState';
import type { WeeklyReview } from '@/domain/models/weeklyReview';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

interface CoachReviewOverviewProps {
  snapshot: CoachReviewSnapshot;
  review: WeeklyReview;
  actionStatus: 'idle' | 'accepting' | 'rejecting';
  onAccept: () => void;
  onReject: () => void;
}

const nextReviewConditionLabels: Record<
  Extract<CoachNextReview, { type: 'condition' }>['condition'],
  string
> = {
  moreData: 'Lorsque davantage de données seront disponibles',
  foodTrackingImproved: 'Lorsque le suivi alimentaire sera suffisamment complet',
  temporaryContextResolved: 'Lorsque le contexte temporaire sera résolu',
  recoveryReassessed: 'Après réévaluation de la récupération',
};

function formatSignedValue(value: number | undefined, unit: string): string {
  if (value === undefined) return 'Non disponible';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
}

function formatUnsignedValue(value: number | undefined, unit: string): string {
  if (value === undefined) return 'Non disponible';
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ${unit}`;
}

function formatAdjustment(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR')} kcal/j`;
}

function nextReviewLabel(nextReview: CoachNextReview): string {
  return nextReview.type === 'date'
    ? formatLocalDate(nextReview.date)
    : nextReviewConditionLabels[nextReview.condition];
}

function SignalCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="font-semibold text-slate-950 dark:text-white">{title}</h3>
      <div className="mt-2 space-y-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
        {children}
      </div>
    </section>
  );
}

export function CoachReviewOverview({
  snapshot,
  review,
  actionStatus,
  onAccept,
  onReject,
}: CoachReviewOverviewProps) {
  const canAccept = canAcceptCoachWeeklyReview(snapshot, review);
  const candidate = snapshot.plan.proposedNutritionAdjustmentKcal;
  return (
    <div className="mt-5 space-y-4">
      <Card className="p-4 sm:p-5" aria-labelledby="coach-observed-week-title">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Semaine observée
        </p>
        <h2 id="coach-observed-week-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
          Du {formatLocalDate(snapshot.period.weekStart)} au {formatLocalDate(snapshot.period.weekEnd)}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Tendance Coach analysée du {formatLocalDate(snapshot.calorieAssessment.analysisStart)} au {formatLocalDate(snapshot.calorieAssessment.analysisEnd)}.
        </p>
      </Card>

      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-5" aria-labelledby="coach-diagnostic-title">
          <h2 id="coach-diagnostic-title" className="text-lg font-bold text-slate-950 dark:text-white">Diagnostic</h2>
          <p className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-100">
            {snapshot.diagnostic.label}
          </p>
        </Card>
        <Card className="min-w-0 p-4 sm:p-5" aria-labelledby="coach-confidence-title">
          <h2 id="coach-confidence-title" className="text-lg font-bold text-slate-950 dark:text-white">Confiance</h2>
          <p className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-100">
            {COACH_REVIEW_CONFIDENCE_LABELS[snapshot.confidence.level]}
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Score global {snapshot.confidence.overall}/100
          </p>
        </Card>
      </div>

      <Card className="p-4 sm:p-5" aria-labelledby="coach-reasons-title">
        <h2 id="coach-reasons-title" className="text-lg font-bold text-slate-950 dark:text-white">Pourquoi</h2>
        {snapshot.primaryReasons.length > 0 ? (
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700 dark:text-slate-200">
            {snapshot.primaryReasons.map((reason) => <li key={reason}>• {reason}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Les données disponibles ne permettent pas encore de détailler davantage le diagnostic.
          </p>
        )}
      </Card>

      <section aria-labelledby="coach-signals-title">
        <h2 id="coach-signals-title" className="text-lg font-bold text-slate-950 dark:text-white">Signaux</h2>
        <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <SignalCard title="Corps">
            <p>Poids : {formatSignedValue(snapshot.signals.body.weightTrendKgPerWeek, 'kg/semaine')}</p>
            <p>Tour de taille : {formatSignedValue(snapshot.signals.body.waistTrendCmPerWeek, 'cm/semaine')}</p>
            <p>{snapshot.signals.body.weighInCount} pesée(s) qualifiée(s)</p>
          </SignalCard>
          <SignalCard title="Nutrition">
            <p>Écart calorique : {formatSignedValue(snapshot.signals.nutrition.averageCalorieDeviationPercent, '%')}</p>
            <p>Adhérence protéines : {formatUnsignedValue(snapshot.signals.nutrition.proteinAdherencePercent, '%')}</p>
            <p>{snapshot.signals.nutrition.completedFoodDays} journée(s) complète(s)</p>
            <p>{snapshot.signals.nutrition.comparableFoodDays} journée(s) comparable(s)</p>
          </SignalCard>
          <SignalCard title="Activité">
            <p>Niveau réel/attendu : {formatUnsignedValue(snapshot.signals.activity.actualToExpectedStepsPercent, '%')}</p>
            <p>{snapshot.signals.activity.recordedStepDays} journée(s) enregistrée(s)</p>
          </SignalCard>
          <SignalCard title="Récupération">
            <p>{snapshot.signals.recovery.signalDays > 0
              ? `${snapshot.signals.recovery.signalDays} journée(s) avec signal qualifié`
              : 'Aucun signal qualifié disponible'}</p>
            <p>{snapshot.signals.recovery.concernDays} journée(s) à surveiller</p>
          </SignalCard>
          <SignalCard title="Performance musculation">
            <p>{COACH_REVIEW_STRENGTH_LABELS[snapshot.signals.strength.context]}</p>
            <p>{snapshot.signals.strength.exploitableExerciseCount} exercice(s) exploitable(s)</p>
          </SignalCard>
        </div>
      </section>

      <Card className="p-4 sm:p-5" aria-labelledby="coach-decision-title">
        <h2 id="coach-decision-title" className="text-lg font-bold text-slate-950 dark:text-white">Décision du Coach</h2>
        <p className="mt-2 text-xl font-bold text-slate-950 dark:text-white">{snapshot.plan.label}</p>
      </Card>

      <Card className="p-4 sm:p-5" aria-labelledby="coach-plan-title">
        <h2 id="coach-plan-title" className="text-lg font-bold text-slate-950 dark:text-white">Plan de la prochaine période</h2>
        <p className="mt-2 font-semibold text-slate-800 dark:text-slate-100">{snapshot.plan.label}</p>
        {candidate !== undefined && candidate !== 0 ? (
          <p className="mt-2 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">
            Ajuster la cible de {formatAdjustment(candidate)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Aucun changement durable à accepter pour cette période.
          </p>
        )}
        {canAccept ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button className="w-full" onClick={onAccept} disabled={actionStatus !== 'idle'}>
              <Check aria-hidden="true" className="size-4" />
              {actionStatus === 'accepting' ? 'Application…' : 'Accepter'}
            </Button>
            <Button className="w-full" variant="secondary" onClick={onReject} disabled={actionStatus !== 'idle'}>
              <X aria-hidden="true" className="size-4" />
              {actionStatus === 'rejecting' ? 'Enregistrement…' : 'Refuser'}
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="p-4 sm:p-5" aria-labelledby="coach-next-review-title">
        <h2 id="coach-next-review-title" className="text-lg font-bold text-slate-950 dark:text-white">Réévaluation</h2>
        <p className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
          {nextReviewLabel(snapshot.nextReview)}
        </p>
      </Card>
    </div>
  );
}
