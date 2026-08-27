import {
  Apple,
  BarChart3,
  Check,
  Footprints,
  Scale,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProfile } from '@/app/providers/profile/useProfile';
import { routePaths } from '@/app/routePaths';
import type { AdherenceLevel } from '@/domain/models/weeklyReview';
import { getDefaultWeeklyReviewReferenceDate } from '@/domain/reviews/weeklyReview';
import { AdaptiveAssessmentCard } from '@/features/weekly-review/components/AdaptiveAssessmentCard';
import { CalibrationAdjustmentCard } from '@/features/weekly-review/components/CalibrationAdjustmentCard';
import { CoachReviewOverview } from '@/features/weekly-review/components/CoachReviewOverview';
import { EnergyArchitectureDiagnostic } from '@/features/weekly-review/components/EnergyArchitectureDiagnostic';
import { WeeklyReviewHistoryCard } from '@/features/weekly-review/components/WeeklyReviewHistoryCard';
import { WeeklyReviewGuidance } from '@/features/weekly-review/components/WeeklyReviewGuidance';
import { WeeklyReviewSummary } from '@/features/weekly-review/components/WeeklyReviewSummary';
import { WeeklyTrainingSummary } from '@/features/weekly-review/components/WeeklyTrainingSummary';

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
          Synthèse hebdomadaire
        </p>
        <h1 id="weekly-review-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Bilan du Coach
        </h1>
        <p className="mt-2 hidden max-w-3xl text-slate-600 dark:text-slate-300 sm:block">
          Comprends le diagnostic, la décision et la priorité de la prochaine période.
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
          {data.coachReview ? (
            <CoachReviewOverview
              snapshot={data.coachReview}
              review={data.review}
              actionStatus={actionStatus}
              onAccept={() => void accept()}
              onReject={() => void reject()}
            />
          ) : (
            <InlineNotice className="mt-5" tone="error" title="Bilan Coach indisponible">
              {data.coachError ?? 'Le diagnostic Coach ne peut pas être calculé pour le moment.'}
              {' '}Les détails du suivi hebdomadaire restent disponibles ci-dessous. Aucun ajustement ne peut être appliqué.
            </InlineNotice>
          )}

          <div className="mt-4 space-y-3">
            <CollapsibleSection
              title="Détails du suivi hebdomadaire"
              description="Mesures, calibration et entraînement de la semaine"
              defaultOpen={!data.coachReview}
            >
              <div className="space-y-4">
                {data.review.adaptation ? (
                  <AdaptiveAssessmentCard assessment={data.review.adaptation} />
                ) : null}
                <WeeklyReviewSummary review={data.review} />
                {data.insights ? <WeeklyTrainingSummary insights={data.insights} /> : null}
                {data.review.decisionStatus === 'accepted' ? (
                  <InlineNotice tone="success" title="Calibration enregistrée">
                    {matchingAdjustment
                      ? `L’ajustement de ${formatSigned(matchingAdjustment.adjustmentKcalPerDay, 'kcal/j')} est applicable à partir du ${formatLocalDate(matchingAdjustment.effectiveFrom)}.`
                      : 'La cible a été conservée sans ajustement supplémentaire.'}
                  </InlineNotice>
                ) : null}
                {data.review.decisionStatus === 'rejected' ? (
                  <InlineNotice title="Calibration refusée">
                    Aucun ajustement n’a été appliqué pour cette semaine.
                  </InlineNotice>
                ) : null}
              </div>
            </CollapsibleSection>

            {data.insights ? (
              <CollapsibleSection
                title="Détails et repères de suivi"
                description="Réussites, points d’attention et raccourcis secondaires"
              >
                <WeeklyReviewGuidance insights={data.insights} />
              </CollapsibleSection>
            ) : null}
            {data.energyRetrospective ? (
              <EnergyArchitectureDiagnostic
                report={data.energyRetrospective}
              />
            ) : null}

            <CollapsibleSection
              title="Détail du score de suivi"
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
                Écart calorique moyen : {data.review.calorieDeviationPercent?.toLocaleString('fr-FR') ?? '—'} %. Indicateur brut fondé sur le poids : {formatSigned(data.review.rawProposedAdjustmentKcal, 'kcal/j')}. Cet indicateur ne décide jamais seul d’une correction.
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
              title="Historique des calibrations"
              description="Propositions caloriques déjà calculées"
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
