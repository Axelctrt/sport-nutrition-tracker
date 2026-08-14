import {
  CheckSquare2,
  FileArchive,
  LoaderCircle,
  RotateCcw,
  Square,
} from 'lucide-react';
import {
  useRef,
  useState,
  type ChangeEvent,
} from 'react';

import { createAndDownloadSafetyBackup } from '@/application/backup/safetyBackupService';
import { useProfile } from '@/app/providers/profile/useProfile';
import {
  MAX_BACKUP_FILE_SIZE_BYTES,
} from '@/infrastructure/backup/backupService';
import {
  applySelectiveBackupRestore,
  prepareSelectiveBackupRestore,
  type PreparedSelectiveBackupRestore,
  type SelectiveBackupRestoreResult,
  type SelectiveRestoreCategory,
} from '@/infrastructure/backup/selectiveBackupRestoreService';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface SelectiveBackupRestorePanelProps {
  className?: string;
  prepareRestore?: (
    text: string,
  ) => Promise<PreparedSelectiveBackupRestore>;
  applyRestore?: (
    prepared: PreparedSelectiveBackupRestore,
    categories: readonly SelectiveRestoreCategory[],
  ) => Promise<SelectiveBackupRestoreResult>;
  createSafetyBackup?: () => Promise<unknown>;
}

