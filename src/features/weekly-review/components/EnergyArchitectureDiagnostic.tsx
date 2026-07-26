import { FlaskConical, Scale, ShieldAlert } from 'lucide-react';
import {
  ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS,
  type EnergyArchitectureExclusionReason,
  type EnergyArchitectureRetrospectiveReport,
  type EnergyArchitectureRetrospectiveStatus,
} from '@/domain/calculations/energyArchitectureRetrospective';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice, type NoticeTone } from '@/shared/ui/InlineNotice';
import { ProgressBar } from '@/shared/ui/ProgressBar';

const statusContent: Record<
  EnergyArchitectureRetrospectiveStatus,
  {
    label: string;
    title: string;
    description: string;
    tone: NoticeTone;
  }
> = {
  insufficientData: {
    label: 'Données à compléter',
    title: 'Comparaison encore impossible',
    description:
      'La couverture ne permet pas encore de comparer les deux estimations avec suffisamment de recul.',
    tone: 'info',
  },
  candidateSupported: {
    label: 'Signal favorable au candidat',
    title: 'Le candidat est plus proche sur cette période',
    description:
      'Son erreur médiane est plus faible face à la dépense inférée. Ce signal reste expérimental et ne modifie pas la cible.',
    tone: 'info',
  },
  currentSupported: {
    label: 'Moteur actuel favorisé',
    title: 'Le moteur actuel reste plus proche',
    description:
      'Sur cette période, la formule candidate augmente l’écart face à la dépense inférée.',
    tone: 'info',
  },
  inconclusive: {
    label: 'Résultat non concluant',
    title: 'Aucun avantage net ne se dégage',
    description:
      'Les écarts restent trop proches pour privilégier une architecture énergétique.',
    tone: 'info',
  },
  reviewRequired: {
    label: 'Revue nécessaire',
    title: 'Un écart important doit être examiné',
    description:
      'Au moins une journée dépasse 250 kcal de différence entre les deux architectures.',
    tone: 'warning',
  },
};

const exclusionLabels: Record<EnergyArchitectureExclusionReason, string> = {
  missingCheckOut: 'Bilan quotidien absent',
  incompleteFoodJournal: 'Journal alimentaire incomplet',
  missingFoodData: 'Calories consommées absentes',
  missingLinkedSteps: 'Pas non reliés au bilan',
  missingDailyTarget: 'Cible historique absente',
};

function formatKcal(value: number | undefined): string {
  if (value === undefined) return 'Non disponible';
  return `${Math.round(value).toLocaleString('fr-FR')} kcal/j`;
}

export function EnergyArchitectureDiagnostic({
  report,
}: {
  report: EnergyArchitectureRetrospectiveReport;
}) {
  const content = statusContent[report.status];
  const exclusions = Object.entries(report.exclusionCounts)
    .filter((entry): entry is [EnergyArchitectureExclusionReason, number] => (
      entry[1] > 0
    ));
  const metrics = [
    {
      label: 'Jours canoniques',
      value:
        `${report.eligibleDayCount}/${ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS}`,
      detail: `${report.excludedDayCount} jour(s) écarté(s)`,
    },
    {
      label: 'Fenêtres comparables',
      value: report.validWindowCount.toLocaleString('fr-FR'),
      detail: 'Fenêtres glissantes de 14 jours',
    },
    {
      label: 'Pesées disponibles',
      value: report.weighInCount.toLocaleString('fr-FR'),
      detail: 'Six minimum par fenêtre',
    },
    {
      label: 'Écart quotidien maximal',
      value: formatKcal(report.summary?.maximumDailyDifferenceKcal),
      detail: 'Seuil de revue : 250 kcal',
    },
  ];

  return (
    <CollapsibleSection
      title="Diagnostic du moteur énergétique"
      description="Comparaison expérimentale, sans effet sur ta cible"
      summary={content.label}
      defaultOpen={report.status === 'reviewRequired'}
      icon={FlaskConical}
    >
      <InlineNotice tone={content.tone} title={content.title}>
        {content.description}
      </InlineNotice>

      <ProgressBar
        className="mt-5"
        value={report.eligibleDayCount}
        max={ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS}
        label="Couverture des données"
        indicatorClassName={
          report.eligibleDayCount
            >= ENERGY_ARCHITECTURE_RETROSPECTIVE_MINIMUM_EVIDENCE_DAYS
            ? 'bg-emerald-600'
            : 'bg-sky-600'
        }
      />

      <dl className="mt-5 grid grid-cols-2 border-y border-slate-200 dark:border-slate-800 sm:grid-cols-4">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={[
              'min-w-0 px-3 py-4 sm:px-4',
              index % 2 === 1
                ? 'border-l border-slate-200 dark:border-slate-800'
                : '',
              index >= 2
                ? 'border-t border-slate-200 dark:border-slate-800 sm:border-t-0'
                : '',
              index === 2
                ? 'sm:border-l sm:border-slate-200 sm:dark:border-slate-800'
                : '',
            ].join(' ')}
          >
            <dt className="text-xs font-medium leading-4 text-slate-500 dark:text-slate-400">
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

      {report.summary ? (
        <div className="mt-5">
          <div className="flex items-center gap-2">
            <Scale aria-hidden="true" className="size-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Erreur médiane face à la dépense inférée
            </h3>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-3">
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                Moteur actuel
              </dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatKcal(report.summary.medianCurrentAbsoluteErrorKcal)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500 dark:text-slate-400">
                Candidat
              </dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-900 dark:text-white">
                {formatKcal(report.summary.medianCandidateAbsoluteErrorKcal)}
              </dd>
            </div>
          </dl>
        </div>
      ) : null}

      {exclusions.length > 0 ? (
        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldAlert aria-hidden="true" className="size-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Données à renforcer
            </h3>
          </div>
          <ul className="mt-3 grid gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
            {exclusions.map(([reason, count]) => (
              <li key={reason} className="flex items-center justify-between gap-3">
                <span>{exclusionLabels[reason]}</span>
                <strong className="shrink-0 tabular-nums text-slate-900 dark:text-white">
                  {count}
                </strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-slate-500 dark:text-slate-400">
        Ce diagnostic utilise les calories déclarées et la tendance du poids.
        Les variations d’eau et les fenêtres qui se chevauchent limitent son
        interprétation. Il ne déclenche jamais une correction.
      </p>
    </CollapsibleSection>
  );
}
