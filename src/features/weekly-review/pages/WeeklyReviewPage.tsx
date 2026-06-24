import {
  Apple,
  CalendarCheck,
  Check,
  Footprints,
  Scale,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useProfile } from '@/app/providers/profile/useProfile';
import type {
  AdherenceLevel,
  WeeklyCalibrationDecision,
  WeeklyReviewDecisionStatus,
} from '@/domain/models/weeklyReview';
import { getDefaultWeeklyReviewReferenceDate } from '@/domain/reviews/weeklyReview';
import { useWeeklyReview } from '@/features/weekly-review/hooks/useWeeklyReview';
import { inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
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

function ReviewMetric({ label, value, detail, icon: Icon }: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Scale;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
      </div>
    </Card>
  );
}

export function WeeklyReviewPage() {
  const { profile } = useProfile();
  const [referenceDate, setReferenceDate] = useState(
    getDefaultWeeklyReviewReferenceDate(toLocalDate()),
  );
  const { data, status, actionStatus, errorMessage, accept, reject } = useWeeklyReview(
    referenceDate,
    profile,
  );

  const matchingAdjustment = useMemo(() => {
    if (!data) return undefined;
    return data.adjustments.find((adjustment) => adjustment.weeklyReviewId === data.review.id);
  }, [data]);

  if (!profile) return null;

  return (
    <section aria-labelledby="weekly-review-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Pilotage hebdomadaire
          </p>
          <h1 id="weekly-review-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
            Bilan hebdomadaire
          </h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
            La proposition s’appuie sur le poids moyen et l’adhérence réelle. Elle n’est jamais appliquée automatiquement.
          </p>
        </div>
        <div>
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
      </div>

      {errorMessage ? (
        <InlineNotice className="mt-6" tone="error" title="Bilan indisponible" role="alert">
          {errorMessage}
        </InlineNotice>
      ) : null}

      {status === 'loading' || !data ? (
        <div className="py-16 text-center" role="status">
          <p className="font-semibold text-slate-700 dark:text-slate-200">Calcul du bilan…</p>
        </div>
      ) : (
        <>
          <InlineNotice
            className="mt-6"
            tone={data.review.isCalibrationEligible ? 'success' : 'info'}
            title={`Du ${formatLocalDate(data.review.weekStart)} au ${formatLocalDate(data.review.weekEnd)}`}
          >
            {data.review.isCalibrationEligible
              ? 'Les données minimales sont suffisantes pour produire une proposition contrôlée.'
              : 'Le suivi reste utile, mais les données sont insuffisantes pour modifier la cible calorique.'}
          </InlineNotice>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReviewMetric
              label="Poids moyen"
              value={data.review.averageWeightKg === undefined ? '—' : `${data.review.averageWeightKg.toLocaleString('fr-FR')} kg`}
              detail={`${data.review.weighInCount} pesée(s), semaine précédente ${data.review.previousAverageWeightKg?.toLocaleString('fr-FR') ?? '—'} kg`}
              icon={Scale}
            />
            <ReviewMetric
              label="Évolution réelle"
              value={formatSigned(data.review.actualWeightChangeKg, 'kg')}
              detail={`Évolution visée : ${formatSigned(data.review.targetWeightChangeKg, 'kg')}`}
              icon={data.review.actualWeightChangeKg !== undefined && data.review.actualWeightChangeKg > 0 ? TrendingUp : TrendingDown}
            />
            <ReviewMetric
              label="Adhérence calorique"
              value={data.review.calorieAdherencePercent === undefined ? '—' : `${data.review.calorieAdherencePercent.toLocaleString('fr-FR')} %`}
              detail={`${data.review.calorieComparableDays} journée(s) comparables, écart moyen ${data.review.calorieDeviationPercent?.toLocaleString('fr-FR') ?? '—'} %`}
              icon={Apple}
            />
            <ReviewMetric
              label="Score d’adhérence"
              value={`${data.review.adherenceScore}/100`}
              detail={adherenceLabels[data.review.adherenceLevel]}
              icon={ShieldCheck}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950 dark:text-white">Proposition calorique</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{statusLabels[data.review.decisionStatus]}</p>
                </div>
                <CalendarCheck aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" />
              </div>

              {data.review.isCalibrationEligible ? (
                <div className="mt-5 rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {decisionLabels[data.review.proposedDecision]}
                  </p>
                  <p className="mt-2 text-4xl font-bold text-slate-950 dark:text-white">
                    {data.review.proposedAdjustmentKcal === 0
                      ? '0 kcal/j'
                      : formatSigned(data.review.proposedAdjustmentKcal, 'kcal/j')}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Cumul actuel : {formatSigned(data.review.currentCumulativeAdjustmentKcal, 'kcal/j')} · cumul après acceptation : {formatSigned(data.review.resultingCumulativeAdjustmentKcal, 'kcal/j')}.
                  </p>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Correction brute calculée : {formatSigned(data.review.rawProposedAdjustmentKcal, 'kcal/j')}. La proposition est plafonnée par les paramètres avancés.
                  </p>
                </div>
              ) : (
                <ul className="mt-5 space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {data.review.ineligibilityReasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <span aria-hidden="true">•</span><span>{reason}</span>
                    </li>
                  ))}
                </ul>
              )}

              {data.review.decisionStatus === 'pending' && data.review.isCalibrationEligible ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={() => void accept()} disabled={actionStatus !== 'idle'}>
                    <Check aria-hidden="true" className="size-4" />
                    {actionStatus === 'accepting' ? 'Application…' : 'Accepter la proposition'}
                  </Button>
                  <Button variant="secondary" onClick={() => void reject()} disabled={actionStatus !== 'idle'}>
                    <X aria-hidden="true" className="size-4" />
                    {actionStatus === 'rejecting' ? 'Enregistrement…' : 'Refuser'}
                  </Button>
                </div>
              ) : null}

              {data.review.decisionStatus === 'accepted' ? (
                <InlineNotice className="mt-5" tone="success" title="Décision enregistrée">
                  {matchingAdjustment
                    ? `L’ajustement de ${formatSigned(matchingAdjustment.adjustmentKcalPerDay, 'kcal/j')} est applicable à partir du ${formatLocalDate(matchingAdjustment.effectiveFrom)}.`
                    : 'La cible est conservée sans ajustement supplémentaire.'}
                </InlineNotice>
              ) : null}

              {data.review.decisionStatus === 'rejected' ? (
                <InlineNotice className="mt-5" title="Proposition refusée">
                  Aucun ajustement n’a été appliqué pour cette semaine.
                </InlineNotice>
              ) : null}
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Détail de l’adhérence</h2>
              <div className="mt-5 space-y-4">
                {[
                  { label: 'Journées alimentaires terminées', value: `${data.review.completedFoodDays}/7`, icon: Apple },
                  { label: 'Objectif protéines atteint', value: `${data.review.proteinTargetDays}/${Math.max(1, data.review.completedFoodDays)}`, icon: Check },
                  { label: 'Objectif de pas atteint', value: `${data.review.stepGoalDays}/7`, icon: Footprints },
                  { label: 'Pesées', value: `${data.review.weighInCount}/3 minimum`, icon: Scale },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4 last:border-0 last:pb-0 dark:border-slate-800">
                    <div className="flex items-center gap-3">
                      <item.icon aria-hidden="true" className="size-5 text-slate-500" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                    </div>
                    <strong className="text-slate-950 dark:text-white">{item.value}</strong>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {data.adjustments.length > 0 ? (
            <Card className="mt-6 p-6">
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Historique des ajustements acceptés</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className="text-slate-500 dark:text-slate-400">
                    <tr><th className="pb-3">Application</th><th className="pb-3">Variation</th><th className="pb-3">Cumul résultant</th><th className="pb-3">Statut</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...data.adjustments].reverse().map((adjustment) => (
                      <tr key={adjustment.id}>
                        <td className="py-3 font-medium">{formatLocalDate(adjustment.effectiveFrom)}</td>
                        <td>{formatSigned(adjustment.adjustmentKcalPerDay, 'kcal/j')}</td>
                        <td>{formatSigned(adjustment.resultingCumulativeAdjustmentKcal, 'kcal/j')}</td>
                        <td>{adjustment.status === 'active' ? 'Actif' : 'Révoqué'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          <Card className="mt-6 p-6">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Historique des bilans</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="pb-3">Semaine</th><th className="pb-3">Score</th><th className="pb-3">Évolution</th><th className="pb-3">Proposition</th><th className="pb-3">Décision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.reviews.map((review) => (
                    <tr key={review.id}>
                      <td className="py-3 font-medium">{formatLocalDate(review.weekStart, 'd MMM')} – {formatLocalDate(review.weekEnd, 'd MMM yyyy')}</td>
                      <td>{review.adherenceScore}/100</td>
                      <td>{formatSigned(review.actualWeightChangeKg, 'kg')}</td>
                      <td>{formatSigned(review.proposedAdjustmentKcal, 'kcal/j')}</td>
                      <td>{statusLabels[review.decisionStatus]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </section>
  );
}
