import {
  ArrowRight,
  Bell,
  Calculator,
  Cloud,
  DatabaseBackup,
  Footprints,
  Gauge,
  HardDrive,
  MonitorSmartphone,
  Palette,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import { useTheme } from '@/app/providers/useTheme';
import type { AppSettings } from '@/domain/models/settings';
import { AchievementsPanel } from '@/features/settings/components/AchievementsPanel';
import { AdvancedSettingsForm } from '@/features/settings/components/AdvancedSettingsForm';
import { ConsistencyStreakPanel } from '@/features/settings/components/ConsistencyStreakPanel';
import { DataManagementCenter } from '@/features/settings/components/DataManagementCenter';
import { RewardThemesPanel } from '@/features/settings/components/RewardThemesPanel';
import { SettingsOverview } from '@/features/settings/components/SettingsOverview';
import { ActivitySyncSettingsPanel } from '@/features/settings/components/ActivitySyncSettingsPanel';
import { GoalSyncSettingsPanel } from '@/features/settings/components/GoalSyncSettingsPanel';
import { StrengthSyncSettingsPanel } from '@/features/settings/components/StrengthSyncSettingsPanel';
import { NutritionJournalSyncSettingsPanel } from '@/features/settings/components/NutritionJournalSyncSettingsPanel';
import { NutritionLibrarySyncSettingsPanel } from '@/features/settings/components/NutritionLibrarySyncSettingsPanel';
import { NutritionTrackingSyncSettingsPanel } from '@/features/settings/components/NutritionTrackingSyncSettingsPanel';
import { WeightSyncSettingsPanel } from '@/features/settings/components/WeightSyncSettingsPanel';
import { AccountPreferencesSyncSettingsPanel } from '@/features/settings/components/AccountPreferencesSyncSettingsPanel';
import { AutomaticSyncSettingsPanel } from '@/features/settings/components/AutomaticSyncSettingsPanel';
import { RewardsRoutinesSyncSettingsPanel } from '@/features/settings/components/RewardsRoutinesSyncSettingsPanel';
import {
  UnifiedSyncCenterPanel,
  type UnifiedSyncDetailId,
} from '@/features/settings/components/UnifiedSyncCenterPanel';
import {
  SettingsSectionDirectory,
  type SettingsDirectoryItem,
} from '@/features/settings/components/SettingsSectionDirectory';
import type { SettingsFormValues } from '@/features/settings/schemas/settingsSchema';
import {
  settingsFormValuesToChanges,
  settingsToFormValues,
} from '@/features/settings/utils/settingsForm';
import { activeDataSpace } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';
import { ACCOUNT_PREFERENCES_CHANGED_EVENT } from '@/infrastructure/sync-prototype/accountPreferencesSyncEvents';
import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type PersistentStorageStatus,
} from '@/infrastructure/storage/persistentStorage';
import { openSettingsSection } from '@/features/settings/settingsSectionNavigation';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

const settingsSections: readonly SettingsDirectoryItem[] = [
  {
    id: 'settings-profile',
    label: 'Profil et objectifs',
    description: 'Mensurations, objectif de poids, activité et macros.',
    keywords: ['poids', 'objectif', 'proteines', 'lipides'],
    icon: UserRound,
  },
  {
    id: 'settings-dashboard',
    label: 'Tableau de bord',
    description: 'Blocs visibles, ordre et préréglages.',
    keywords: ['accueil', 'widgets', 'blocs'],
    icon: Gauge,
  },
  {
    id: 'settings-reminders',
    label: 'Rappels et routines',
    description: 'Pesée, activité, nutrition et préparation de la semaine.',
    keywords: ['rappel', 'routine', 'pesee', 'nutrition', 'planning'],
    icon: Bell,
  },
  {
    id: 'settings-display-storage',
    label: 'Affichage et stockage',
    description: 'Thème clair ou sombre et persistance locale.',
    keywords: ['theme', 'clair', 'sombre', 'stockage'],
    icon: Palette,
  },
  {
    id: 'settings-rest-timer',
    label: 'Minuteur de repos',
    description: 'Démarrage, vibration et signal sonore.',
    keywords: ['repos', 'vibration', 'son', 'musculation'],
    icon: Footprints,
  },
  {
    id: 'settings-energy',
    label: 'Dépense et activités',
    description: 'Pas inclus, coefficients et valeurs MET.',
    keywords: ['calories', 'met', 'natation', 'depense'],
    icon: Calculator,
  },
  {
    id: 'settings-calibration',
    label: 'Calibration hebdomadaire',
    description: 'Limites des ajustements proposés.',
    keywords: ['bilan', 'ajustement', 'calories'],
    icon: Calculator,
  },
  {
    id: 'settings-themes',
    label: 'Thèmes récompenses',
    description: 'Palettes débloquées grâce aux accomplissements.',
    keywords: ['apparence', 'palette', 'recompense'],
    icon: Palette,
  },
  {
    id: 'settings-motivation',
    label: 'Motivation et régularité',
    description: 'Badges, séries et accomplissements.',
    keywords: ['badges', 'serie', 'missions'],
    icon: Sparkles,
  },
  {
    id: 'settings-account-devices',
    label: 'Compte et appareils',
    description: 'Compte actif, appareil actuel et données locales associées.',
    keywords: ['compte', 'appareil', 'deconnexion', 'desassociation'],
    icon: MonitorSmartphone,
  },
  {
    id: 'settings-sync',
    label: 'Synchronisation des données',
    description: 'Données sportives et nutritionnelles entre appareils.',
    keywords: ['cloud', 'synchronisation', 'profil', 'reglages', 'tableau de bord', 'poids', 'activites', 'objectifs', 'musculation', 'nutrition', 'recettes', 'bilans', 'appareils'],
    icon: Cloud,
  },
  {
    id: 'settings-data',
    label: 'Sauvegardes et données',
    description: 'Persistance, diagnostic, restauration et suppression.',
    keywords: ['json', 'csv', 'backup', 'restauration', 'confidentialite'],
    icon: DatabaseBackup,
  },
] as const;

