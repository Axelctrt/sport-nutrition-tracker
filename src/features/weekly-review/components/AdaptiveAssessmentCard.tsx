import {
  CalendarRange,
  Footprints,
  Ruler,
  Scale,
  ShieldCheck,
  Utensils,
} from 'lucide-react';
import { differenceInCalendarDays, parseISO } from 'date-fns';
import type {
  CalorieAdaptationAssessment,
  CalorieAdaptationConfidenceLevel,
  CalorieAdaptationDetectedState,
} from '@/domain/models/weeklyReview';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

const confidenceLabels: Record<CalorieAdaptationConfidenceLevel, string> = {
  insufficient: 'Données insuffisantes',
  uncertain: 'Tendance encore incertaine',
  usable: 'Tendance exploitable',
  reliable: 'Analyse fiable',
};

const stateLabels: Record<CalorieAdaptationDetectedState, string> = {
  insufficientData: 'Données insuffisantes',
  insufficientFoodTracking: 'Suivi alimentaire à renforcer',
  onTrack: 'Progression conforme',
  temporaryWaterVariation: 'Variation temporaire probable',
  possibleRecomposition: 'Recomposition probable',
  conflictingSignals: 'Signaux contradictoires',
  truePlateau: 'Plateau probable',
  targetTooHigh: 'Cible probablement trop élevée',
  targetTooLow: 'Cible probablement trop faible',
  excessiveLoss: 'Perte plus rapide que prévu',
  excessiveGain: 'Prise plus rapide que prévu',
  activityBelowExpected: 'Activité inférieure aux prévisions',
  degradedRecovery: 'Récupération dégradée',
};

function formatSigned(value: number | undefined, unit: string): string {
  if (value === undefined) return 'Non disponible';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} ${unit}`;
}

export function AdaptiveAssessmentCard({
  assessment,
}: {
  assessment: CalorieAdaptationAssessment;
}) {
  const windowDays = differenceInCalendarDays(
    parseISO(assessment.analysisEnd),
    parseISO(assessment.analysisStart),
  ) + 1;
  const metrics = [
    {
      label: 'Tendance du poids',
      value: formatSigned(assessment.weightTrendKgPerWeek, 'kg/sem.'),
      detail: `${assessment.weighInCount} pesée(s)`,
      icon: Scale,
    },
    {
      label: 'Tour de taille',
      value: formatSigned(assessment.waistTrendCmPerWeek, 'cm/sem.'),
      detail: assessment.waistTrendCmPerWeek === undefined
        ? 'Mesure facultative'
        : 'Tendance observée',
      icon: Ruler,
    },
    {
      label: 'Journal complet',
      value: `${assessment.completedFoodDays} j`,
      detail: `${assessment.comparableFoodDays} jour(s) comparables`,
      icon: Utensils,
    },
    {
      label: 'Pas réels / attendus',
      value: assessment.actualToExpectedStepsPercent === undefined
        ? 'Non disponible'
        : `${assessment.actualToExpectedStepsPercent} %`,
      detail: `${assessment.recordedStepDays} jour(s) enregistrés`,
      icon: Footprints,
    },
  ];

  return (
    <Card className="overflow-hidden" aria-labelledby="adaptive-assessment-title">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-700 dark:text-brand-300">
              <CalendarRange aria-hidden="true" className="size-4" />
              Fenêtre de {windowDays} jours
            </div>
            <h2 id="adaptive-assessment-title" className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {stateLabels[assessment.detectedState]}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {assessment.reasons[0]}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <ShieldCheck aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-300" />
            <span className="hidden sm:inline">
              {confidenceLabels[assessment.confidence.level]}
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:hidden">
          {confidenceLabels[assessment.confidence.level]}
        </p>
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Du {formatLocalDate(assessment.analysisStart)} au {formatLocalDate(assessment.analysisEnd)}
          {' · '}{assessment.trackingSpanDays} jour(s) suivis
        </p>
      </div>

      <dl className="grid grid-cols-2 divide-x divide-y divide-slate-200 dark:divide-slate-800 sm:grid-cols-4 sm:divide-y-0">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 p-3.5 sm:p-4">
            <metric.icon aria-hidden="true" className="size-4 text-slate-500 dark:text-slate-400" />
            <dt className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
              {metric.label}
            </dt>
            <dd className="mt-1 text-base font-bold tabular-nums text-slate-950 dark:text-white">
              {metric.value}
            </dd>
            <p className="mt-1 text-xs leading-4 text-slate-500 dark:text-slate-400">
              {metric.detail}
            </p>
          </div>
        ))}
      </dl>

      {assessment.reasons.length > 1 || assessment.blockingFactors.length > 0 ? (
        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
          {assessment.reasons.length > 1 ? (
            <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
              {assessment.reasons.slice(1).map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          ) : null}
          {assessment.blockingFactors.length > 0 ? (
            <div className="mt-3 border-l-2 border-amber-400 pl-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Pourquoi la cible reste inchangée
              </p>
              <ul className="mt-1 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                {assessment.blockingFactors.map((factor) => (
                  <li key={factor}>• {factor}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
