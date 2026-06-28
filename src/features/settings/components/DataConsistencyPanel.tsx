import {
  DatabaseZap,
  Download,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import { createAndDownloadSafetyBackup } from '@/application/backup/safetyBackupService';
import {
  createDataConsistencyReportFileName,
  inspectDataConsistency,
  repairDataConsistency,
  serializeDataConsistencyReport,
  type DataConsistencyReport,
  type DataConsistencyRepairResult,
  type DataConsistencyStatus,
} from '@/infrastructure/database/dataConsistencyService';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface DataConsistencyPanelProps {
  className?: string;
  auditConsistency?: () => Promise<DataConsistencyReport>;
  repairConsistency?: () => Promise<DataConsistencyRepairResult>;
  createSafetyBackup?: () => Promise<unknown>;
  downloadDiagnostic?: (
    content: string,
    fileName: string,
    mimeType: string,
  ) => void;
}

const statusPresentation: Record<
  DataConsistencyStatus,
  {
    title: string;
    tone: 'success' | 'info' | 'error';
  }
> = {
  healthy: {
    title: 'Relations de données cohérentes',
    tone: 'success',
  },
  warning: {
    title: 'Points de cohérence à surveiller',
    tone: 'info',
  },
  error: {
    title: 'Relations incohérentes détectées',
    tone: 'error',
  },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function defaultDownloadDiagnostic(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], {
    type: `${mimeType};charset=utf-8`,
  });
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

export function DataConsistencyPanel({
  className,
  auditConsistency = inspectDataConsistency,
  repairConsistency = repairDataConsistency,
  createSafetyBackup = () =>
    createAndDownloadSafetyBackup(
      'before-consistency-repair',
    ),
  downloadDiagnostic = defaultDownloadDiagnostic,
}: DataConsistencyPanelProps) {
  const [report, setReport] =
    useState<DataConsistencyReport>();
  const [result, setResult] =
    useState<DataConsistencyRepairResult>();
  const [error, setError] = useState<string>();
  const [isChecking, setIsChecking] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] =
    useState(false);

  const runAudit = useCallback(async () => {
    setIsChecking(true);
    setError(undefined);

    try {
      setReport(await auditConsistency());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Le contrôle de cohérence a échoué.',
      );
    } finally {
      setIsChecking(false);
    }
  }, [auditConsistency]);

  useEffect(() => {
    void runAudit();
  }, [runAudit]);

  const confirmRepair = async () => {
    setIsRepairing(true);
    setError(undefined);

    try {
      await createSafetyBackup();
      const repairResult = await repairConsistency();
      setResult(repairResult);
      setReport(repairResult.after);
      setIsConfirmationOpen(false);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'La réparation de cohérence a échoué.',
      );
      setIsConfirmationOpen(false);
    } finally {
      setIsRepairing(false);
    }
  };

  const downloadReport = () => {
    if (!report) return;

    downloadDiagnostic(
      serializeDataConsistencyReport(report),
      createDataConsistencyReportFileName(report.checkedAt),
      'application/json',
    );
  };

  const classNames = [
    'p-4 sm:p-5',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <Card className={classNames}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <DatabaseZap
                aria-hidden="true"
                className="size-5 text-brand-700 dark:text-brand-300"
              />
              <h3 className="text-lg font-bold text-slate-950 dark:text-white">
                Cohérence des données métier
              </h3>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Vérifie les liens entre repas, recettes,
              entraînements, séries et suggestions sans envoyer
              les données hors de l’appareil.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={isChecking || isRepairing}
              onClick={() => void runAudit()}
            >
              <RefreshCw
                aria-hidden="true"
                className={[
                  'size-4',
                  isChecking ? 'animate-spin' : '',
                ].join(' ')}
              />
              {isChecking ? 'Analyse…' : 'Revérifier'}
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={!report || isChecking || isRepairing}
              onClick={downloadReport}
            >
              <Download
                aria-hidden="true"
                className="size-4"
              />
              Diagnostic
            </Button>
          </div>
        </div>

        {error ? (
          <InlineNotice
            className="mt-4"
            tone="error"
            title="Contrôle impossible"
          >
            {error}
          </InlineNotice>
        ) : null}

        {!error && !report ? (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
            Analyse des relations locales en cours…
          </p>
        ) : null}

        {report ? (
          <div className="mt-4 space-y-4">
            <InlineNotice
              tone={statusPresentation[report.status].tone}
              title={statusPresentation[report.status].title}
            >
              {report.issueCount === 0
                ? `${report.totalRecordCount} enregistrement(s) contrôlé(s), aucune anomalie relationnelle.`
                : `${report.issueCount} point(s) détecté(s), dont ${report.repairableIssueCount} réparable(s) automatiquement.`}
            </InlineNotice>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Enregistrements
                </dt>
                <dd className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {report.totalRecordCount}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Points détectés
                </dt>
                <dd className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                  {report.issueCount}
                </dd>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Dernier contrôle
                </dt>
                <dd className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                  {formatDate(report.checkedAt)}
                </dd>
              </div>
            </dl>

            {report.issues.length > 0 ? (
              <details className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <summary className="cursor-pointer font-semibold text-slate-950 dark:text-white">
                  Voir les points détectés
                </summary>
                <ul className="mt-3 space-y-2">
                  {report.issues.map((issue) => (
                    <li
                      key={issue.id}
                      className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-950/50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950 dark:text-white">
                          {issue.tableName}
                        </span>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs dark:bg-slate-800">
                          {issue.repairable
                            ? 'Réparation sûre'
                            : 'À examiner'}
                        </span>
                      </div>
                      <p className="mt-1 leading-5 text-slate-600 dark:text-slate-300">
                        {issue.message}
                      </p>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}

            {report.repairableIssueCount > 0 ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                  <ShieldCheck
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-amber-800 dark:text-amber-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-amber-950 dark:text-amber-100">
                      Réparation protégée
                    </p>
                    <p className="mt-1 text-sm leading-5 text-amber-900 dark:text-amber-200">
                      Seuls les enfants devenus inaccessibles
                      seront retirés. Une sauvegarde JSON sera
                      téléchargée avant toute écriture.
                    </p>
                    <Button
                      className="mt-3"
                      variant="dangerGhost"
                      disabled={isChecking || isRepairing}
                      onClick={() =>
                        setIsConfirmationOpen(true)
                      }
                    >
                      <Wrench
                        aria-hidden="true"
                        className="size-4"
                      />
                      Réparer les orphelins sûrs
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            {result ? (
              <InlineNotice
                tone="success"
                title="Réparation terminée"
              >
                {result.repairedRecordCount}{' '}
                enregistrement(s) orphelin(s) ont été retirés
                après création de la sauvegarde de sécurité.
              </InlineNotice>
            ) : null}
          </div>
        ) : null}
      </Card>

      <ConfirmationDialog
        open={isConfirmationOpen}
        title="Réparer les données orphelines ?"
        description="Une sauvegarde JSON de sécurité sera téléchargée. Seuls les enregistrements enfants dont le parent n’existe plus seront supprimés. Les snapshots nutritionnels et les historiques encore lisibles seront conservés."
        confirmLabel="Sauvegarder et réparer"
        tone="danger"
        isPending={isRepairing}
        onConfirm={() => void confirmRepair()}
        onCancel={() => {
          if (!isRepairing) {
            setIsConfirmationOpen(false);
          }
        }}
      />
    </>
  );
}
