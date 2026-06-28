import {
  Activity,
  CalendarRange,
  CheckSquare2,
  Clipboard,
  Download,
  Dumbbell,
  FileText,
  Footprints,
  LoaderCircle,
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
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-bold text-slate-950 dark:text-white">
        {title}
      </h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        {values.map(({ label, value }) => (
          <div key={label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {label}
            </dt>
            <dd className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
              {value}
            </dd>
          </div>
        ))}
      </dl>
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
      setFeedback({
        tone: 'success',
        message: `Rapport créé pour ${generated.period.dayCount} jour(s).`,
      });
    } catch (error) {
      setReport(undefined);
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Le rapport n’a pas pu être créé.',
      });
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

      setFeedback({
        tone: result === 'done' ? 'success' : 'info',
        message:
          result === 'done'
            ? successMessage
            : result === 'cancelled'
              ? 'L’action a été annulée.'
              : 'Cette fonction n’est pas disponible sur cet appareil.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'L’action a échoué.',
      });
    } finally {
      setIsDelivering(false);
    }
  };

  return (
    <section
      aria-labelledby="progress-report-title"
      className="min-w-0"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900 print:border-0 print:shadow-none">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Synthèse partageable
        </p>
        <h1
          id="progress-report-title"
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
        >
          Rapport de progression
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          Regroupe les indicateurs utiles d’une période sans
          partager le journal détaillé ni la base complète.
        </p>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] print:hidden">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <CalendarRange
              aria-hidden="true"
              className="size-5 text-brand-700 dark:text-brand-300"
            />
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Période et confidentialité
            </h2>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-900 dark:text-white">
            Période
            <select
              value={preset}
              onChange={handlePresetChange}
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
            >
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </label>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
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
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="text-sm font-semibold text-slate-900 dark:text-white">
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
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
            <input
              type="checkbox"
              checked={includeIdentity}
              onChange={(event) => {
                setIncludeIdentity(event.target.checked);
                invalidateReport();
              }}
              className="mt-1 size-5 rounded border-slate-300"
            />
            <span>
              <span className="block font-semibold text-slate-950 dark:text-white">
                Inclure mon prénom et mes objectifs
              </span>
              <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                Désactivé par défaut pour limiter les informations
                personnelles partagées.
              </span>
            </span>
          </label>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <FileText
                aria-hidden="true"
                className="size-5 text-brand-700 dark:text-brand-300"
              />
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">
                Rubriques
              </h2>
            </div>

            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold dark:border-slate-700"
            >
              {allSelected ? (
                <CheckSquare2
                  aria-hidden="true"
                  className="size-4"
                />
              ) : (
                <Square
                  aria-hidden="true"
                  className="size-4"
                />
              )}
              {allSelected
                ? 'Tout désélectionner'
                : 'Tout sélectionner'}
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {sectionDefinitions.map(
              ({ id, label, description, icon: Icon }) => (
                <label
                  key={id}
                  className="flex min-h-24 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={sections.includes(id)}
                    onChange={() => toggleSection(id)}
                    className="mt-1 size-5 rounded border-slate-300"
                  />
                  <Icon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-slate-500"
                  />
                  <span>
                    <span className="block font-semibold text-slate-950 dark:text-white">
                      {label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                      {description}
                    </span>
                  </span>
                </label>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={() => void handleGenerate()}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-5 animate-spin"
              />
            ) : (
              <FileText
                aria-hidden="true"
                className="size-5"
              />
            )}
            {isLoading ? 'Création…' : 'Créer le rapport'}
          </button>
        </section>
      </div>

      {feedback ? (
        <div
          role="status"
          className={[
            'mt-4 rounded-2xl border px-4 py-3 text-sm print:hidden',
            feedback.tone === 'error'
              ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
              : feedback.tone === 'success'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100'
                : 'border-slate-300 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
          ].join(' ')}
        >
          {feedback.message}
        </div>
      ) : null}

      {report ? (
        <div className="mt-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-300 bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800 dark:bg-brand-950/30 print:hidden">
            <div>
              <p className="font-semibold text-brand-950 dark:text-brand-100">
                Rapport prêt
              </p>
              <p className="mt-1 text-sm text-brand-800 dark:text-brand-200">
                {reportPeriodLabel} · {report.period.dayCount}{' '}
                jour(s)
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
              <button
                type="button"
                disabled={isDelivering}
                onClick={() =>
                  void handleDelivery(
                    () => copyReport(report),
                    'Le rapport a été copié.',
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-700 px-3 py-2 text-sm font-semibold text-brand-900 disabled:opacity-60 dark:text-brand-100"
              >
                <Clipboard
                  aria-hidden="true"
                  className="size-4"
                />
                Copier
              </button>

              <button
                type="button"
                disabled={isDelivering}
                onClick={() => {
                  downloadReport(report);
                  setFeedback({
                    tone: 'success',
                    message: 'Le fichier texte a été téléchargé.',
                  });
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-700 px-3 py-2 text-sm font-semibold text-brand-900 disabled:opacity-60 dark:text-brand-100"
              >
                <Download
                  aria-hidden="true"
                  className="size-4"
                />
                Télécharger
              </button>

              <button
                type="button"
                disabled={isDelivering}
                onClick={() =>
                  void handleDelivery(
                    () => shareReport(report),
                    'La feuille de partage a été ouverte.',
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-700 px-3 py-2 text-sm font-semibold text-brand-900 disabled:opacity-60 dark:text-brand-100"
              >
                <Share2
                  aria-hidden="true"
                  className="size-4"
                />
                Partager
              </button>

              <button
                type="button"
                disabled={isDelivering}
                onClick={() =>
                  void handleDelivery(
                    printReport,
                    'La fenêtre d’impression a été ouverte.',
                  )
                }
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-700 px-3 py-2 text-sm font-semibold text-brand-900 disabled:opacity-60 dark:text-brand-100"
              >
                <Printer
                  aria-hidden="true"
                  className="size-4"
                />
                Imprimer
              </button>
            </div>
          </div>

          <article className="mt-4 space-y-3 print:mt-0">
            <header className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 print:border-0">
              <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
                Rapport SportPilot
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Du {report.period.from} au {report.period.to}
              </p>
              {report.profile ? (
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {report.profile.firstName
                    ? `Profil : ${report.profile.firstName}`
                    : 'Profil personnel'}
                  {' · '}objectif de pas :{' '}
                  {formatNumber(
                    report.profile.dailyStepGoal,
                    0,
                  )}
                </p>
              ) : null}
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
                    value:
                      report.weight.averageWeightKg === undefined
                        ? 'Aucune donnée'
                        : `${formatNumber(
                            report.weight.averageWeightKg,
                            2,
                          )} kg`,
                  },
                  {
                    label: 'Évolution',
                    value:
                      report.weight.changeKg === undefined
                        ? 'Aucune donnée'
                        : `${
                            report.weight.changeKg >= 0 ? '+' : ''
                          }${formatNumber(
                            report.weight.changeKg,
                            2,
                          )} kg`,
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
                    value: `${formatNumber(
                      report.steps.averageSteps,
                      0,
                    )} pas`,
                  },
                  {
                    label: 'Total',
                    value: `${formatNumber(
                      report.steps.totalSteps,
                      0,
                    )} pas`,
                  },
                  {
                    label: 'Objectif atteint',
                    value:
                      report.steps.targetSteps === undefined
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
                    value: String(
                      report.activities.sessionCount,
                    ),
                  },
                  {
                    label: 'Durée',
                    value: formatDuration(
                      report.activities.durationMinutes,
                    ),
                  },
                  {
                    label: 'Course',
                    value: `${formatNumber(
                      report.activities.runningDistanceKm,
                      2,
                    )} km`,
                  },
                  {
                    label: 'Natation',
                    value: `${formatNumber(
                      report.activities
                        .swimmingDistanceMeters,
                      0,
                    )} m`,
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
                    value: String(
                      report.nutrition.trackedDays,
                    ),
                  },
                  {
                    label: 'Calories moyennes',
                    value: `${formatNumber(
                      report.nutrition.averageCaloriesKcal,
                      0,
                    )} kcal`,
                  },
                  {
                    label: 'Protéines moyennes',
                    value: `${formatNumber(
                      report.nutrition.averageProteinGrams,
                    )} g`,
                  },
                  {
                    label: 'Adhérence calorique',
                    value:
                      report.nutrition
                        .averageCalorieAdherencePercent ===
                      undefined
                        ? 'Non disponible'
                        : `${formatNumber(
                            report.nutrition
                              .averageCalorieAdherencePercent,
                          )} %`,
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
                    value: String(
                      report.strength.completedSessionCount,
                    ),
                  },
                  {
                    label: 'Durée',
                    value: formatDuration(
                      report.strength.durationMinutes,
                    ),
                  },
                  {
                    label: 'Séries de travail',
                    value: String(
                      report.strength.workingSetCount,
                    ),
                  },
                  {
                    label: 'Volume brut',
                    value: `${formatNumber(
                      report.strength.totalVolumeKg,
                    )} kg`,
                  },
                ]}
              />
            ) : null}

            <p className="px-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Synthèse de suivi personnel, non destinée au
              diagnostic médical.
            </p>
          </article>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300 print:hidden">
          Choisis la période et les rubriques, puis crée le
          rapport.
        </div>
      )}
    </section>
  );
}
