import { CalendarClock, Database, HardDrive, ShieldCheck } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface BackupOverviewProps {
  storageUsageLabel?: string;
  lastBackupLabel?: string;
}

export function BackupOverview({ storageUsageLabel, lastBackupLabel }: BackupOverviewProps) {
  const metrics = [
    { label: 'Stockage', value: 'Local', icon: Database },
    { label: 'Sauvegarde', value: 'JSON v2', icon: ShieldCheck },
    { label: 'Dernière copie', value: lastBackupLabel ?? 'Chargement…', icon: CalendarClock },
    { label: 'Espace utilisé', value: storageUsageLabel ?? 'Non disponible', icon: HardDrive },
  ] as const;

  return (
    <Card className="mt-6 p-4 sm:p-5" aria-label="Résumé des données locales">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div key={label} className="min-w-0 rounded-xl border border-slate-200/80 p-3 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <p className="truncate text-xs font-semibold uppercase tracking-wide">{label}</p>
            </div>
            <p className="mt-2 break-words text-sm font-bold text-slate-950 dark:text-white">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
