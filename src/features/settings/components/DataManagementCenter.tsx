import {
  ArrowRight,
  DatabaseBackup,
  HardDrive,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

import { routePaths } from "@/app/routePaths";
import { DatabaseIntegrityPanel } from "@/features/settings/components/DatabaseIntegrityPanel";
import { DataConsistencyPanel } from "@/features/settings/components/DataConsistencyPanel";
import { SelectiveDataResetPanel } from "@/features/settings/components/SelectiveDataResetPanel";
import { CURRENT_BACKUP_SCHEMA_VERSION } from "@/infrastructure/backup/backupMigrations";
import { databaseSchemaVersion } from "@/infrastructure/database/schema";
import type { PersistentStorageStatus } from "@/infrastructure/storage/persistentStorage";
import { Card } from "@/shared/ui/Card";

interface DataManagementCenterProps {
  className?: string;
  storageStatus: PersistentStorageStatus;
  lastBackupExportedAt: string | undefined;
}

const storageStatusLabels: Record<PersistentStorageStatus, string> = {
  persisted: "Stockage persistant actif",
  notPersisted: "Stockage persistant non accordé",
  unsupported: "Statut de persistance indisponible",
};

function formatBackupDate(value: string | undefined): string {
  if (!value) return "Aucune sauvegarde enregistrée";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date de sauvegarde inconnue";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function DataManagementCenter({
  className,
  storageStatus,
  lastBackupExportedAt,
}: DataManagementCenterProps) {
  return (
    <section
      aria-labelledby="data-management-title"
      className={className}
    >
      <Card className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
            <HardDrive aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="data-management-title"
              className="font-semibold text-slate-950 dark:text-white"
            >
              Centre de gestion des données
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Retrouve au même endroit la protection du stockage, les
              sauvegardes, le diagnostic de la base et la suppression ciblée des
              données de test.
            </p>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <dt className="text-slate-500 dark:text-slate-400">
                  Protection du stockage
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {storageStatusLabels[storageStatus]}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <dt className="text-slate-500 dark:text-slate-400">
                  Dernière sauvegarde
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {formatBackupDate(lastBackupExportedAt)}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <dt className="text-slate-500 dark:text-slate-400">
                  Base locale
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  IndexedDB · schéma v{databaseSchemaVersion}
                </dd>
              </div>
              <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                <dt className="text-slate-500 dark:text-slate-400">
                  Format de sauvegarde
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  JSON v{CURRENT_BACKUP_SCHEMA_VERSION}
                </dd>
              </div>
            </dl>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link
                to={routePaths.backup}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
              >
                <DatabaseBackup aria-hidden="true" className="size-4" />
                Sauvegarder ou restaurer
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                to={routePaths.privacy}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                <ShieldCheck aria-hidden="true" className="size-4" />
                Confidentialité et stockage local
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>
        </div>
      </Card>

      <DatabaseIntegrityPanel className="mt-4" />
      <DataConsistencyPanel />
      <SelectiveDataResetPanel className="mt-4" />
    </section>
  );
}
