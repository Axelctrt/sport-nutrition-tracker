import {
  ArrowRight,
  Calculator,
  Cloud,
  DatabaseBackup,
  HardDrive,
  MonitorSmartphone,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { useTheme } from '@/app/providers/useTheme';
import { routePaths } from '@/app/routePaths';
import { recalculateExistingTargetsAfterSettingsChange } from '@/application/daily/settingsTargetRecalculationService';
import type { AppSettings } from '@/domain/models/settings';
import { SocialActivityCloudReadinessPanel } from '@/features/friends/components/SocialActivityCloudReadinessPanel';
import { AccountPreferencesSyncSettingsPanel } from '@/features/settings/components/AccountPreferencesSyncSettingsPanel';
import { ActivitySyncSettingsPanel } from '@/features/settings/components/ActivitySyncSettingsPanel';
import { AdvancedSettingsForm } from '@/features/settings/components/AdvancedSettingsForm';
import { AutomaticSyncSettingsPanel } from '@/features/settings/components/AutomaticSyncSettingsPanel';
import { DataManagementCenter } from '@/features/settings/components/DataManagementCenter';
import { GoalSyncSettingsPanel } from '@/features/settings/components/GoalSyncSettingsPanel';
import { NutritionJournalSyncSettingsPanel } from '@/features/settings/components/NutritionJournalSyncSettingsPanel';
import { NutritionLibrarySyncSettingsPanel } from '@/features/settings/components/NutritionLibrarySyncSettingsPanel';
import { NutritionTrackingSyncSettingsPanel } from '@/features/settings/components/NutritionTrackingSyncSettingsPanel';
import { RewardsRoutinesSyncSettingsPanel } from '@/features/settings/components/RewardsRoutinesSyncSettingsPanel';
import { SettingsPageIntro } from '@/features/settings/components/SettingsPageIntro';
import {
  SettingsSectionDirectory,
  type SettingsDirectoryItem,
} from '@/features/settings/components/SettingsSectionDirectory';
import { StrengthSyncSettingsPanel } from '@/features/settings/components/StrengthSyncSettingsPanel';
import {
  UnifiedSyncCenterPanel,
  type UnifiedSyncDetailId,
} from '@/features/settings/components/UnifiedSyncCenterPanel';
import { WeightSyncSettingsPanel } from '@/features/settings/components/WeightSyncSettingsPanel';
import type { SettingsFormValues } from '@/features/settings/schemas/settingsSchema';
import { openSettingsSection } from '@/features/settings/settingsSectionNavigation';
import {
  settingsFormValuesToChanges,
  settingsToFormValues,
} from '@/features/settings/utils/settingsForm';
import { activeDataSpace } from '@/infrastructure/database/database';
import { repositories } from '@/infrastructure/repositories/repositories';
import { createSocialActivityFeedCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';
import { ACCOUNT_PREFERENCES_CHANGED_EVENT } from '@/infrastructure/sync-prototype/accountPreferencesSyncEvents';
import { getSyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type PersistentStorageStatus,
} from '@/infrastructure/storage/persistentStorage';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { IconAction } from '@/shared/ui/IconAction';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

const settingsSections: readonly SettingsDirectoryItem[] = [
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
    id: 'settings-social-diagnostic',
    label: 'Diagnostic social',
    description: 'Disponibilité des fonctions Amis et du partage cloud.',
    keywords: ['amis', 'social', 'cloud', 'diagnostic'],
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

function SettingsActionLink({
  to,
  children,
}: {
  to: string;
  children: string;
}) {
  return (
    <Link
      to={to}
      className="sp-button inline-flex min-h-[var(--sp-control-height-md)] items-center gap-2 rounded-[var(--sp-radius-control)] px-4 text-sm font-semibold"
    >
      {children}
      <ArrowRight aria-hidden="true" className="size-4" />
    </Link>
  );
}

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
    <Card
      id={detailId}
      aria-labelledby={`${detailId}-title`}
      variant="muted"
      padding="md"
      className="scroll-mt-24"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--sp-accent-primary)]">
            Détail de synchronisation
          </p>
          <h3
            id={`${detailId}-title`}
            className="mt-1 text-lg font-semibold text-[var(--sp-text-primary)]"
          >
            {label}
          </h3>
        </div>
        <IconAction
          icon={X}
          label={`Fermer le détail ${label}`}
          variant="ghost"
          onClick={onClose}
        />
      </div>
      <div className="mt-4">{content}</div>
    </Card>
  );
}

