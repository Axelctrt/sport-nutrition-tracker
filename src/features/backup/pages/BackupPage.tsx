import {
  Bell,
  DatabaseBackup,
  Download,
  FileCheck2,
  FileJson,
  FileSpreadsheet,
  HardDrive,
  LoaderCircle,
  Share2,

  ShieldCheck,
  Trash2,
  Wrench,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  applyPreparedBackupImport,
  loadBackupSettings,
  prepareBackupExport,
  prepareBackupImport,
  recordSuccessfulBackupExport,
  updateBackupReminderInterval,
  type PreparedBackupImport,
} from '@/application/backup/backupApplicationService';
import { getBackupReminderStatus } from '@/domain/backup/backupReminder';
import type { AppSettings, BackupReminderIntervalDays } from '@/domain/models/settings';
import { useProfile } from '@/app/providers/profile/useProfile';
import { useTheme } from '@/app/providers/useTheme';
import { routePaths } from '@/app/routePaths';
import { BackupDeleteDialog } from '@/features/backup/components/BackupDeleteDialog';
import { BackupOverview } from '@/features/backup/components/BackupOverview';
import { shareBackupFile } from '@/features/backup/shareBackupFile';
import {
  clearAllUserData,
  MAX_BACKUP_FILE_SIZE_BYTES,
  type BackupSummary,
} from '@/infrastructure/backup/backupService';
import { createCsvExports, type CsvExportFile } from '@/infrastructure/backup/csvExportService';
import {
  createDiagnosticFileName,
  createTechnicalDiagnostic,
  serializeTechnicalDiagnostic,
} from '@/infrastructure/diagnostics/diagnosticService';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface Feedback {
  tone: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

interface StorageEstimate {
  usage: number | undefined;
  quota: number | undefined;
}

const summaryRows: { key: keyof BackupSummary; label: string }[] = [
  { key: 'weights', label: 'Pesées' },
  { key: 'dailySteps', label: 'Jours de pas' },
  { key: 'activities', label: 'Activités' },
  { key: 'foodProducts', label: 'Aliments' },
  { key: 'foodEntries', label: 'Entrées alimentaires' },
  { key: 'recipes', label: 'Recettes' },
  { key: 'favoriteMeals', label: 'Repas favoris' },
  { key: 'weeklyReviews', label: 'Bilans' },
  { key: 'workoutSessions', label: 'Séances musculation' },
  { key: 'strengthSets', label: 'Séries' },
];

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 octet';
  const units = ['octets', 'Ko', 'Mo', 'Go'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: index === 0 ? 0 : 1,
  }).format(value)} ${units[index]}`;
}

function formatExportedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function downloadFile(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function formatRelativeBackupDate(value: string | undefined): string {
  if (!value) return 'Aucune sauvegarde enregistrée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return 'Aujourd’hui';
  if (days === 1) return 'Il y a 1 jour';
  return `Il y a ${days} jours`;
}

function ImportSummary({ summary }: { summary: BackupSummary }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
      {summaryRows.map(({ key, label }) => (
        <div key={key} className="min-w-0 border-b border-slate-200 pb-3 dark:border-slate-800">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
            {String(summary[key])}
          </p>
        </div>
      ))}
    </div>
  );
}

export function BackupPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useProfile();
  const { setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [feedback, setFeedback] = useState<Feedback>();
  const [pendingImport, setPendingImport] = useState<PreparedBackupImport>();
  const [selectedFileName, setSelectedFileName] = useState<string>();
  const [isExporting, setIsExporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate>();
  const [settings, setSettings] = useState<AppSettings>();
  const [csvExports, setCsvExports] = useState<CsvExportFile[]>();
  const [isPreparingCsv, setIsPreparingCsv] = useState(false);
  const [isExportingDiagnostic, setIsExportingDiagnostic] = useState(false);
  const [isUpdatingReminder, setIsUpdatingReminder] = useState(false);

  useEffect(() => {
    let active = true;
    const loadEstimate = async () => {
      try {
        const [estimate, loadedSettings] = await Promise.all([
          navigator.storage?.estimate ? navigator.storage.estimate() : Promise.resolve(undefined),
          loadBackupSettings(),
        ]);
        if (!active) return;
        if (estimate) setStorageEstimate({ usage: estimate.usage, quota: estimate.quota });
        setSettings(loadedSettings);
      } catch {
        // Les informations de fiabilité restent secondaires aux actions de sauvegarde.
      }
    };
    void loadEstimate();
    return () => {
      active = false;
    };
  }, []);

  const clearPendingImport = () => {
    setPendingImport(undefined);
    setSelectedFileName(undefined);
    setImportDialogOpen(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = async () => {
    setFeedback(undefined);
    setIsExporting(true);
    try {
      const prepared = await prepareBackupExport();
      downloadFile(prepared.content, prepared.fileName, 'application/json');
      const updatedSettings = await recordSuccessfulBackupExport(prepared);
      setSettings(updatedSettings);
      setFeedback({
        tone: 'success',
        title: 'Sauvegarde créée',
        message: `${prepared.summary.totalRecords} enregistrement(s) ont été exportés dans ${prepared.fileName}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Export impossible',
        message: error instanceof Error ? error.message : 'La sauvegarde n’a pas pu être créée.',
      });
    } finally {
      setIsExporting(false);
    }
  };


  const handleShare = async () => {
    setFeedback(undefined);
    setIsSharing(true);

    try {
      const prepared = await prepareBackupExport();
      const result = await shareBackupFile(
        prepared.content,
        prepared.fileName,
      );

      if (result === 'cancelled') {
        setFeedback({
          tone: 'info',
          title: 'Partage annulé',
          message:
            'Aucun fichier n’a été envoyé et la date de sauvegarde reste inchangée.',
        });
        return;
      }

      if (result === 'unsupported') {
        downloadFile(
          prepared.content,
          prepared.fileName,
          'application/json',
        );
      }

      const updatedSettings =
        await recordSuccessfulBackupExport(prepared);
      setSettings(updatedSettings);
      setFeedback({
        tone: 'success',
        title:
          result === 'shared'
            ? 'Sauvegarde prête à être partagée'
            : 'Sauvegarde téléchargée',
        message:
          result === 'shared'
            ? `${prepared.summary.totalRecords} enregistrement(s) ont été placés dans la feuille de partage de l’appareil.`
            : `Le partage natif n’est pas disponible ici. ${prepared.fileName} a été téléchargé à la place.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Partage impossible',
        message:
          error instanceof Error
            ? error.message
            : 'La sauvegarde n’a pas pu être partagée.',
      });
    } finally {
      setIsSharing(false);
    }
  };
  const handleReminderChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const intervalDays = Number(event.target.value) as BackupReminderIntervalDays;
    setIsUpdatingReminder(true);
    setFeedback(undefined);
    try {
      const updatedSettings = await updateBackupReminderInterval(intervalDays);
      setSettings(updatedSettings);
      setFeedback({
        tone: 'success',
        title: 'Rappel mis à jour',
        message: intervalDays === 0
          ? 'Le rappel de sauvegarde est désactivé.'
          : `Un rappel discret apparaîtra après ${intervalDays} jours sans sauvegarde.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Réglage impossible',
        message: error instanceof Error ? error.message : 'Le rappel n’a pas pu être modifié.',
      });
    } finally {
      setIsUpdatingReminder(false);
    }
  };

  const handlePrepareCsv = async () => {
    setIsPreparingCsv(true);
    setFeedback(undefined);
    try {
      const exports = await createCsvExports();
      setCsvExports(exports);
      setFeedback({
        tone: 'success',
        title: 'Exports CSV prêts',
        message: `${exports.length} fichier(s) peuvent maintenant être téléchargés séparément.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Export CSV impossible',
        message: error instanceof Error ? error.message : 'Les fichiers CSV n’ont pas pu être préparés.',
      });
    } finally {
      setIsPreparingCsv(false);
    }
  };

  const handleDiagnosticExport = async () => {
    setIsExportingDiagnostic(true);
    setFeedback(undefined);
    try {
      const diagnostic = await createTechnicalDiagnostic();
      downloadFile(
        serializeTechnicalDiagnostic(diagnostic),
        createDiagnosticFileName(diagnostic.generatedAt),
        'application/json',
      );
      setFeedback({
        tone: 'success',
        title: 'Diagnostic exporté',
        message: 'Le fichier contient uniquement des informations techniques et des compteurs.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Diagnostic impossible',
        message: error instanceof Error ? error.message : 'Le diagnostic n’a pas pu être généré.',
      });
    } finally {
      setIsExportingDiagnostic(false);
    }
  };

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    setFeedback(undefined);
    setPendingImport(undefined);
    setImportDialogOpen(false);
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    if (file.size > MAX_BACKUP_FILE_SIZE_BYTES) {
      setFeedback({
        tone: 'error',
        title: 'Fichier trop volumineux',
        message: `La taille maximale autorisée est ${formatFileSize(MAX_BACKUP_FILE_SIZE_BYTES)}.`,
      });
      return;
    }

    try {
      const prepared = prepareBackupImport(await file.text());
      setPendingImport(prepared);
      setFeedback({
        tone: 'info',
        title: 'Sauvegarde validée',
        message: 'Vérifie le résumé avant de remplacer les données de cet appareil.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Sauvegarde refusée',
        message: error instanceof Error ? error.message : 'Le fichier est invalide.',
      });
    }
  };

  const handleImport = async () => {
    if (!pendingImport) return;
    setIsImporting(true);
    setFeedback(undefined);
    try {
      await applyPreparedBackupImport(pendingImport);
      const importedSettings = pendingImport.envelope.data.appSettings[0];
      if (importedSettings) setTheme(importedSettings.theme);
      await refreshProfile();
      setFeedback({
        tone: 'success',
        title: 'Restauration terminée',
        message: `${pendingImport.summary.totalRecords} enregistrement(s) ont été restaurés.`,
      });
      const hasProfile = pendingImport.summary.hasProfile;
      clearPendingImport();
      navigate(hasProfile ? routePaths.dashboard : routePaths.onboarding, { replace: true });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Restauration impossible',
        message: error instanceof Error ? error.message : 'La restauration a échoué.',
      });
      setImportDialogOpen(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setFeedback(undefined);
    try {
      await clearAllUserData();
      setTheme('system');
      await refreshProfile();
      setDeleteDialogOpen(false);
      navigate(routePaths.onboarding, { replace: true });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Suppression impossible',
        message: error instanceof Error ? error.message : 'Les données n’ont pas pu être supprimées.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const storageUsageLabel = storageEstimate
    ? `${formatFileSize(storageEstimate.usage ?? 0)}${storageEstimate.quota ? ` / ${formatFileSize(storageEstimate.quota)}` : ''}`
    : undefined;
  const reminderStatus = settings ? getBackupReminderStatus(settings) : undefined;
  const lastBackupLabel = formatRelativeBackupDate(settings?.lastBackupExportedAt);

  return (
    <section aria-labelledby="backup-title" className="min-w-0 overflow-x-clip">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Données locales
        </p>
        <h1 id="backup-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
          Sauvegarde et restauration
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Exporte une copie complète, restaure-la sur cet appareil ou efface définitivement les données locales.
        </p>
      </div>

      <BackupOverview
        {...(storageUsageLabel ? { storageUsageLabel } : {})}
        lastBackupLabel={lastBackupLabel}
      />


      <Card className="mt-4 p-5 sm:p-6" aria-labelledby="backup-reminder-title">
        <div className="flex items-start gap-3">
          <Bell aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" />
          <div className="min-w-0 flex-1">
            <h2 id="backup-reminder-title" className="text-lg font-bold text-slate-950 dark:text-white">
              Suivi des sauvegardes
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Dernière sauvegarde : <span className="font-semibold text-slate-900 dark:text-white">{lastBackupLabel.toLowerCase()}</span>.
            </p>
            {settings?.lastBackupExportedAt ? (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                SportPilot {settings.lastBackupAppVersion ?? 'version inconnue'} · format JSON v{settings.lastBackupSchemaVersion ?? 2}
              </p>
            ) : null}
          </div>
        </div>

        {reminderStatus?.due ? (
          <InlineNotice className="mt-4" tone="info" title="Une sauvegarde est recommandée">
            Le délai de {reminderStatus.intervalDays} jours est atteint. Le rappel reste limité à cette page.
          </InlineNotice>
        ) : null}

        <label className="mt-4 block" htmlFor="backup-reminder-interval">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rappel de sauvegarde</span>
          <select
            id="backup-reminder-interval"
            value={settings?.backupReminderIntervalDays ?? 0}
            onChange={(event) => void handleReminderChange(event)}
            disabled={!settings || isUpdatingReminder}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white sm:max-w-xs"
          >
            <option value="0">Désactivé</option>
            <option value="7">Tous les 7 jours</option>
            <option value="14">Tous les 14 jours</option>
            <option value="30">Tous les 30 jours</option>
          </select>
        </label>
      </Card>

      {feedback ? (
        <InlineNotice
          className="mt-4 whitespace-pre-line"
          tone={feedback.tone}
          title={feedback.title}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Download aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Exporter les données</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Crée un fichier JSON complet sur cet appareil. Aucune donnée n’est envoyée à un serveur.
              </p>
            </div>
          </div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            onClick={handleExport}
            disabled={isExporting || isSharing}
          >
            {isExporting ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <DatabaseBackup aria-hidden="true" className="size-4" />
            )}
            {isExporting ? 'Création…' : 'Télécharger le JSON'}
          </Button>
          <Button
            onClick={() => void handleShare()}
            disabled={isExporting || isSharing}
          >
            {isSharing ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Share2 aria-hidden="true" className="size-4" />
            )}
            {isSharing ? 'Préparation…' : 'Partager la sauvegarde'}
          </Button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
          Sur un appareil compatible, ouvre Fichiers, iCloud Drive,
          AirDrop ou une autre application. Sinon, le fichier est
          téléchargé automatiquement.
        </p>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Upload aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Restaurer une sauvegarde</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Le fichier est contrôlé avant toute modification des données présentes.
              </p>
            </div>
          </div>
          <label className="mt-5 block">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Fichier JSON SportPilot</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileSelection}
              className="mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-800 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-100 file:px-3 file:py-2 file:font-semibold file:text-brand-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:file:bg-brand-900/50 dark:file:text-brand-100"
            />
          </label>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Taille maximale : {formatFileSize(MAX_BACKUP_FILE_SIZE_BYTES)}.
          </p>
        </Card>
      </div>


      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <FileSpreadsheet aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Exports CSV</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Prépare des fichiers lisibles dans Excel ou un outil d’analyse. Le JSON reste nécessaire pour restaurer SportPilot.
              </p>
            </div>
          </div>
          <Button className="mt-5 w-full" variant="secondary" onClick={() => void handlePrepareCsv()} disabled={isPreparingCsv}>
            {isPreparingCsv ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <FileSpreadsheet aria-hidden="true" className="size-4" />}
            {isPreparingCsv ? 'Préparation…' : 'Préparer les fichiers CSV'}
          </Button>
          {csvExports ? (
            <div className="mt-4 grid gap-2">
              {csvExports.map((item) => (
                <Button
                  key={item.key}
                  variant="ghost"
                  className="w-full justify-between border border-slate-200 dark:border-slate-800"
                  onClick={() => downloadFile(item.content, item.fileName, 'text/csv')}
                >
                  <span>{item.label}</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{item.rowCount} ligne(s)</span>
                </Button>
              ))}
            </div>
          ) : null}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Wrench aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-brand-700 dark:text-brand-300" />
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-950 dark:text-white">Diagnostic technique</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Exporte la version, l’état PWA et le nombre d’enregistrements par table, sans poids, repas, nom ni détail de séance.
              </p>
            </div>
          </div>
          <Button className="mt-5 w-full" variant="secondary" onClick={() => void handleDiagnosticExport()} disabled={isExportingDiagnostic}>
            {isExportingDiagnostic ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <FileJson aria-hidden="true" className="size-4" />}
            {isExportingDiagnostic ? 'Création…' : 'Télécharger le diagnostic'}
          </Button>
        </Card>
      </div>

      {pendingImport ? (
        <Card className="mt-4 border-emerald-200 p-5 dark:border-emerald-900 sm:p-6" aria-labelledby="import-preview-title">
          <div className="flex items-start gap-3">
            <FileCheck2 aria-hidden="true" className="mt-0.5 size-6 shrink-0 text-emerald-700 dark:text-emerald-300" />
            <div className="min-w-0">
              <h2 id="import-preview-title" className="text-lg font-bold text-slate-950 dark:text-white">
                Sauvegarde prête à être restaurée
              </h2>
              <p className="mt-1 break-words text-sm text-slate-600 dark:text-slate-300">
                {selectedFileName} · {formatExportedAt(pendingImport.summary.exportedAt)} · format source v{pendingImport.summary.sourceSchemaVersion}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {pendingImport.summary.totalRecords} enregistrement(s) · {pendingImport.summary.profileCount} profil(s) · {pendingImport.summary.appVersion ? `SportPilot ${pendingImport.summary.appVersion}` : 'version d’application inconnue'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-200 p-3 dark:border-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Compatibilité</p>
              <p className="mt-1 font-semibold text-slate-950 dark:text-white">Compatible avec cette version</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Migration</p>
              <p className="mt-1 font-semibold text-slate-950 dark:text-white">{pendingImport.summary.requiresMigration ? `Conversion vers le format v${pendingImport.summary.schemaVersion}` : 'Aucune migration nécessaire'}</p>
            </div>
          </div>
          <div className="mt-5">
            <ImportSummary summary={pendingImport.summary} />
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button onClick={() => setImportDialogOpen(true)} disabled={isImporting}>
              <Upload aria-hidden="true" className="size-4" />
              Restaurer cette sauvegarde
            </Button>
            <Button variant="secondary" onClick={clearPendingImport} disabled={isImporting}>
              Annuler
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-4 space-y-3">
        <CollapsibleSection
          title="Confidentialité et stockage"
          description="Où sont conservées les données et comment protéger leur copie."
          summary="Local"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-700 dark:text-brand-300" />
            <ul className="space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <li>Les données SportPilot restent dans IndexedDB sur cet appareil.</li>
              <li>Le fichier exporté est créé localement par le navigateur.</li>
              <li>Aucune sauvegarde n’est envoyée à un serveur.</li>
              <li>Seules les recherches lancées vers Open Food Facts quittent l’appareil.</li>
            </ul>
          </div>
          {storageEstimate ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <HardDrive aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-slate-500" />
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold text-slate-900 dark:text-white">Stockage estimé : </span>
                {formatFileSize(storageEstimate.usage ?? 0)} utilisés
                {storageEstimate.quota ? ` sur ${formatFileSize(storageEstimate.quota)}` : ''}.
              </p>
            </div>
          ) : null}
        </CollapsibleSection>

        <CollapsibleSection
          title="Fonctionnement de l’application"
          description="Principes techniques essentiels de SportPilot."
          summary="PWA"
        >
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Hors connexion', 'Saisies et consultations locales'],
              ['Mobile-first', 'Téléphone prioritaire'],
              ['Confidentiel', 'Aucun compte requis'],
              ['Installable', 'PWA mobile et ordinateur'],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          title="Effacer toutes les données"
          description="Supprime le profil, l’historique et les réglages de cet appareil."
          summary="Irréversible"
          className="border-red-200 dark:border-red-900"
        >
          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            Exporte d’abord une sauvegarde si tu souhaites pouvoir restaurer tes informations plus tard.
          </p>
          <Button className="mt-4 w-full sm:w-auto" variant="danger" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 aria-hidden="true" className="size-4" />
            Effacer les données locales
          </Button>
        </CollapsibleSection>
      </div>

      <ConfirmationDialog
        open={importDialogOpen}
        title="Remplacer toutes les données ?"
        description="La restauration remplacera le profil, l’historique et les réglages actuellement présents. La transaction sera annulée automatiquement en cas d’échec technique."
        confirmLabel="Importer et remplacer"
        tone="danger"
        isPending={isImporting}
        onConfirm={() => void handleImport()}
        onCancel={() => setImportDialogOpen(false)}
      />

      <BackupDeleteDialog
        open={deleteDialogOpen}
        isPending={isDeleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </section>
  );
}
