import {
  DatabaseBackup,
  Download,
  FileCheck2,
  HardDrive,
  LoaderCircle,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  applyPreparedBackupImport,
  prepareBackupExport,
  prepareBackupImport,
  type PreparedBackupImport,
} from '@/application/backup/backupApplicationService';
import { useProfile } from '@/app/providers/profile/useProfile';
import { useTheme } from '@/app/providers/useTheme';
import { routePaths } from '@/app/routePaths';
import {
  clearAllUserData,
  MAX_BACKUP_FILE_SIZE_BYTES,
  type BackupSummary,
} from '@/infrastructure/backup/backupService';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { cn } from '@/shared/utils/cn';

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
  { key: 'dailySteps', label: 'Journées de pas' },
  { key: 'activities', label: 'Activités' },
  { key: 'foodProducts', label: 'Aliments' },
  { key: 'foodEntries', label: 'Entrées alimentaires' },
  { key: 'recipes', label: 'Recettes' },
  { key: 'favoriteMeals', label: 'Repas favoris' },
  { key: 'weeklyReviews', label: 'Bilans hebdomadaires' },
];

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 octet';
  const units = ['octets', 'Ko', 'Mo', 'Go'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: index === 0 ? 0 : 1 }).format(value)} ${units[index]}`;
}

function formatExportedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function downloadJson(content: string, fileName: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
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

function SummaryGrid({ summary }: { summary: BackupSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {summaryRows.map(({ key, label }) => (
        <div key={key} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
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
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [storageEstimate, setStorageEstimate] = useState<StorageEstimate>();

  useEffect(() => {
    let active = true;
    const loadEstimate = async () => {
      if (!navigator.storage?.estimate) return;
      try {
        const estimate = await navigator.storage.estimate();
        if (active) setStorageEstimate({ usage: estimate.usage, quota: estimate.quota });
      } catch {
        // L’estimation est informative et ne bloque aucune opération.
      }
    };
    void loadEstimate();
    return () => {
      active = false;
    };
  }, []);

  const handleExport = async () => {
    setFeedback(undefined);
    setIsExporting(true);
    try {
      const prepared = await prepareBackupExport();
      downloadJson(prepared.content, prepared.fileName);
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

  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>) => {
    setFeedback(undefined);
    setPendingImport(undefined);
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
        message: 'Vérifie le résumé ci-dessous avant de remplacer les données présentes sur cet appareil.',
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
      setPendingImport(undefined);
      setSelectedFileName(undefined);
      if (fileInputRef.current) fileInputRef.current.value = '';
      navigate(
        pendingImport.summary.hasProfile ? routePaths.dashboard : routePaths.onboarding,
        { replace: true },
      );
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Restauration impossible',
        message: error instanceof Error ? error.message : 'La restauration a échoué.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteConfirmation !== 'EFFACER') return;
    setIsDeleting(true);
    setFeedback(undefined);
    try {
      await clearAllUserData();
      setTheme('system');
      await refreshProfile();
      setFeedback({
        tone: 'success',
        title: 'Données effacées',
        message: 'Toutes les données utilisateur ont été supprimées de cet appareil.',
      });
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

  return (
    <section aria-labelledby="backup-title">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Données locales
        </p>
        <h1 id="backup-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Sauvegarde et restauration
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Exporte une copie complète de SportPilot, restaure-la sur cet appareil ou efface définitivement les données locales.
        </p>
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-6 whitespace-pre-line"
          tone={feedback.tone}
          title={feedback.title}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
          aria-live="polite"
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Download aria-hidden="true" className="mt-0.5 size-6 text-brand-700 dark:text-brand-300" />
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Exporter les données</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Le fichier JSON contient le profil, les réglages, le poids, les pas, les activités, la nutrition, les recettes, les objectifs et les bilans.
              </p>
            </div>
          </div>
          <Button className="mt-5 w-full sm:w-auto" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <DatabaseBackup aria-hidden="true" className="size-4" />}
            {isExporting ? 'Création…' : 'Télécharger la sauvegarde JSON'}
          </Button>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Upload aria-hidden="true" className="mt-0.5 size-6 text-brand-700 dark:text-brand-300" />
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Restaurer une sauvegarde</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Le fichier est vérifié avant l’import. La restauration remplace ensuite toutes les données présentes sur cet appareil.
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

      {pendingImport ? (
        <Card className="mt-6 p-5 sm:p-6" aria-labelledby="import-preview-title">
          <div className="flex items-start gap-3">
            <FileCheck2 aria-hidden="true" className="mt-0.5 size-6 text-emerald-700 dark:text-emerald-300" />
            <div>
              <h2 id="import-preview-title" className="text-xl font-bold text-slate-950 dark:text-white">
                Sauvegarde prête à être restaurée
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {selectedFileName} · exportée le {formatExportedAt(pendingImport.summary.exportedAt)} · schéma v{pendingImport.summary.schemaVersion}
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {pendingImport.summary.totalRecords} enregistrement(s) · {pendingImport.summary.hasProfile ? 'profil inclus' : 'aucun profil'}
              </p>
            </div>
          </div>
          <div className="mt-5">
            <SummaryGrid summary={pendingImport.summary} />
          </div>
          <InlineNotice className="mt-5" tone="info" title="Remplacement complet">
            Toutes les données actuellement présentes seront remplacées. En cas d’échec technique, la transaction est annulée et les anciennes données restent intactes.
          </InlineNotice>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Upload aria-hidden="true" className="size-4" />}
              {isImporting ? 'Restauration…' : 'Importer et remplacer les données'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPendingImport(undefined);
                setSelectedFileName(undefined);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              disabled={isImporting}
            >
              Annuler
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-6 text-brand-700 dark:text-brand-300" />
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Confidentialité</h2>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                <li>Les données SportPilot restent dans IndexedDB sur cet appareil.</li>
                <li>Le fichier exporté est créé localement par le navigateur.</li>
                <li>Aucune sauvegarde n’est envoyée à un serveur.</li>
                <li>Seules les recherches explicitement lancées vers Open Food Facts quittent l’appareil.</li>
              </ul>
            </div>
          </div>
          {storageEstimate ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
              <HardDrive aria-hidden="true" className="mt-0.5 size-5 text-slate-500" />
              <div className="text-sm text-slate-600 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">Stockage navigateur estimé</p>
                <p className="mt-1">
                  {formatFileSize(storageEstimate.usage ?? 0)} utilisés
                  {storageEstimate.quota ? ` sur ${formatFileSize(storageEstimate.quota)}` : ''}.
                </p>
              </div>
            </div>
          ) : null}
        </Card>

        <Card className="border-red-200 p-5 dark:border-red-900 sm:p-6">
          <div className="flex items-start gap-3">
            <Trash2 aria-hidden="true" className="mt-0.5 size-6 text-red-700 dark:text-red-300" />
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Effacer toutes les données</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Cette opération supprime le profil et tout l’historique local. Elle ne peut être annulée sans fichier de sauvegarde.
              </p>
            </div>
          </div>
          {!showDeleteConfirmation ? (
            <Button className="mt-5" variant="danger" onClick={() => setShowDeleteConfirmation(true)}>
              Préparer la suppression
            </Button>
          ) : (
            <div className="mt-5 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
              <label className="block">
                <span className="text-sm font-semibold text-red-950 dark:text-red-100">
                  Saisis EFFACER pour confirmer
                </span>
                <input
                  value={deleteConfirmation}
                  onChange={(event) => setDeleteConfirmation(event.target.value)}
                  autoComplete="off"
                  className="mt-2 min-h-11 w-full rounded-xl border border-red-300 bg-white px-3 text-slate-950 dark:border-red-800 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="danger"
                  onClick={handleDelete}
                  disabled={deleteConfirmation !== 'EFFACER' || isDeleting}
                >
                  {isDeleting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}
                  {isDeleting ? 'Suppression…' : 'Effacer définitivement'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setDeleteConfirmation('');
                  }}
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5 sm:p-6">
        <h2 className="text-xl font-bold text-slate-950 dark:text-white">Fonctionnement de l’application</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          SportPilot regroupe le suivi du profil, du poids, des pas, des activités, de la nutrition, des recettes, des analyses et des sauvegardes locales.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Hors connexion', 'Saisies et consultations locales disponibles'],
            ['Responsive', 'Navigation mobile et bureau'],
            ['Confidentiel', 'Aucun compte ni backend requis'],
            ['Installable', 'PWA disponible sur mobile et ordinateur'],
          ].map(([title, description]) => (
            <div key={title} className={cn('rounded-xl border border-slate-200 p-3 dark:border-slate-700')}>
              <p className="font-semibold text-slate-950 dark:text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </Card>
    </section>
  );
}