interface Feedback {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

function formatFileSize(bytes: number): string {
  const megabytes = bytes / 1024 / 1024;
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(megabytes)} Mo`;
}

function formatDelta(
  currentRecords: number,
  incomingRecords: number,
): string {
  const delta = incomingRecords - currentRecords;

  if (delta === 0) return 'Aucun écart';
  return `${delta > 0 ? '+' : ''}${delta}`;
}

export function SelectiveBackupRestorePanel({
  className,
  prepareRestore = prepareSelectiveBackupRestore,
  applyRestore = applySelectiveBackupRestore,
  createSafetyBackup = () =>
    createAndDownloadSafetyBackup(
      'before-selective-restore',
    ),
}: SelectiveBackupRestorePanelProps) {
  const { refreshProfile } = useProfile();
  const inputRef = useRef<HTMLInputElement>(null);
  const [prepared, setPrepared] =
    useState<PreparedSelectiveBackupRestore>();
  const [selected, setSelected] = useState<
    SelectiveRestoreCategory[]
  >([]);
  const [selectedFileName, setSelectedFileName] =
    useState<string>();
  const [feedback, setFeedback] = useState<Feedback>();
  const [isPreparing, setIsPreparing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [confirmationOpen, setConfirmationOpen] =
    useState(false);

  const availableCategories =
    prepared?.categories.filter(({ available }) => available) ??
    [];
  const allAvailableSelected =
    availableCategories.length > 0 &&
    availableCategories.every(({ key }) =>
      selected.includes(key),
    );

  const clearPrepared = () => {
    setPrepared(undefined);
    setSelected([]);
    setSelectedFileName(undefined);
    setConfirmationOpen(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleFileSelection = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    setFeedback(undefined);
    setPrepared(undefined);
    setSelected([]);

    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);

    if (file.size > MAX_BACKUP_FILE_SIZE_BYTES) {
      setFeedback({
        tone: 'error',
        title: 'Fichier trop volumineux',
        message: `La taille maximale est ${formatFileSize(
          MAX_BACKUP_FILE_SIZE_BYTES,
        )}.`,
      });
      return;
    }

    setIsPreparing(true);

    try {
      const nextPrepared = await prepareRestore(
        await file.text(),
      );
      setPrepared(nextPrepared);
      setSelected(
        nextPrepared.categories
          .filter(({ available }) => available)
          .map(({ key }) => key),
      );
      setFeedback({
        tone: 'info',
        title: 'Comparaison terminée',
        message:
          'Choisis les domaines à remplacer. Les autres données resteront intactes.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Sauvegarde refusée',
        message:
          error instanceof Error
            ? error.message
            : 'Le fichier ne peut pas être utilisé.',
      });
    } finally {
      setIsPreparing(false);
    }
  };

  const toggleCategory = (
    category: SelectiveRestoreCategory,
  ) => {
    setSelected((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const toggleAll = () => {
    setSelected(
      allAvailableSelected
        ? []
        : availableCategories.map(({ key }) => key),
    );
  };

  const confirmRestore = async () => {
    if (!prepared || selected.length === 0) return;

    setIsRestoring(true);
    setFeedback(undefined);

    try {
      await createSafetyBackup();
      const result = await applyRestore(
        prepared,
        selected,
      );

      if (selected.includes('profileSettings')) {
        await refreshProfile();
      }

      const message = `${result.restoredRecordCount} enregistrement(s) ont été restaurés dans ${result.selectedCategories.length} domaine(s).`;
      setFeedback({ tone: 'success', title: 'Restauration sélective terminée', message });
      clearPrepared();
    } catch (error) {
      const fallback = 'La restauration sélective a échoué.';
      setFeedback({
        tone: 'error',
        title: 'Restauration impossible',
        message: error instanceof Error ? error.message : fallback,
      });
      setConfirmationOpen(false);
    } finally {
      setIsRestoring(false);
    }
  };

  const classNames = [
    'p-5 sm:p-6',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <Card className={classNames}>
        <div className="flex items-start gap-3">
          <FileArchive
            aria-hidden="true"
            className="mt-0.5 size-5 shrink-0 text-[var(--sp-accent-primary)]"
          />
          <div>
            <h2 className="text-lg font-bold text-[var(--sp-text-primary)]">
              Restauration sélective
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--sp-text-secondary)]">
              Compare une sauvegarde avec cet appareil, puis
              remplace uniquement les domaines choisis. La
              restauration complète reste disponible plus haut.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-sm font-semibold text-[var(--sp-text-primary)]">
          Sauvegarde JSON à comparer
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            disabled={isPreparing || isRestoring}
            onChange={(event) =>
              void handleFileSelection(event)
            }
            className={`${inputClassName} mt-2 file:mr-3 file:rounded-[var(--sp-radius-control)] file:border-0 file:bg-[var(--sp-surface-muted)] file:px-3 file:py-2 file:font-semibold file:text-[var(--sp-text-primary)]`}
          />
        </label>

        <p className="mt-2 text-xs text-[var(--sp-text-muted)]">
          Taille maximale :{' '}
          {formatFileSize(MAX_BACKUP_FILE_SIZE_BYTES)}.
        </p>

        {isPreparing ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--sp-text-secondary)]">
            <LoaderCircle
              aria-hidden="true"
              className="size-4 animate-spin"
            />
            Analyse de la sauvegarde…
          </p>
        ) : null}

        {feedback ? (
          <InlineNotice
            className="mt-4"
            tone={feedback.tone}
            title={feedback.title}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </InlineNotice>
        ) : null}

        {prepared ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-[var(--sp-text-primary)]">
                  {selectedFileName}
                </p>
                <p className="mt-1 text-sm text-[var(--sp-text-secondary)]">
                  Format source v
                  {prepared.summary.sourceSchemaVersion} ·{' '}
                  {prepared.summary.totalRecords}{' '}
                  enregistrement(s)
                </p>
              </div>

              <Button
                variant="secondary"
                size="sm"
                onClick={toggleAll}
              >
                {allAvailableSelected ? (
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
                {allAvailableSelected
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {prepared.categories.map((category) => (
                <label
                  key={category.key}
                  className={[
                    'flex items-start gap-3 rounded-[var(--sp-radius-control)] border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-muted)] p-4',
                    category.available
                      ? 'cursor-pointer'
                      : 'cursor-not-allowed opacity-60',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(category.key)}
                    disabled={!category.available}
                    onChange={() =>
                      toggleCategory(category.key)
                    }
                    className={`${checkboxClassName} mt-1`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-[var(--sp-text-primary)]">
                      {category.label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-[var(--sp-text-secondary)]">
                      {category.description}
                    </span>
                    <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <span>
                        <span className="block text-[var(--sp-text-muted)]">
                          Appareil
                        </span>
                        <strong className="text-[var(--sp-text-primary)]">
                          {category.currentRecords}
                        </strong>
                      </span>
                      <span>
                        <span className="block text-[var(--sp-text-muted)]">
                          Sauvegarde
                        </span>
                        <strong className="text-[var(--sp-text-primary)]">
                          {category.incomingRecords}
                        </strong>
                      </span>
                      <span>
                        <span className="block text-[var(--sp-text-muted)]">
                          Écart
                        </span>
                        <strong className="text-[var(--sp-text-primary)]">
                          {formatDelta(
                            category.currentRecords,
                            category.incomingRecords,
                          )}
                        </strong>
                      </span>
                    </span>
                    {!category.available ? (
                      <span className="mt-2 block text-xs font-semibold text-[var(--sp-text-secondary)]">
                        Non présent dans cette ancienne sauvegarde
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>

            <InlineNotice tone="info" title="Remplacement protégé">
              Chaque domaine choisi sera remplacé, pas
              fusionné. Une sauvegarde complète sera
              téléchargée avant toute écriture.
            </InlineNotice>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  selected.length === 0 ||
                  isPreparing ||
                  isRestoring
                }
                onClick={() =>
                  setConfirmationOpen(true)
                }
              >
                <RotateCcw
                  aria-hidden="true"
                  className="size-4"
                />
                Restaurer les domaines sélectionnés
              </Button>

              <Button
                variant="secondary"
                disabled={isRestoring}
                onClick={clearPrepared}
              >
                Annuler
              </Button>
            </div>
          </div>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={confirmationOpen}
        title="Remplacer les domaines sélectionnés ?"
        description={`Les données actuelles de ${selected.length} domaine(s) seront remplacées par celles de la sauvegarde. Les autres domaines resteront inchangés. Une sauvegarde JSON de sécurité sera téléchargée avant l’opération.`}
        confirmLabel="Sauvegarder et restaurer"
        tone="danger"
        isPending={isRestoring}
        onConfirm={() => void confirmRestore()}
        onCancel={() => {
          if (!isRestoring) {
            setConfirmationOpen(false);
          }
        }}
      />
    </>
  );
}
