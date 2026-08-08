import {
  Activity,
  CalendarRange,
  CheckSquare2,
  Clipboard,
  Download,
  Dumbbell,
  FileText,
  Footprints,
  Printer,
  Scale,
  Share2,
  Square,
  Utensils,
} from 'lucide-react';
import {
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';

import {
  loadProgressReport,
  type ProgressReport,
  type ProgressReportOptions,
  type ProgressReportSection,
} from '@/application/reports/progressReportService';
import {
  copyProgressReport,
  downloadProgressReport,
  printProgressReport,
  shareProgressReport,
  type ReportDeliveryResult,
} from '@/features/progress-reports/progressReportDelivery';
import {
  checkboxClassName,
  inputClassName,
} from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

type PeriodPreset = '7' | '30' | '90' | 'custom';

interface ProgressReportsPageProps {
  now?: Date;
  createReport?: (
    options: ProgressReportOptions,
  ) => Promise<ProgressReport>;
  downloadReport?: (report: ProgressReport) => void;
  copyReport?: (
    report: ProgressReport,
  ) => Promise<ReportDeliveryResult>;
  shareReport?: (
    report: ProgressReport,
  ) => Promise<ReportDeliveryResult>;
  printReport?: () => ReportDeliveryResult;
}

interface Feedback {
  tone: 'success' | 'error' | 'info';
  message: string;
}

const DAY_MS = 86_400_000;

const sectionDefinitions: Array<{
  id: ProgressReportSection;
  label: string;
  description: string;
  icon: typeof Scale;
}> = [
  {
    id: 'weight',
    label: 'Poids',
    description: 'Moyenne, première et dernière mesure, évolution.',
    icon: Scale,
  },
  {
    id: 'steps',
    label: 'Pas',
    description: 'Moyenne, total et jours atteignant l’objectif.',
    icon: Footprints,
  },
  {
    id: 'activities',
    label: 'Activités',
    description: 'Séances, durée, calories et distances.',
    icon: Activity,
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    description: 'Calories, macros et adhérence aux objectifs.',
    icon: Utensils,
  },
  {
    id: 'strength',
    label: 'Musculation',
    description: 'Séances, séries, volume et RPE.',
    icon: Dumbbell,
  },
];

function localDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset)
    .toISOString()
    .slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function presetFrom(
  preset: Exclude<PeriodPreset, 'custom'>,
  now: Date,
): string {
  return localDate(addDays(now, -(Number(preset) - 1)));
}

function formatNumber(
  value: number,
  maximumFractionDigits = 1,
): string {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits,
  }).format(value);
}

function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  const hours = Math.floor(rounded / 60);
  const remaining = rounded % 60;

  if (hours === 0) return `${remaining} min`;
  return `${hours} h ${String(remaining).padStart(2, '0')}`;
}

