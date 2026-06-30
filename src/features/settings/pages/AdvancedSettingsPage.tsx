import {
  ArrowRight,
  Bell,
  Calculator,
  Cloud,
  DatabaseBackup,
  Footprints,
  Gauge,
  HardDrive,
  Palette,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useEffect, useState } from 'react';
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
import { WeightSyncSettingsPanel } from '@/features/settings/components/WeightSyncSettingsPanel';
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
import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type PersistentStorageStatus,
} from '@/infrastructure/storage/persistentStorage';
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
    id: 'settings-sync',
    label: 'Synchronisation des pesées',
    description: 'Activation, état et relance des échanges entre appareils.',
    keywords: ['cloud', 'synchronisation', 'poids', 'appareils'],
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

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [storedSettings, currentStorageStatus] =
          await Promise.all([
            repositories.settings.get(),
            getPersistentStorageStatus(),
          ]);

        if (isMounted) {
          setSettings(storedSettings);
          setStorageStatus(currentStorageStatus);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Les paramètres n’ont pas pu être chargés.',
          );
        }
      }
    };

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

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
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Les paramètres n’ont pas pu être enregistrés.',
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
          sectionId="settings-sync"
          storageKey="sportpilot:settings:sync"
          title="Synchronisation des pesées"
          description="Activer et surveiller les échanges de pesées entre tes appareils."
          icon={Cloud}
          className="scroll-mt-24"
        >
          <WeightSyncSettingsPanel />
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
