import { Database, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import type {
  DatabaseIntegrityReport,
  DatabaseIntegrityStatus,
} from "@/infrastructure/database/databaseIntegrityModels";
import { checkAndPersistDatabaseIntegrity } from "@/infrastructure/database/databaseIntegrityService";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { InlineNotice } from "@/shared/ui/InlineNotice";

interface DatabaseIntegrityPanelProps {
  className?: string;
  checkIntegrity?: () => Promise<DatabaseIntegrityReport>;
}

const statusPresentation: Record<
  DatabaseIntegrityStatus,
  { title: string; tone: "success" | "info" | "error" }
> = {
  healthy: { title: "Base locale intègre", tone: "success" },
  warning: { title: "Vérification à surveiller", tone: "info" },
  error: { title: "Anomalie détectée", tone: "error" },
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function DatabaseIntegrityPanel({
  className,
  checkIntegrity = checkAndPersistDatabaseIntegrity,
}: DatabaseIntegrityPanelProps) {
  const [report, setReport] = useState<DatabaseIntegrityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const runCheck = useCallback(async () => {
    setIsChecking(true);
    setError(null);

    try {
      setReport(await checkIntegrity());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Le contrôle de la base locale a échoué.",
      );
    } finally {
      setIsChecking(false);
    }
  }, [checkIntegrity]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  const classNames = ["p-4 sm:p-5", className].filter(Boolean).join(" ");

  return (
    <Card className={classNames}>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200">
          <Database aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Intégrité de la base locale
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Vérification non destructive du schéma, des tables et du journal
                des migrations.
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={isChecking}
              onClick={() => void runCheck()}
            >
              <RefreshCw
                aria-hidden="true"
                className={`size-4${isChecking ? " animate-spin" : ""}`}
              />
              {isChecking ? "Vérification…" : "Revérifier"}
            </Button>
          </div>

          {error ? (
            <InlineNotice
              className="mt-4"
              tone="error"
              title="Contrôle impossible"
              role="alert"
            >
              {error}
            </InlineNotice>
          ) : null}

          {!error && !report ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Vérification en cours…
            </p>
          ) : null}

          {report ? (
            <div className="mt-4 space-y-4">
              <InlineNotice
                tone={statusPresentation[report.status].tone}
                title={statusPresentation[report.status].title}
              >
                Aucune donnée n’est supprimée ou réinitialisée par ce contrôle.
              </InlineNotice>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Schéma installé
                  </dt>
                  <dd className="font-semibold text-slate-950 dark:text-white">
                    v{report.schemaVersion} / v{report.expectedSchemaVersion}{" "}
                    attendue
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Tables accessibles
                  </dt>
                  <dd className="font-semibold text-slate-950 dark:text-white">
                    {report.accessibleTableCount}/{report.expectedTableCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Dernière migration
                  </dt>
                  <dd className="font-semibold text-slate-950 dark:text-white">
                    {report.latestMigration
                      ? `v${report.latestMigration.version} · réussie`
                      : "Non journalisée"}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">
                    Dernier contrôle
                  </dt>
                  <dd className="font-semibold text-slate-950 dark:text-white">
                    {formatDate(report.checkedAt)}
                  </dd>
                </div>
              </dl>

              {report.issues.length > 0 ? (
                <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
                  {report.issues.map((issue) => (
                    <li key={`${issue.code}-${issue.tableName ?? "database"}`}>
                      • {issue.message}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
