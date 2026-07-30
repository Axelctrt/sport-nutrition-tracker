import { useCallback, useEffect, useMemo, useState } from 'react';

import type { DataSpaceDescriptor } from '@/domain/data-spaces/dataSpace';
import type { AppSettings } from '@/domain/models/settings';
import {
  SettingsCategoryDirectory,
  type SettingsCategoryDirectoryItem,
} from '@/features/settings/components/SettingsCategoryDirectory';
import { settingsHomeCategories } from '@/features/settings/settingsInformationArchitecture';
import { activeDataSpace } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';
import {
  getPersistentStorageStatus,
  type PersistentStorageStatus,
} from '@/infrastructure/storage/persistentStorage';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

const themeLabels: Record<AppSettings['theme'], string> = {
  system: 'Thème du système',
  light: 'Thème clair',
  dark: 'Thème sombre',
};

const densityLabels: Record<AppSettings['dashboardDensity'], string> = {
  comfortable: 'affichage confortable',
  compact: 'affichage compact',
};

function formatBackupDate(value?: string): string {
  if (!value) return 'Aucune sauvegarde exportée';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sauvegarde exportée';
  return `Dernière sauvegarde : ${date.toLocaleDateString('fr-FR')}`;
}

function categorySummary(
  categoryId: SettingsCategoryDirectoryItem['id'],
  settings: AppSettings,
  storageStatus: PersistentStorageStatus,
  dataSpace: DataSpaceDescriptor,
): string {
  switch (categoryId) {
    case 'profile-objectives':
      return 'Profil, poids actuel, objectifs et cibles nutritionnelles';
    case 'account-sync':
      return dataSpace.kind === 'account'
        ? `${dataSpace.label} · ${settings.automaticAccountSyncEnabled ? 'synchronisation automatique active' : 'synchronisation manuelle'}`
        : 'Mode local · connexion possible à tout moment';
    case 'privacy-friends':
      return 'Pseudonyme social et permissions définies par ami';
    case 'appearance-accessibility':
      return `${themeLabels[settings.theme]} · ${densityLabels[settings.dashboardDensity]}`;
    case 'data-backup':
      return `${formatBackupDate(settings.lastBackupExportedAt)} · stockage ${storageStatus === 'persisted' ? 'persistant' : 'standard'}`;
    case 'about':
      return `Version ${__APP_VERSION__}`;
    default:
      return '';
  }
}

interface SettingsHomePageProps {
  settingsRepository?: Pick<typeof repositories.settings, 'get'>;
  readStorageStatus?: typeof getPersistentStorageStatus;
  dataSpace?: DataSpaceDescriptor;
}

export function SettingsHomePage({
  settingsRepository = repositories.settings,
  readStorageStatus = getPersistentStorageStatus,
  dataSpace = activeDataSpace,
}: SettingsHomePageProps = {}) {
  const [settings, setSettings] = useState<AppSettings>();
  const [storageStatus, setStorageStatus] = useState<PersistentStorageStatus>('unsupported');
  const [loadError, setLoadError] = useState<string>();

  const load = useCallback(async () => {
    try {
      const [storedSettings, currentStorageStatus] = await Promise.all([
        settingsRepository.get(),
        readStorageStatus(),
      ]);
      setSettings(storedSettings);
      setStorageStatus(currentStorageStatus);
      setLoadError(undefined);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Les paramètres n’ont pas pu être chargés.');
    }
  }, [readStorageStatus, settingsRepository]);

  useEffect(() => {
    void load();
  }, [load]);

  const categories = useMemo<SettingsCategoryDirectoryItem[]>(() => {
    if (!settings) return [];
    return settingsHomeCategories.map((category) => ({
      ...category,
      summary: categorySummary(category.id, settings, storageStatus, dataSpace),
    }));
  }, [dataSpace, settings, storageStatus]);

  if (loadError) {
    return (
      <InlineNotice tone="error" title="Chargement impossible">
        {loadError}
      </InlineNotice>
    );
  }

  if (!settings) return <PageSkeleton variant="list" />;

  return (
    <section aria-labelledby="settings-home-title" className="min-w-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Configuration de SportPilot
        </p>
        <h1 id="settings-home-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Paramètres
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          Retrouve les réglages selon leur usage. Les valeurs utiles sont visibles avant d’ouvrir une catégorie, tandis que les diagnostics restent dans la section avancée.
        </p>
      </div>

      <p className="mt-4 px-1 text-sm font-medium text-slate-600 dark:text-slate-300">
        {dataSpace.kind === 'account'
          ? `${dataSpace.label} · ${settings.automaticAccountSyncEnabled ? 'synchronisation active' : 'synchronisation manuelle'}`
          : 'Données conservées sur cet appareil'}
      </p>

      <div className="mt-6">
        <SettingsCategoryDirectory categories={categories} />
      </div>

    </section>
  );
}
