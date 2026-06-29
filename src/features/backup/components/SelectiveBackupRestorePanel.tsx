import {
  CheckSquare2,
  FileArchive,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
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

      setFeedback({
        tone: 'success',
        title: 'Restauration sélective terminée',
        message: `${result.restoredRecordCount} enregistrement(s) ont été restaurés dans ${result.selectedCategories.length} domaine(s).`,
      });
      clearPrepared();
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Restauration impossible',
        message:
          error instanceof Error
            ? error.message
            : 'La restauration sélective a échoué.',
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
            className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300"
          />
          <div>
            <h2 className="text-lg font-bold text-slate-950 dark:text-white">
              Restauration sélective
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Compare une sauvegarde avec cet appareil, puis
              remplace uniquement les domaines choisis. La
              restauration complète reste disponible plus haut.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-sm font-semibold text-slate-900 dark:text-white">
          Sauvegarde JSON à comparer
          <input
            ref={inputRef}
            type="file"
            accept="application/json,.json"
            disabled={isPreparing || isRestoring}
            onChange={(event) =>
              void handleFileSelection(event)
            }
            className="mt-2 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold dark:border-slate-700 dark:bg-slate-950 dark:file:bg-slate-800"
          />
        </label>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Taille maximale :{' '}
          {formatFileSize(MAX_BACKUP_FILE_SIZE_BYTES)}.
        </p>

        {isPreparing ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
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
          >
            {feedback.message}
          </InlineNotice>
        ) : null}

        {prepared ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950 dark:text-white">
                  {selectedFileName}
                </p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
                    'flex items-start gap-3 rounded-2xl border p-4',
                    category.available
                      ? 'cursor-pointer border-slate-200 dark:border-slate-700'
                      : 'cursor-not-allowed border-slate-200 opacity-60 dark:border-slate-800',
                  ].join(' ')}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(category.key)}
                    disabled={!category.available}
                    onChange={() =>
                      toggleCategory(category.key)
                    }
                    className="mt-1 size-5 rounded border-slate-300"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-950 dark:text-white">
                      {category.label}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                      {category.description}
                    </span>
                    <span className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <span>
                        <span className="block text-slate-500">
                          Appareil
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {category.currentRecords}
                        </strong>
                      </span>
                      <span>
                        <span className="block text-slate-500">
                          Sauvegarde
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {category.incomingRecords}
                        </strong>
                      </span>
                      <span>
                        <span className="block text-slate-500">
                          Écart
                        </span>
                        <strong className="text-slate-900 dark:text-white">
                          {formatDelta(
                            category.currentRecords,
                            category.incomingRecords,
                          )}
                        </strong>
                      </span>
                    </span>
                    {!category.available ? (
                      <span className="mt-2 block text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Non présent dans cette ancienne sauvegarde
                      </span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>

            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  aria-hidden="true"
                  className="mt-0.5 size-5 shrink-0 text-amber-800 dark:text-amber-300"
                />
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-100">
                    Remplacement protégé
                  </p>
                  <p className="mt-1 text-sm leading-5 text-amber-900 dark:text-amber-200">
                    Chaque domaine choisi sera remplacé, pas
                    fusionné. Une sauvegarde complète sera
                    téléchargée avant toute écriture.
                  </p>
                </div>
              </div>
            </div>

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