async function readSocialDiagnosticCredentials() {
  try {
    return await getSyncPrototypeClient().ensureValidCloudCredentials?.()
      ?? getSyncPrototypeClient().getCloudCredentials?.();
  } catch {
    return undefined;
  }
}

function subscribeSocialDiagnostic(listener: () => void) {
  try {
    return getSyncPrototypeClient().subscribe(listener);
  } catch {
    return () => undefined;
  }
}

export function AdvancedSettingsPage() {
  const { setTheme } = useTheme();
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
  const [socialDiagnosticGateway] = useState(() => createSocialActivityFeedCloudGateway());

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
      await recalculateExistingTargetsAfterSettingsChange();
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
    } catch (error) {
      const fallback = 'Les paramètres n’ont pas pu être enregistrés.';
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : fallback,
      });
    }
  };

  const handleResetToDefaults =
    async (): Promise<SettingsFormValues> => {
      setFeedback(undefined);

      try {
        const defaults =
          await repositories.settings.reset();
        await recalculateExistingTargetsAfterSettingsChange();
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
        throw error;
      }
    };

  if (loadError) {
    return (
      <InlineNotice tone="error" title="Chargement impossible">
        <p>{loadError}</p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => void loadSettings()}
        >
          Réessayer
        </Button>
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
      <SettingsPageIntro
        titleId="advanced-settings-title"
        eyebrow="Configuration avancée"
        title="Paramètres avancés"
        description="Cette page regroupe les coefficients experts, les diagnostics et les outils techniques. Les réglages courants restent accessibles depuis l’accueil des Paramètres."
      />

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
        <AdvancedSettingsForm
          initialValues={settingsToFormValues(settings)}
          onSubmit={handleSubmit}
          onResetToDefaults={handleResetToDefaults}
          visibleSections={['energy', 'calibration']}
        />

        <CollapsibleSection
          sectionId="settings-account-devices"
          storageKey="sportpilot:settings:account-devices"
          title="Compte et appareils"
          description="Consulter le compte actif, l’appareil actuel et gérer les données locales associées."
          icon={MonitorSmartphone}
          className="scroll-mt-24"
        >
          <Card padding="md">
            <p className="text-sm leading-6 text-[var(--sp-text-secondary)]">
              Les actions de déconnexion, de désassociation et de suppression locale sont séparées pour éviter toute suppression ambiguë.
            </p>
            <div className="mt-4">
              <SettingsActionLink to={routePaths.accountDevices}>
                Ouvrir Compte et appareils
              </SettingsActionLink>
            </div>
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
          sectionId="settings-social-diagnostic"
          storageKey="sportpilot:settings:social-diagnostic"
          title="Diagnostic social"
          description="Vérifier la disponibilité des fonctions Amis sans encombrer le fil d’activité."
          icon={Cloud}
          className="scroll-mt-24"
        >
          <SocialActivityCloudReadinessPanel
            gateway={socialDiagnosticGateway}
            getCredentials={readSocialDiagnosticCredentials}
            subscribeCredentials={subscribeSocialDiagnostic}
          />
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
              isAccountSpace={activeDataSpace.kind === 'account'}
              storageStatus={storageStatus}
              lastBackupExportedAt={
                settings.lastBackupExportedAt
              }
            />

            <SettingsActionLink to={routePaths.backup}>
              Ouvrir les sauvegardes et restaurations
            </SettingsActionLink>
          </div>
        </CollapsibleSection>
      </div>
    </section>
  );
}
