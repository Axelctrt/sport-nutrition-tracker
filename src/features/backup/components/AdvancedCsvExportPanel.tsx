import {
  CalendarRange,
  CheckSquare2,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Share2,
  Square,
} from 'lucide-react';
import {
  useMemo,
  useState,
  type ChangeEvent,
} from 'react';

import {
  CSV_EXPORT_DEFINITIONS,
  createCsvExports,
  type CsvExportFile,
  type CsvExportKey,
  type CsvExportOptions,
} from '@/infrastructure/backup/csvExportService';
import { appDatabase } from '@/infrastructure/database/database';
import {
  downloadCsvExportFile,
  downloadCsvExportFiles,
  shareCsvExportFiles,
} from '@/features/backup/csvExportDelivery';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { toLocalDate } from '@/shared/utils/dates';

type CsvPeriodPreset =
  | 'all'
  | '7'
  | '30'
  | '90'
  | 'custom';

interface AdvancedCsvExportPanelProps {
  now?: Date;
  prepareExports?: (
    options: CsvExportOptions,
  ) => Promise<CsvExportFile[]>;
  downloadOne?: (file: CsvExportFile) => void;
  downloadMany?: (
    files: readonly CsvExportFile[],
  ) => number;
  shareMany?: (
    files: readonly CsvExportFile[],
  ) => Promise<'shared' | 'cancelled' | 'unsupported'>;
}

interface Feedback {
  tone: 'success' | 'error' | 'info';
  message: string;
}

const DAY_IN_MILLISECONDS = 86_400_000;

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MILLISECONDS);
}

function presetPeriod(
  preset: CsvPeriodPreset,
  now: Date,
): Pick<CsvExportOptions, 'from' | 'to'> {
  if (preset === 'all' || preset === 'custom') return {};

  const days = Number(preset);

  return {
    from: toLocalDate(addLocalDays(now, -(days - 1))),
    to: toLocalDate(now),
  };
}

function periodLabel(options: CsvExportOptions): string {
  if (!options.from && !options.to) {
    return 'Toutes les dates';
  }

  return `${options.from ?? 'Début'} → ${options.to ?? 'Aujourd’hui'}`;
}