const syncDetailLabels: Record<UnifiedSyncDetailId, string> = {
  'sync-detail-account-preferences': 'Profil et réglages',
  'sync-detail-rewards-routines': 'Récompenses et routines',
  'sync-detail-weights': 'Pesées',
  'sync-detail-activities': 'Activités',
  'sync-detail-goals': 'Objectifs',
  'sync-detail-strength': 'Musculation',
  'sync-detail-nutrition-journal': 'Journal nutritionnel',
  'sync-detail-nutrition-library': 'Bibliothèque nutritionnelle',
  'sync-detail-nutrition-tracking': 'Suivi nutritionnel',
};

function SyncDetailPanel({
  detailId,
  onClose,
}: {
  readonly detailId: UnifiedSyncDetailId;
  readonly onClose: () => void;
}) {
  const content = (() => {
    switch (detailId) {
      case 'sync-detail-account-preferences':
        return <AccountPreferencesSyncSettingsPanel />;
      case 'sync-detail-rewards-routines':
        return <RewardsRoutinesSyncSettingsPanel />;
      case 'sync-detail-weights':
        return <WeightSyncSettingsPanel />;
      case 'sync-detail-activities':
        return <ActivitySyncSettingsPanel />;
      case 'sync-detail-goals':
        return <GoalSyncSettingsPanel />;
      case 'sync-detail-strength':
        return <StrengthSyncSettingsPanel />;
      case 'sync-detail-nutrition-journal':
        return <NutritionJournalSyncSettingsPanel />;
      case 'sync-detail-nutrition-library':
        return <NutritionLibrarySyncSettingsPanel />;
      case 'sync-detail-nutrition-tracking':
        return <NutritionTrackingSyncSettingsPanel />;
    }
  })();

  const label = syncDetailLabels[detailId];

  return (
    <section
      id={detailId}
      aria-labelledby={`${detailId}-title`}
      className="scroll-mt-24 rounded-2xl border border-brand-200 bg-brand-50/40 p-4 dark:border-brand-900 dark:bg-brand-950/10 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
            Détail de synchronisation
          </p>
          <h3
            id={`${detailId}-title`}
            className="mt-1 text-lg font-semibold text-slate-950 dark:text-white"
          >
            {label}
          </h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Fermer le détail ${label}`}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-600 hover:bg-white hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
        >
          <X aria-hidden="true" className="size-5" />
        </button>
      </div>
      <div className="mt-4">{content}</div>
    </section>
  );
}

export function AdvancedSettingsPage() {
  const { setTheme } = useTheme();
  const actionToast = useActionToast();
  const [settings, setSettings] = useState<AppSettings>();
  const [storageStatus, setStorageStatus] =
    useState<PersistentStorageStatus>('unsupported');
  const [feedback, setFeedback] = useState<
    | {
        tone: 'success' | 'error';
        message: string;
      }
    | undefined
  >();
  const [loadError, setLoadError] = useState<string>();
  const [selectedSyncDetailId, setSelectedSyncDetailId] =
    useState<UnifiedSyncDetailId>();

  const loadSettings = useCallback(async () => {
    try {
      const [storedSettings, currentStorageStatus] = await Promise.all([
        repositories.settings.get(),
        getPersistentStorageStatus(),
      ]);
      setSettings(storedSettings);
      setStorageStatus(currentStorageStatus);
      setLoadError(undefined);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : 'Les paramètres n’ont pas pu être chargés.',
      );
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    const refreshFromSync = () => {
      void loadSettings();
    };
    window.addEventListener(ACCOUNT_PREFERENCES_CHANGED_EVENT, refreshFromSync);
    return () => {
      window.removeEventListener(ACCOUNT_PREFERENCES_CHANGED_EVENT, refreshFromSync);
    };
  }, [loadSettings]);

  const closeSyncDetail = useCallback(() => {
    setSelectedSyncDetailId(undefined);
    window.requestAnimationFrame(() => {
      openSettingsSection('settings-sync');
    });
  }, []);

  useEffect(() => {
    if (!selectedSyncDetailId) return;

    let secondFrame: number | undefined;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        document.getElementById(selectedSyncDetailId)?.scrollIntoView({
          behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
          block: 'start',
          inline: 'nearest',
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame !== undefined) {
        window.cancelAnimationFrame(secondFrame);
      }
    };
  }, [selectedSyncDetailId]);

  const handleSubmit = async (
    values: SettingsFormValues,
  ) => {
    setFeedback(undefined);

    try {
      const updated = await repositories.settings.update(
        settingsFormValuesToChanges(values),
      );
      setSettings(updated);
      setTheme(updated.theme);

      if (updated.requestPersistentStorage) {
        setStorageStatus(await requestPersistentStorage());
      } else {
        setStorageStatus(
          await getPersistentStorageStatus(),
        );
      }

      setFeedback({
        tone: 'success',
        message:
          'Les paramètres avancés ont été enregistrés localement.',
      });
      actionToast.success({
        key: 'advanced-settings-save',
        title: 'Paramètres enregistrés',
      });
    } catch (error) {
      const fallback = 'Les paramètres n’ont pas pu être enregistrés.';
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : fallback,
      });
      actionToast.error({
        key: 'advanced-settings-save',
        error,
        fallback,
      });
    }
  };

  const handleResetToDefaults =
    async (): Promise<SettingsFormValues> => {
      setFeedback(undefined);

      try {
        const defaults =
          await repositories.settings.reset();
        setSettings(defaults);
        setTheme(defaults.theme);
        setStorageStatus(
          defaults.requestPersistentStorage
            ? await requestPersistentStorage()
            : await getPersistentStorageStatus(),
        );
        setFeedback({
          tone: 'success',
          message:
            'Les valeurs par défaut ont été restaurées.',
        });
        actionToast.success({
          key: 'advanced-settings-reset',
          title: 'Paramètres réinitialisés',
          description: 'Les valeurs par défaut ont été restaurées.',
        });
        return settingsToFormValues(defaults);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Les paramètres n’ont pas pu être réinitialisés.';
        setFeedback({
          tone: 'error',
          message,
        });
        actionToast.error({
          key: 'advanced-settings-reset',
          error,
          fallback: message,
        });
        throw error;
      }
    };

  if (loadError) {
    return (
      <InlineNotice tone="error" title="Chargement impossible">
        {loadError}
      </InlineNotice>
    );
  }

  if (!settings) {
    return <PageSkeleton variant="form" />;
  }

  return (
    <section
      aria-labelledby="advanced-settings-title"
      className="min-w-0"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Espace de configuration
        </p>
        <h1
          id="advanced-settings-title"
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
        >
          Paramètres
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          Toutes les rubriques restent repliées pour garder une
          vue compacte. Leur état est mémorisé sur cet appareil.
        </p>
      </div>

      <div className="mt-4">
        <SettingsOverview
          settings={settings}
          storageStatus={storageStatus}
          activeDataSpace={activeDataSpace}
        />
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-4"
          tone={feedback.tone}
          title={
            feedback.tone === 'success'
              ? 'Paramètres enregistrés'
              : 'Enregistrement impossible'
          }
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="mt-4">
        <SettingsSectionDirectory
          sections={settingsSections}
          onOpenSection={(sectionId) => {
            if (sectionId === 'settings-sync') {
              setSelectedSyncDetailId(undefined);
            }
          }}
        />
      </div>

      <div className="mt-4 space-y-3">
        <CollapsibleSection
          sectionId="settings-profile"
          storageKey="sportpilot:settings:profile"
          title="Profil et objectifs"
          description="Modifier les mensurations, l’objectif de poids, l’activité quotidienne et les cibles de macronutriments."
          icon={UserRound}
          className="scroll-mt-24"
        >
          <Card className="p-4 sm:p-5">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les données du profil disposent de leurs propres
              sous-sections repliables.
            </p>
            <Link
              to={routePaths.profile}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white"
            >
              Ouvrir le profil et les objectifs
              <ArrowRight
                aria-hidden="true"
                className="size-4"
              />
            </Link>
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="settings-dashboard"
          storageKey="sportpilot:settings:dashboard"
          title="Tableau de bord personnalisé"
          description="Choisir les blocs visibles, leur ordre et un préréglage."
          icon={Gauge}
          className="scroll-mt-24"
        >
          <Card className="p-4 sm:p-5">
            <Link
              to={routePaths.dashboardCustomization}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white"
            >
              Personnaliser le tableau de bord
              <ArrowRight
                aria-hidden="true"
                className="size-4"
              />
            </Link>
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="settings-reminders"
          storageKey="sportpilot:settings:reminders"
          title="Rappels et routines"
          description="Configurer les rappels de pesée, d’activité, de nutrition et de préparation de la semaine."
          icon={Bell}
          className="scroll-mt-24"
        >
          <Card className="p-4 sm:p-5">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Active les routines utiles, choisis leurs jours et heures, puis définis les heures calmes.
            </p>
            <Link
              to={routePaths.reminders}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white"
            >
              Configurer les rappels et routines
              <ArrowRight
                aria-hidden="true"
                className="size-4"
              />
            </Link>
          </Card>
        </CollapsibleSection>

        <AdvancedSettingsForm
          initialValues={settingsToFormValues(settings)}
          onSubmit={handleSubmit}
          onResetToDefaults={handleResetToDefaults}
        />

        <CollapsibleSection
          sectionId="settings-account-devices"
          storageKey="sportpilot:settings:account-devices"
          title="Compte et appareils"
          description="Consulter le compte actif, l’appareil actuel et gérer les données locales associées."
          icon={MonitorSmartphone}
          className="scroll-mt-24"
        >
          <Card className="p-4 sm:p-5">
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Les actions de déconnexion, de désassociation et de suppression locale sont séparées pour éviter toute suppression ambiguë.
            </p>
            <Link
              to={routePaths.accountDevices}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white"
            >
              Ouvrir Compte et appareils
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </Card>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="settings-sync"
          storageKey="sportpilot:settings:sync"
          title="Synchronisation des données"
          description="Surveiller les échanges sportifs et nutritionnels entre tes appareils."
          icon={Cloud}
          className="scroll-mt-24"
        >
          <div className="space-y-5">
            <AutomaticSyncSettingsPanel />
            <div id="unified-sync-center" className="scroll-mt-24">
              <UnifiedSyncCenterPanel
                activeDetailId={selectedSyncDetailId}
                onOpenDetail={(detailId) => {
                  if (selectedSyncDetailId === detailId) {
                    closeSyncDetail();
                    return;
                  }
                  setSelectedSyncDetailId(detailId);
                }}
              />
            </div>
            {selectedSyncDetailId ? (
              <SyncDetailPanel
                detailId={selectedSyncDetailId}
                onClose={closeSyncDetail}
              />
            ) : null}
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="settings-themes"
          storageKey="sportpilot:settings:themes"
          title="Thèmes visuels à débloquer"
          description="Consulter les palettes disponibles et activer un thème acquis."
          icon={Palette}
          className="scroll-mt-24"
        >
          <RewardThemesPanel />
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="settings-motivation"
          storageKey="sportpilot:settings:motivation"
          title="Motivation et régularité"
          description="Suivre les accomplissements, badges et séries d’utilisation."
          icon={Sparkles}
          className="scroll-mt-24"
        >
          <div className="space-y-4">
            <AchievementsPanel />
            <ConsistencyStreakPanel />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="settings-data"
          storageKey="sportpilot:settings:data"
          title="Sauvegardes, stockage et données"
          description="Vérifier la persistance, diagnostiquer la base et accéder aux restaurations."
          icon={HardDrive}
          className="scroll-mt-24"
        >
          <div className="space-y-4">
            <DataManagementCenter
              storageStatus={storageStatus}
              lastBackupExportedAt={
                settings.lastBackupExportedAt
              }
            />

            <Link
              to={routePaths.backup}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 font-semibold text-white"
            >
              Ouvrir les sauvegardes et restaurations
              <ArrowRight
                aria-hidden="true"
                className="size-4"
              />
            </Link>
          </div>
        </CollapsibleSection>
      </div>
    </section>
  );
}