function SummaryCard({
  title,
  values,
}: {
  title: string;
  values: Array<{ label: string; value: string }>;
}) {
  return (
    <section>
      <Card padding="md" className="print:border-0 print:shadow-none">
        <h2 className="font-bold text-[var(--sp-text-primary)]">
          {title}
        </h2>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {values.map(({ label, value }) => (
            <div key={label}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--sp-text-muted)]">
                {label}
              </dt>
              <dd className="mt-1 text-lg font-semibold text-[var(--sp-text-primary)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
    </section>
  );
}

export function ProgressReportsPage({
  now = new Date(),
  createReport = loadProgressReport,
  downloadReport = downloadProgressReport,
  copyReport = copyProgressReport,
  shareReport = shareProgressReport,
  printReport = printProgressReport,
}: ProgressReportsPageProps) {
  const today = localDate(now);
  const [preset, setPreset] = useState<PeriodPreset>('30');
  const [from, setFrom] = useState(presetFrom('30', now));
  const [to, setTo] = useState(today);
  const [sections, setSections] = useState<
    ProgressReportSection[]
  >(sectionDefinitions.map(({ id }) => id));
  const [includeIdentity, setIncludeIdentity] =
    useState(false);
  const [report, setReport] = useState<ProgressReport>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDelivering, setIsDelivering] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();

  const allSelected =
    sections.length === sectionDefinitions.length;

  const reportPeriodLabel = useMemo(
    () => (report ? `${report.period.from} → ${report.period.to}` : ''),
    [report],
  );

  const invalidateReport = () => {
    setReport(undefined);
    setFeedback(undefined);
  };

  const handlePresetChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const next = event.target.value as PeriodPreset;
    setPreset(next);

    if (next !== 'custom') {
      setFrom(presetFrom(next, now));
      setTo(today);
    }

    invalidateReport();
  };

  const toggleSection = (section: ProgressReportSection) => {
    setSections((current) =>
      current.includes(section)
        ? current.filter((item) => item !== section)
        : [...current, section],
    );
    invalidateReport();
  };

  const toggleAll = () => {
    setSections(
      allSelected
        ? []
        : sectionDefinitions.map(({ id }) => id),
    );
    invalidateReport();
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setFeedback(undefined);

    try {
      const generated = await createReport({
        from,
        to,
        sections,
        includeIdentity,
      });
      setReport(generated);
      const message = `Rapport créé pour ${generated.period.dayCount} jour(s).`;
      setFeedback({ tone: 'success', message });
    } catch (error) {
      setReport(undefined);
      const fallback = 'Le rapport n’a pas pu être créé.';
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : fallback });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelivery = async (
    action: () =>
      | ReportDeliveryResult
      | Promise<ReportDeliveryResult>,
    successMessage: string,
  ) => {
    setIsDelivering(true);
    setFeedback(undefined);

    try {
      const result = await action();

      const message = result === 'done'
        ? successMessage
        : result === 'cancelled'
          ? 'L’action a été annulée.'
          : 'Cette fonction n’est pas disponible sur cet appareil.';
      setFeedback({ tone: result === 'done' ? 'success' : 'info', message });
    } catch (error) {
      const fallback = 'L’action a échoué.';
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : fallback });
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <section
      aria-labelledby="progress-report-title"
      className="min-w-0"
    >
      <Card padding="lg" className="print:border-0 print:shadow-none">
        <p className="text-sm font-semibold uppercase tracking-wide text-[var(--sp-accent-primary)]">
          Synthèse partageable
        </p>
        <h1
          id="progress-report-title"
          className="mt-1 text-3xl font-bold tracking-tight text-[var(--sp-text-primary)]"
        >
          Rapport de progression
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-[var(--sp-text-secondary)]">
          Regroupe les indicateurs utiles d’une période sans
          partager le journal détaillé ni la base complète.
        </p>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] print:hidden">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <CalendarRange
              aria-hidden="true"
              className="size-5 text-[var(--sp-accent-primary)]"
            />
            <h2 className="text-lg font-bold text-[var(--sp-text-primary)]">
              Période et confidentialité
            </h2>
          </div>

          <label className="mt-4 block text-sm font-semibold text-[var(--sp-text-primary)]">
            Période
            <select
              value={preset}
              onChange={handlePresetChange}
              className={`${inputClassName} mt-2`}
            >
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-[var(--sp-text-primary)]">
              Date de début
              <input
                type="date"
                value={from}
                max={to}
                disabled={preset !== 'custom'}
                onChange={(event) => {
                  setFrom(event.target.value);
                  invalidateReport();
                }}
                className={`${inputClassName} mt-2`}
              />
            </label>

            <label className="text-sm font-semibold text-[var(--sp-text-primary)]">
              Date de fin
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                disabled={preset !== 'custom'}
                onChange={(event) => {
                  setTo(event.target.value);
                  invalidateReport();
                }}
                className={`${inputClassName} mt-2`}
              />
            </label>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-4">
            <input
              type="checkbox"
              checked={includeIdentity}
              onChange={(event) => {
                setIncludeIdentity(event.target.checked);
                invalidateReport();
              }}
              className={`${checkboxClassName} mt-1`}
            />
            <span>
              <span className="block font-semibold text-[var(--sp-text-primary)]">
                Inclure mon prénom et mes objectifs
              </span>
              <span className="mt-1 block text-sm leading-5 text-[var(--sp-text-secondary)]">
                Désactivé par défaut pour limiter les informations
                personnelles partagées.
              </span>
            </span>
          </label>
        </Card>

        <Card padding="md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <FileText
                aria-hidden="true"
                className="size-5 text-[var(--sp-accent-primary)]"
              />
              <h2 className="text-lg font-bold text-[var(--sp-text-primary)]">
                Rubriques
              </h2>
            </div>

            <Button
              variant="secondary"
              onClick={toggleAll}
            >
              {allSelected ? (
                <CheckSquare2 aria-hidden="true" className="size-4" />
              ) : (
                <Square aria-hidden="true" className="size-4" />
              )}
              {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {sectionDefinitions.map(
              ({ id, label, description, icon: Icon }) => (
                <label
                  key={id}
                  className="flex min-h-24 cursor-pointer items-start gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-3"
                >
                  <input
                    type="checkbox"
                    checked={sections.includes(id)}
                    onChange={() => toggleSection(id)}
                    className={`${checkboxClassName} mt-1`}
                  />
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-[var(--sp-text-muted)]"
                  />
                  <span>
                    <span className="block font-semibold text-[var(--sp-text-primary)]">
                      {label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[var(--sp-text-secondary)]">
                      {description}
                    </span>
                  </span>
                </label>
              ),
            )}
          </div>

          <Button
            className="mt-4"
            fullWidth
            size="lg"
            loading={isLoading}
            loadingLabel="Création…"
            onClick={() => void handleGenerate()}
          >
            <FileText aria-hidden="true" className="size-5" />
            Créer le rapport
          </Button>
        </Card>
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-4 print:hidden"
          tone={feedback.tone}
          title={feedback.tone === 'error' ? 'Action impossible' : feedback.tone === 'success' ? 'Action terminée' : 'Information'}
          role="status"
          aria-live="polite"
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      {report ? (
        <div className="mt-4">
          <Card
            variant="muted"
            padding="md"
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden"
          >
            <div>
              <p className="font-semibold text-[var(--sp-text-primary)]">
                Rapport prêt
              </p>
              <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
                {reportPeriodLabel} · {report.period.dayCount}{' '}
                jour(s)
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <Button
                variant="secondary"
                disabled={isDelivering}
                onClick={() =>
                  void handleDelivery(
                    () => copyReport(report),
                    'Le rapport a été copié.',
                  )
                }
              >
                <Clipboard aria-hidden="true" className="size-4" />
                Copier
              </Button>

              <Button
                variant="secondary"
                disabled={isDelivering}
                onClick={() => {
                  downloadReport(report);
                  setFeedback({
                    tone: 'success',
                    message: 'Le fichier texte a été téléchargé.',
                  });
                }}
              >
                <Download aria-hidden="true" className="size-4" />
                Télécharger
              </Button>

              <Button
                variant="secondary"
                disabled={isDelivering}
                onClick={() =>
                  void handleDelivery(
                    () => shareReport(report),
                    'La feuille de partage a été ouverte.',
                  )
                }
              >
                <Share2 aria-hidden="true" className="size-4" />
                Partager
              </Button>

              <Button
                variant="secondary"
                disabled={isDelivering}
                onClick={() =>
                  void handleDelivery(
                    printReport,
                    'La fenêtre d’impression a été ouverte.',
                  )
                }
              >
                <Printer aria-hidden="true" className="size-4" />
                Imprimer
              </Button>
            </div>
          </Card>

          <article className="mt-4 space-y-3 print:mt-0">
            <header>
              <Card padding="md" className="print:border-0 print:shadow-none">
                <h2 className="text-2xl font-bold text-[var(--sp-text-primary)]">
                  Rapport SportPilot
                </h2>
                <p className="mt-2 text-sm text-[var(--sp-text-secondary)]">
                  Du {report.period.from} au {report.period.to}
                </p>
                {report.profile ? (
                  <p className="mt-2 text-sm text-[var(--sp-text-secondary)]">
                    {report.profile.firstName
                      ? `Profil : ${report.profile.firstName}`
                      : 'Profil personnel'}
                    {' · '}objectif de pas :{' '}
                    {formatNumber(report.profile.dailyStepGoal, 0)}
                  </p>
                ) : null}
              </Card>
            </header>

            {report.weight ? (
              <SummaryCard
                title="Poids"
                values={[
                  {
                    label: 'Pesées',
                    value: String(report.weight.entryCount),
                  },
                  {
                    label: 'Poids moyen',
                    value: report.weight.averageWeightKg === undefined
                      ? 'Aucune donnée'
                      : `${formatNumber(report.weight.averageWeightKg, 2)} kg`,
                  },
                  {
                    label: 'Évolution',
                    value: report.weight.changeKg === undefined
                      ? 'Aucune donnée'
                      : `${report.weight.changeKg >= 0 ? '+' : ''}${formatNumber(report.weight.changeKg, 2)} kg`,
                  },
                ]}
              />
            ) : null}

            {report.steps ? (
              <SummaryCard
                title="Pas"
                values={[
                  {
                    label: 'Jours suivis',
                    value: String(report.steps.trackedDays),
                  },
                  {
                    label: 'Moyenne',
                    value: `${formatNumber(report.steps.averageSteps, 0)} pas`,
                  },
                  {
                    label: 'Total',
                    value: `${formatNumber(report.steps.totalSteps, 0)} pas`,
                  },
                  {
                    label: 'Objectif atteint',
                    value: report.steps.targetSteps === undefined
                      ? 'Non disponible'
                      : `${report.steps.targetReachedDays} jour(s)`,
                  },
                ]}
              />
            ) : null}

            {report.activities ? (
              <SummaryCard
                title="Activités"
                values={[
                  {
                    label: 'Séances',
                    value: String(report.activities.sessionCount),
                  },
                  {
                    label: 'Durée',
                    value: formatDuration(report.activities.durationMinutes),
                  },
                  {
                    label: 'Course',
                    value: `${formatNumber(report.activities.runningDistanceKm, 2)} km`,
                  },
                  {
                    label: 'Natation',
                    value: `${formatNumber(report.activities.swimmingDistanceMeters, 0)} m`,
                  },
                ]}
              />
            ) : null}

            {report.nutrition ? (
              <SummaryCard
                title="Nutrition"
                values={[
                  {
                    label: 'Jours suivis',
                    value: String(report.nutrition.trackedDays),
                  },
                  {
                    label: 'Calories moyennes',
                    value: `${formatNumber(report.nutrition.averageCaloriesKcal, 0)} kcal`,
                  },
                  {
                    label: 'Protéines moyennes',
                    value: `${formatNumber(report.nutrition.averageProteinGrams)} g`,
                  },
                  {
                    label: 'Adhérence calorique',
                    value: report.nutrition.averageCalorieAdherencePercent === undefined
                      ? 'Non disponible'
                      : `${formatNumber(report.nutrition.averageCalorieAdherencePercent)} %`,
                  },
                ]}
              />
            ) : null}

            {report.strength ? (
              <SummaryCard
                title="Musculation"
                values={[
                  {
                    label: 'Séances terminées',
                    value: String(report.strength.completedSessionCount),
                  },
                  {
                    label: 'Durée',
                    value: formatDuration(report.strength.durationMinutes),
                  },
                  {
                    label: 'Séries de travail',
                    value: String(report.strength.workingSetCount),
                  },
                  {
                    label: 'Volume brut',
                    value: `${formatNumber(report.strength.totalVolumeKg)} kg`,
                  },
                ]}
              />
            ) : null}

            <p className="px-1 text-xs leading-5 text-[var(--sp-text-muted)]">
              Synthèse de suivi personnel, non destinée au
              diagnostic médical.
            </p>
          </article>
        </div>
      ) : (
        <Card
          variant="muted"
          padding="lg"
          className="mt-4 border-dashed text-center text-sm text-[var(--sp-text-secondary)] print:hidden"
        >
          Choisis la période et les rubriques, puis crée le
          rapport.
        </Card>
      )}
    </section>
  );
}
