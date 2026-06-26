import {
  Apple,
  BarChart3,
  CalendarCheck,
  Check,
  Footprints,
  Scale,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import type {
  AdherenceLevel,
  WeeklyCalibrationDecision,
  WeeklyReviewDecisionStatus,
} from '@/domain/models/weeklyReview';
import { getDefaultWeeklyReviewReferenceDate } from '@/domain/reviews/weeklyReview';
import { CalibrationAdjustmentCard } from '@/features/weekly-review/components/CalibrationAdjustmentCard';
import { WeeklyReviewHistoryCard } from '@/features/weekly-review/components/WeeklyReviewHistoryCard';
import { WeeklyReviewSummary } from '@/features/weekly-review/components/WeeklyReviewSummary';
import { useWeeklyReview } from '@/features/weekly-review/hooks/useWeeklyReview';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';

const adherenceLabels: Record<AdherenceLevel, string> = {
  excellent: 'Excellent',
  good: 'Bon',
  needsStrengthening: 'À renforcer',
  insufficient: 'Insuffisant',
};

const decisionLabels: Record<WeeklyCalibrationDecision, string> = {
  keep: 'Conserver la cible',
  increase: 'Augmenter la cible',
  decrease: 'Diminuer la cible',
};

const statusLabels: Record<WeeklyReviewDecisionStatus, string> = {
  pending: 'Décision à prendre',
  accepted: 'Proposition acceptée',
  rejected: 'Proposition refusée',
  notEligible: 'Calibration non proposée',
};

function formatSigned(value: number | undefined, unit: string): string {
  if (value === undefined) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${unit}`;
}

export function WeeklyReviewPage() {
  const { profile } = useProfile();
  const [referenceDate, setReferenceDate] = useState(
    getDefaultWeeklyReviewReferenceDate(toLocalDate()),
  );
  const { data, status, actionStatus, errorMessage, refresh, accept, reject } = useWeeklyReview(
    referenceDate,
    profile,
  );

  const matchingAdjustment = useMemo(() => {
    if (!data) return undefined;
    return data.adjustments.find((adjustment) => adjustment.weeklyReviewId === data.review.id);
  }, [data]);

  if (!profile) return null;

  return (
    <section className="min-w-0" aria-labelledby="weekly-review-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Pilotage hebdomadaire
        </p>
        <h1 id="weekly-review-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Bilan hebdomadaire
        </h1>
        <p className="mt-2 hidden max-w-3xl text-slate-600 dark:text-slate-300 sm:block">
          Vérifie la proposition, puis consulte les détails uniquement lorsqu’ils sont utiles.
        </p>
      </div>

      <Card className="mt-5 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-end">
          <div className="min-w-0">
            <label htmlFor="weekly-review-date" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              Semaine à analyser
            </label>
            <input
              id="weekly-review-date"
              type="date"
              value={referenceDate}
              onChange={(event) => setReferenceDate(event.target.value)}
              className={`${inputClassName} mt-2`}
            />
          </div>
          <div className="sm:flex sm:justify-end">
            <Link
              to={routePaths.analytics}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 sm:w-auto"
            >
              <BarChart3 aria-hidden="true" className="size-4" />
              Analyses sur 12 semaines
            </Link>
          </div>
        </div>
      </Card>

      {errorMessage ? (
        <InlineNotice className="mt-5" tone="error" title="Bilan indisponible" role="alert">
          <p>{errorMessage}</p>
          {status === 'error' ? (
            <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>
              Réessayer
            </Button>
          ) : null}
        </InlineNotice>
      ) : null}

      {status === 'loading' || !data ? <PageSkeleton className="mt-5" variant="dashboard" /> : null}

      {status === 'ready' && data ? (
        <>
          <InlineNotice
            className="mt-5"
            tone={data.review.isCalibrationEligible ? 'success' : 'info'}
            title={`Du ${formatLocalDate(data.review.weekStart)} au ${formatLocalDate(data.review.weekEnd)}`}
          >
            {data.review.isCalibrationEligible
              ? 'Les données minimales sont suffisantes pour produire une proposition contrôlée.'
              : 'Le suivi reste utile, mais les données sont insuffisantes pour modifier la cible calorique.'}
          </InlineNotice>

          <Card className="mt-4 p-4 sm:p-5" aria-labelledby="weekly-decision-title">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-700 dark:text-brand-300">Décision prioritaire</p>
                <h2 id="weekly-decision-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
                  Proposition calorique
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {statusLabels[data.review.decisionStatus]}
                </p>
              </div>
              <CalendarCheck aria-hidden="true" className="size-6 shrink-0 text-brand-700 dark:text-brand-300" />
            </div>

            {data.review.isCalibrationEligible ? (
              <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/60 sm:p-5">
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {decisionLabels[data.review.proposedDecision]}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-slate-950 dark:text-white sm:text-4xl">
                  {data.review.proposedAdjustmentKcal === 0
                    ? '0 kcal/j'
                    : formatSigned(data.review.proposedAdjustmentKcal, 'kcal/j')}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Cumul actuel</p>
                    <p className="mt-1 font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {formatSigned(data.review.currentCumulativeAdjustmentKcal, 'kcal/j')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Après acceptation</p>
                    <p className="mt-1 font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                      {formatSigned(data.review.resultingCumulativeAdjustmentKcal, 'kcal/j')}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <ul className="mt-4 space-y-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-950/60 dark:text-slate-200">
                {data.review.ineligibilityReasons.map((reason) => (
                  <li key={reason} className="flex gap-2">
                    <span aria-hidden="true">•</span><span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}

            {data.review.decisionStatus === 'pending' && data.review.isCalibrationEligible ? (
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button className="w-full" onClick={() => void accept()} disabled={actionStatus !== 'idle'}>
                  <Check aria-hidden="true" className="size-4" />
                  {actionStatus === 'accepting' ? 'Application…' : 'Accepter la proposition'}
                </Button>
                <Button className="w-full" variant="secondary" onClick={() => void reject()} disabled={actionStatus !== 'idle'}>
                  <X aria-hidden="true" className="size-4" />
                  {actionStatus === 'rejecting' ? 'Enregistrement…' : 'Refuser'}
                </Button>
              </div>
            ) : null}

            {data.review.decisionStatus === 'accepted' ? (
              <InlineNotice className="mt-4" tone="success" title="Décision enregistrée">
                {matchingAdjustment
                  ? `L’ajustement de ${formatSigned(matchingAdjustment.adjustmentKcalPerDay, 'kcal/j')} est applicable à partir du ${formatLocalDate(matchingAdjustment.effectiveFrom)}.`
                  : 'La cible est conservée sans ajustement supplémentaire.'}
              </InlineNotice>
            ) : null}

            {data.review.decisionStatus === 'rejected' ? (
              <InlineNotice className="mt-4" title="Proposition refusée">
                Aucun ajustement n’a été appliqué pour cette semaine.
              </InlineNotice>
            ) : null}
          </Card>

          <div className="mt-4">
            <WeeklyReviewSummary review={data.review} />
          </div>

          <div className="mt-4 space-y-3">
            <CollapsibleSection
              title="Détail de l’adhérence"
              description={adherenceLabels[data.review.adherenceLevel]}
              summary={`${data.review.adherenceScore}/100`}
              defaultOpen={!data.review.isCalibrationEligible}
            >
              <div className="space-y-3">
                {[
                  { label: 'Journées alimentaires terminées', value: `${data.review.completedFoodDays}/7`, icon: Apple },
                  { label: 'Objectif protéines atteint', value: `${data.review.proteinTargetDays}/${Math.max(1, data.review.completedFoodDays)}`, icon: Check },
                  { label: 'Objectif de pas atteint', value: `${data.review.stepGoalDays}/7`, icon: Footprints },
                  { label: 'Pesées', value: `${data.review.weighInCount}/3 minimum`, icon: Scale },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/60">
                    <div className="flex min-w-0 items-center gap-3">
                      <item.icon aria-hidden="true" className="size-5 shrink-0 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                    </div>
                    <strong className="shrink-0 tabular-nums text-slate-950 dark:text-white">{item.value}</strong>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">
                Écart calorique moyen : {data.review.calorieDeviationPercent?.toLocaleString('fr-FR') ?? '—'} %. Correction brute calculée : {formatSigned(data.review.rawProposedAdjustmentKcal, 'kcal/j')}.
              </p>
            </CollapsibleSection>

            {data.adjustments.length > 0 ? (
              <CollapsibleSection
                title="Ajustements acceptés"
                description="Historique des changements de cible"
                summary={data.adjustments.length}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {[...data.adjustments].reverse().map((adjustment) => (
                    <CalibrationAdjustmentCard key={adjustment.id} adjustment={adjustment} />
                  ))}
                </div>
              </CollapsibleSection>
            ) : null}

            <CollapsibleSection
              title="Historique des bilans"
              description="Semaines déjà calculées"
              summary={data.reviews.length}
            >
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {data.reviews.map((review) => (
                  <WeeklyReviewHistoryCard key={review.id} review={review} />
                ))}
              </div>
            </CollapsibleSection>
          </div>
        </>
      ) : null}
    </section>
  );
}