export function AdvancedCsvExportPanel({
  now = new Date(),
  prepareExports = (options) =>
    createCsvExports(
      appDatabase,
      new Date().toISOString(),
      options,
    ),
  downloadOne = downloadCsvExportFile,
  downloadMany = downloadCsvExportFiles,
  shareMany = shareCsvExportFiles,
}: AdvancedCsvExportPanelProps) {
  const today = toLocalDate(now);
  const defaultFrom = toLocalDate(addLocalDays(now, -29));
  const [preset, setPreset] =
    useState<CsvPeriodPreset>('30');
  const [customFrom, setCustomFrom] = useState(defaultFrom);
  const [customTo, setCustomTo] = useState(today);
  const [selectedKeys, setSelectedKeys] = useState<
    CsvExportKey[]
  >(CSV_EXPORT_DEFINITIONS.map(({ key }) => key));
  const [preparedFiles, setPreparedFiles] = useState<
    CsvExportFile[]
  >([]);
  const [preparedPeriod, setPreparedPeriod] =
    useState<CsvExportOptions>();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>();

  const allSelected =
    selectedKeys.length === CSV_EXPORT_DEFINITIONS.length;

  const currentOptions = useMemo<CsvExportOptions>(() => {
    const period =
      preset === 'custom'
        ? {
            ...(customFrom ? { from: customFrom } : {}),
            ...(customTo ? { to: customTo } : {}),
          }
        : presetPeriod(preset, now);

    return {
      ...period,
      keys: selectedKeys,
    };
  }, [customFrom, customTo, now, preset, selectedKeys]);

  const invalidatePreview = () => {
    setPreparedFiles([]);
    setPreparedPeriod(undefined);
    setFeedback(undefined);
  };

  const handlePresetChange = (
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    setPreset(event.target.value as CsvPeriodPreset);
    invalidatePreview();
  };

  const toggleKey = (key: CsvExportKey) => {
    setSelectedKeys((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key],
    );
    invalidatePreview();
  };

  const toggleAll = () => {
    setSelectedKeys(
      allSelected
        ? []
        : CSV_EXPORT_DEFINITIONS.map(({ key }) => key),
    );
    invalidatePreview();
  };

  const handlePrepare = async () => {
    if (selectedKeys.length === 0) {
      setFeedback({
        tone: 'error',
        message:
          'Sélectionne au moins un jeu de données à exporter.',
      });
      return;
    }

    if (
      currentOptions.from &&
      currentOptions.to &&
      currentOptions.from > currentOptions.to
    ) {
      setFeedback({
        tone: 'error',
        message:
          'La date de début doit précéder la date de fin.',
      });
      return;
    }

    setIsPreparing(true);
    setFeedback(undefined);

    try {
      const files = await prepareExports(currentOptions);
      setPreparedFiles(files);
      setPreparedPeriod(currentOptions);
      setFeedback({
        tone: 'success',
        message:
          `${files.length} fichier(s) prêt(s) pour ${periodLabel(
            currentOptions,
          ).toLowerCase()}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Les exports CSV n’ont pas pu être préparés.',
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const handleDownloadAll = () => {
    const count = downloadMany(preparedFiles);

    setFeedback({
      tone: 'success',
      message: `${count} téléchargement(s) ont été déclenchés.`,
    });
  };

  const handleShare = async () => {
    setIsSharing(true);
    setFeedback(undefined);

    try {
      const result = await shareMany(preparedFiles);

      if (result === 'shared') {
        setFeedback({
          tone: 'success',
          message:
            'Les fichiers ont été transmis à la feuille de partage.',
        });
      } else if (result === 'cancelled') {
        setFeedback({
          tone: 'info',
          message: 'Le partage a été annulé.',
        });
      } else {
        setFeedback({
          tone: 'info',
          message:
            'Le partage de plusieurs fichiers n’est pas disponible ici. Utilise les boutons de téléchargement.',
        });
      }
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Le partage des fichiers a échoué.',
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <CollapsibleSection
      title="Exports CSV avancés"
      description="Choisis la période et les données à utiliser dans Excel, LibreOffice, Python ou un outil d’analyse."
      summary={
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {selectedKeys.length}/{CSV_EXPORT_DEFINITIONS.length}{' '}
          jeux sélectionnés
        </span>
      }
      defaultOpen
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor="csv-period-preset"
            className="text-sm font-semibold text-slate-900 dark:text-white"
          >
            Période
          </label>
          <div className="mt-2 flex items-center gap-2">
            <CalendarRange
              aria-hidden="true"
              className="size-5 text-slate-500"
            />
            <select
              id="csv-period-preset"
              value={preset}
              onChange={handlePresetChange}
              className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            >
              <option value="all">Toutes les dates</option>
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="custom">Période personnalisée</option>
            </select>
          </div>
        </div>

        {preset === 'custom' ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Date de début
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(event) => {
                  setCustomFrom(event.target.value);
                  invalidatePreview();
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>

            <label className="text-sm font-semibold text-slate-900 dark:text-white">
              Date de fin
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                max={today}
                onChange={(event) => {
                  setCustomTo(event.target.value);
                  invalidatePreview();
                }}
                className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
              />
            </label>
          </div>
        ) : null}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-950 dark:text-white">
              Jeux de données
            </h3>
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

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CSV_EXPORT_DEFINITIONS.map(
              ({ key, label, description }) => (
                <label
                  key={key}
                  className="flex min-h-20 cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-3 dark:border-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    onChange={() => toggleKey(key)}
                    className="mt-1 size-5 shrink-0 rounded border-slate-300"
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
        </div>

        <button
          type="button"
          disabled={isPreparing}
          onClick={() => void handlePrepare()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          {isPreparing ? (
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
            />
          ) : (
            <FileSpreadsheet
              aria-hidden="true"
              className="size-4"
            />
          )}
          {isPreparing
            ? 'Préparation…'
            : 'Préparer les fichiers CSV'}
        </button>

        {feedback ? (
          <InlineNotice
            title="Export CSV"
            tone={feedback.tone}
            role="status"
          >
            {feedback.message}
          </InlineNotice>
        ) : null}

        {preparedFiles.length > 0 ? (
          <div>
            <div className="flex flex-col gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-emerald-900 dark:bg-emerald-950/30">
              <div>
                <h3 className="font-semibold text-emerald-950 dark:text-emerald-100">
                  Aperçu prêt
                </h3>
                <p className="mt-1 text-sm text-emerald-800 dark:text-emerald-200">
                  {periodLabel(preparedPeriod ?? {})}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={handleDownloadAll}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                >
                  <Download
                    aria-hidden="true"
                    className="size-4"
                  />
                  Télécharger la sélection
                </button>

                <button
                  type="button"
                  disabled={isSharing}
                  onClick={() => void handleShare()}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-60 dark:text-emerald-100"
                >
                  {isSharing ? (
                    <LoaderCircle
                      aria-hidden="true"
                      className="size-4 animate-spin"
                    />
                  ) : (
                    <Share2
                      aria-hidden="true"
                      className="size-4"
                    />
                  )}
                  Partager la sélection
                </button>
              </div>
            </div>

            <ul className="mt-3 space-y-2">
              {preparedFiles.map((file) => (
                <li
                  key={file.key}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"
                >
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {file.label}
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      {file.rowCount} ligne(s) · {file.fileName}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => downloadOne(file)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold dark:border-slate-700"
                  >
                    <Download
                      aria-hidden="true"
                      className="size-4"
                    />
                    Télécharger {file.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
          Les CSV servent à l’analyse et ne permettent pas de
          restaurer SportPilot. Conserve également une sauvegarde
          JSON complète.
        </p>
      </div>
    </CollapsibleSection>
  );
}
