import {
  CalendarRange,
  CheckSquare2,
  Download,
  FileSpreadsheet,
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
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
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
      const message = `${files.length} fichier(s) prêt(s) pour ${periodLabel(currentOptions).toLowerCase()}.`;
      setFeedback({ tone: 'success', message });
    } catch (error) {
      const fallback = 'Les exports CSV n’ont pas pu être préparés.';
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : fallback });
    } finally {
      setIsPreparing(false);
    }
  };

  const handleDownloadAll = () => {
    const count = downloadMany(preparedFiles);

    const message = `${count} téléchargement(s) ont été déclenchés.`;
    setFeedback({ tone: 'success', message });
  };

  const handleShare = async () => {
    setIsSharing(true);
    setFeedback(undefined);

    try {
      const result = await shareMany(preparedFiles);

      if (result === 'shared') {
        const message = 'Les fichiers ont été transmis à la feuille de partage.';
        setFeedback({ tone: 'success', message });
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
      const fallback = 'Le partage des fichiers a échoué.';
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : fallback });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <CollapsibleSection
      title="Exports CSV avancés"
      description="Choisis la période et les données à utiliser dans Excel, LibreOffice, Python ou un outil d’analyse."
      summary={
        <span className="text-xs font-semibold text-[var(--sp-text-muted)]">
          {selectedKeys.length}/{CSV_EXPORT_DEFINITIONS.length}{' '}
          jeux sélectionnés
        </span>
      }
    >
      <div className="space-y-5">
        <div>
          <label
            htmlFor="csv-period-preset"
            className="text-sm font-semibold text-[var(--sp-text-primary)]"
          >
            Période
          </label>
          <div className="mt-2 flex items-center gap-2">
            <CalendarRange
              aria-hidden="true"
              className="size-5 text-[var(--sp-text-muted)]"
            />
            <select
              id="csv-period-preset"
              value={preset}
              onChange={handlePresetChange}
              className={`${inputClassName} flex-1`}
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
            <label className="text-sm font-semibold text-[var(--sp-text-primary)]">
              Date de début
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(event) => {
                  setCustomFrom(event.target.value);
                  invalidatePreview();
                }}
                className={`${inputClassName} mt-2`}
              />
            </label>

            <label className="text-sm font-semibold text-[var(--sp-text-primary)]">
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
                className={`${inputClassName} mt-2`}
              />
            </label>
          </div>
        ) : null}

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[var(--sp-text-primary)]">
              Jeux de données
            </h3>
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleAll}
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
            </Button>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {CSV_EXPORT_DEFINITIONS.map(
              ({ key, label, description }) => (
                <label
                  key={key}
                  className="flex min-h-20 cursor-pointer items-start gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-3"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(key)}
                    onChange={() => toggleKey(key)}
                    className={`${checkboxClassName} mt-1 shrink-0`}
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
        </div>

        <Button
          loading={isPreparing}
          loadingLabel="Préparation…"
          onClick={() => void handlePrepare()}
          className="w-full sm:w-auto"
        >
          <FileSpreadsheet
            aria-hidden="true"
            className="size-4"
          />
          Préparer les fichiers CSV
        </Button>

        {feedback ? (
          <InlineNotice
            title="Export CSV"
            tone={feedback.tone}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </InlineNotice>
        ) : null}

        {preparedFiles.length > 0 ? (
          <div>
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="font-semibold text-[var(--sp-text-primary)]">
                    Aperçu prêt
                  </h3>
                  <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
                    {periodLabel(preparedPeriod ?? {})}
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button onClick={handleDownloadAll}>
                    <Download
                      aria-hidden="true"
                      className="size-4"
                    />
                    Télécharger la sélection
                  </Button>

                  <Button
                    variant="secondary"
                    loading={isSharing}
                    loadingLabel="Partage…"
                    onClick={() => void handleShare()}
                  >
                    <Share2
                      aria-hidden="true"
                      className="size-4"
                    />
                    Partager la sélection
                  </Button>
                </div>
              </div>
            </Card>

            <ul className="mt-3 space-y-2">
              {preparedFiles.map((file) => (
                <li
                  key={file.key}
                  className="flex flex-col gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-semibold text-[var(--sp-text-primary)]">
                      {file.label}
                    </p>
                    <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
                      {file.rowCount} ligne(s) · {file.fileName}
                    </p>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() => downloadOne(file)}
                  >
                    <Download
                      aria-hidden="true"
                      className="size-4"
                    />
                    Télécharger {file.label}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="text-xs leading-5 text-[var(--sp-text-muted)]">
          Les CSV servent à l’analyse et ne permettent pas de
          restaurer SportPilot. Conserve également une sauvegarde
          JSON complète.
        </p>
      </div>
    </CollapsibleSection>
  );
}
