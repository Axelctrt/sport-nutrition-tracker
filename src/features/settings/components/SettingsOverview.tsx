import { Calculator, Footprints, HardDrive, Info, Palette } from 'lucide-react';
import type { AppSettings } from '@/domain/models/settings';
import type { PersistentStorageStatus } from '@/infrastructure/storage/persistentStorage';
import { Card } from '@/shared/ui/Card';

const themeLabels: Record<AppSettings['theme'], string> = {
  system: 'Système',
  light: 'Clair',
  dark: 'Sombre',
};

const storageLabels: Record<PersistentStorageStatus, string> = {
  persisted: 'Persistant',
  notPersisted: 'Standard',
  unsupported: 'Indisponible',
};

interface SettingsOverviewProps {
  settings: AppSettings;
  storageStatus: PersistentStorageStatus;
}

export function SettingsOverview({ settings, storageStatus }: SettingsOverviewProps) {
  const metrics = [
    { label: 'Version', value: __APP_VERSION__, icon: Info },
    { label: 'Thème', value: themeLabels[settings.theme], icon: Palette },
    { label: 'Stockage', value: storageLabels[storageStatus], icon: HardDrive },
    {
      label: 'Pas inclus',
      value: settings.includedBaseSteps.toLocaleString('fr-FR'),
      icon: Footprints,
    },
    {
      label: 'Calibration max.',
      value: `±${settings.maximumWeeklyAdjustmentKcal} kcal/j`,
      icon: Calculator,
    },
  ] as const;

  return (
    <Card className="mt-6 p-4 sm:p-5" aria-label="Résumé des paramètres">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
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
