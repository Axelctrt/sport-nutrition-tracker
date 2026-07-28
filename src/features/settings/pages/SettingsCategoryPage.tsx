import {
  ArrowRight,
  Bot,
  Calculator,
  ChartNoAxesCombined,
  Cloud,
  DatabaseBackup,
  Dumbbell,
  FileText,
  Info,
  MonitorSmartphone,
  Palette,
  Scale,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { useTheme } from '@/app/providers/useTheme';
import { routePaths } from '@/app/routePaths';
import { recalculateExistingTargetsAfterSettingsChange } from '@/application/daily/settingsTargetRecalculationService';
import { readPhotoNutritionAiConfig } from '@/application/photo-nutrition/photoNutritionAiClient';
import type { AppSettings } from '@/domain/models/settings';
import { AchievementsPanel } from '@/features/settings/components/AchievementsPanel';
import {
  AdvancedSettingsForm,
  type AdvancedSettingsSectionId,
} from '@/features/settings/components/AdvancedSettingsForm';
import { AutomaticSyncSettingsPanel } from '@/features/settings/components/AutomaticSyncSettingsPanel';
import { ConsistencyStreakPanel } from '@/features/settings/components/ConsistencyStreakPanel';
import { DataManagementCenter } from '@/features/settings/components/DataManagementCenter';
import { RewardThemesPanel } from '@/features/settings/components/RewardThemesPanel';
import type { SettingsFormValues } from '@/features/settings/schemas/settingsSchema';
import { settingsCategoryForPath, type SettingsCategoryId } from '@/features/settings/settingsInformationArchitecture';
import {
  settingsFormValuesToChanges,
  settingsToFormValues,
} from '@/features/settings/utils/settingsForm';
import { repositories } from '@/infrastructure/repositories/repositories';
import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type PersistentStorageStatus,
} from '@/infrastructure/storage/persistentStorage';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

interface SettingsLinkCardProps {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  value?: string;
}

function SettingsLinkCard({ to, title, description, icon: Icon, value }: SettingsLinkCardProps) {
  return (
    <Link to={to} className="group block min-w-0">
      <Card className="h-full p-4 transition group-hover:border-brand-400 group-hover:bg-brand-50/50 group-focus-visible:ring-2 group-focus-visible:ring-brand-500 dark:group-hover:border-brand-700 dark:group-hover:bg-brand-950/20 motion-reduce:transition-none">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-3">
              <span className="font-bold text-slate-950 dark:text-white">{title}</span>
              <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</span>
            {value ? <span className="mt-3 block text-sm font-semibold text-brand-700 dark:text-brand-300">{value}</span> : null}
          </span>
        </div>
      </Card>
    </Link>
  );
}

function CategorySection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="mt-6" aria-labelledby={`category-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <h2 id={`category-${title.replace(/\s+/g, '-').toLowerCase()}`} className="text-xl font-bold text-slate-950 dark:text-white">
        {title}
      </h2>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function settingsSectionsForCategory(categoryId: SettingsCategoryId): readonly AdvancedSettingsSectionId[] {
  switch (categoryId) {
    case 'appearance-accessibility':
      return ['display-storage'];
    case 'notifications-routines':
      return ['rest-timer'];
    case 'nutrition-calculations':
      return ['energy', 'calibration'];
    default:
      return [];
  }
}

function CategoryContent({
  categoryId,
  settings,
  storageStatus,
  onSubmit,
  onResetToDefaults,
}: {
  categoryId: SettingsCategoryId;
  settings: AppSettings;
  storageStatus: PersistentStorageStatus;
  onSubmit: (values: SettingsFormValues) => Promise<void>;
  onResetToDefaults: () => Promise<SettingsFormValues>;
}) {
  const visibleSections = settingsSectionsForCategory(categoryId);

  switch (categoryId) {
    case 'profile-objectives':
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <SettingsLinkCard
            to={routePaths.profile}
            title="Profil et objectifs"
            description="Mensurations, activité professionnelle, objectif de poids et cibles de macros."
            icon={UserRound}
            value="Les changements importants affichent leur impact avant validation."
          />
          <SettingsLinkCard
            to={routePaths.weight}
            title="Poids actuel"
            description="Consulter, ajouter ou corriger les pesées utilisées par SportPilot."
            icon={Scale}
          />
          <SettingsLinkCard
            to={routePaths.goals}
            title="Objectifs et jalons"
            description="Créer des objectifs sportifs et suivre leur progression."
            icon={ChartNoAxesCombined}
          />
          <SettingsLinkCard
            to={routePaths.calculationsInformation}
            title="Comprendre les calculs"
            description="Voir comment les données du profil influencent les estimations."
            icon={Calculator}
          />
        </div>
      );

    case 'account-sync':
      return (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingsLinkCard
              to={routePaths.syncPrototype}
              title="Compte et synchronisation"
              description="Compte actif, état global, dernière synchronisation et action principale."
              icon={Cloud}
              value={settings.automaticAccountSyncEnabled ? 'Synchronisation automatique active' : 'Synchronisation automatique désactivée'}
            />
            <SettingsLinkCard
              to={routePaths.accountDevices}
              title="Appareils et données locales"
              description="Appareil actuel, association au compte et données conservées localement."
              icon={MonitorSmartphone}
            />
          </div>
          <CategorySection title="Synchronisation automatique" description="Les files, conflits, diagnostics et états par rubrique restent accessibles dans les détails avancés.">
            <AutomaticSyncSettingsPanel />
          </CategorySection>
        </>
      );

    case 'privacy-friends':
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <SettingsLinkCard
            to={routePaths.friends}
            title="Amis et confidentialité"
            description="Pseudonyme social, demandes d’amis et permissions de partage par ami."
            icon={ShieldCheck}
            value="Les activités privées et les notes personnelles ne sont jamais exposées."
          />
          <SettingsLinkCard
            to={routePaths.privacy}
            title="Politique de confidentialité"
            description="Comprendre les données stockées localement, synchronisées ou envoyées à un service."
            icon={FileText}
          />
        </div>
      );

    case 'appearance-accessibility':
      return (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingsLinkCard
              to={routePaths.dashboardCustomization}
              title="Personnaliser l’Accueil"
              description="Cartes visibles, ordre, métriques, raccourcis et densité propre à cet appareil."
              icon={Palette}
              value={settings.dashboardDensity === 'compact' ? 'Affichage compact' : 'Affichage confortable'}
            />
          </div>
          <CategorySection title="Thème et stockage local">
            <AdvancedSettingsForm
              initialValues={settingsToFormValues(settings)}
              onSubmit={onSubmit}
              onResetToDefaults={onResetToDefaults}
              visibleSections={visibleSections}
              showResetToDefaults={false}
            />
          </CategorySection>
          <CategorySection title="Thèmes récompenses" description="Les zones tactiles restent identiques en affichage compact.">
            <RewardThemesPanel />
          </CategorySection>
          <InlineNotice className="mt-6" title="Accessibilité système respectée">
            SportPilot conserve le focus clavier visible, prend en compte la réduction des animations et ne réserve aucune action importante à un geste ou au survol.
          </InlineNotice>
        </>
      );

    case 'notifications-routines':
      return (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingsLinkCard
              to={routePaths.reminders}
              title="Rappels et routines"
              description="Pesée, activité, nutrition, préparation de la semaine et heures calmes."
              icon={Sparkles}
            />
          </div>
          <CategorySection title="Minuteur de repos">
            <AdvancedSettingsForm
              initialValues={settingsToFormValues(settings)}
              onSubmit={onSubmit}
              onResetToDefaults={onResetToDefaults}
              visibleSections={visibleSections}
              showResetToDefaults={false}
            />
          </CategorySection>
          <CategorySection title="Motivation et régularité">
            <div className="space-y-4">
              <AchievementsPanel />
              <ConsistencyStreakPanel />
            </div>
          </CategorySection>
        </>
      );

    case 'nutrition-calculations':
      return (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <SettingsLinkCard
              to={routePaths.profile}
              title="Objectif calorique et macros"
              description="Les objectifs personnels et les coefficients de macros sont modifiés depuis le profil."
              icon={UserRound}
            />
            <SettingsLinkCard
              to={routePaths.calculationsInformation}
              title="Explication des calculs"
              description="Consulter les formules, les données utilisées et les limites des estimations."
              icon={Info}
            />
          </div>
          <CategorySection title="Réglages de calcul" description="Ces valeurs sont avancées : conserve les recommandations par défaut sans besoin métier précis.">
            <AdvancedSettingsForm
              initialValues={settingsToFormValues(settings)}
              onSubmit={onSubmit}
              onResetToDefaults={onResetToDefaults}
              visibleSections={visibleSections}
              showResetToDefaults={false}
            />
          </CategorySection>
        </>
      );

    case 'ai-permissions': {
      const aiConfig = readPhotoNutritionAiConfig();
      return (
        <>
          <InlineNotice tone={aiConfig.enabled ? 'success' : 'info'} title={aiConfig.enabled ? 'Analyse photo disponible' : 'Analyse photo distante indisponible'}>
            {aiConfig.enabled
              ? 'Ta photo est analysée uniquement lorsque tu actives l’option pour la photo sélectionnée.'
              : 'Tu peux toujours saisir ton repas manuellement.'}
          </InlineNotice>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SettingsLinkCard
              to={routePaths.photoNutritionEstimate}
              title="Ouvrir l’analyse nutritionnelle par photo"
              description="Vérifier l’écran de consentement et les informations affichées avant l’analyse."
              icon={Bot}
            />
            <SettingsLinkCard
              to={routePaths.privacy}
              title="Traitement des données"
              description="Consulter les engagements de confidentialité et la distinction entre stockage local et services externes."
              icon={ShieldCheck}
            />
          </div>
        </>
      );
    }

    case 'data-backup':
      return (
        <>
          <DataManagementCenter storageStatus={storageStatus} lastBackupExportedAt={settings.lastBackupExportedAt} />
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SettingsLinkCard
              to={routePaths.backup}
              title="Sauvegardes, import et export"
              description="Créer une sauvegarde JSON, restaurer des données ou exporter des fichiers CSV."
              icon={DatabaseBackup}
            />
            <SettingsLinkCard
              to={routePaths.trash}
              title="Corbeille"
              description="Restaurer ou supprimer définitivement les éléments placés dans la corbeille locale."
              icon={DatabaseBackup}
            />
          </div>
        </>
      );

    case 'about':
      return (
        <>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                <Dumbbell aria-hidden="true" className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">SportPilot {__APP_VERSION__}</h2>
                <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">
                  Application mobile-first de suivi sportif, nutritionnel et de progression personnelle. Les données restent locales en mode invité et peuvent être synchronisées avec un compte.
                </p>
              </div>
            </div>
          </Card>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <SettingsLinkCard
              to={routePaths.privacy}
              title="Confidentialité"
              description="Données locales, compte, identité sociale et services externes."
              icon={ShieldCheck}
            />
            <SettingsLinkCard
              to={routePaths.calculationsInformation}
              title="Calculs et estimations"
              description="Principes utilisés pour les calories, les activités et les objectifs."
              icon={Calculator}
            />
            <SettingsLinkCard
              to={routePaths.settingsAdvanced}
              title="Diagnostics avancés"
              description="Outils techniques, intégrité de la base et réglages experts."
              icon={Info}
            />
          </div>
        </>
      );
  }
}

interface SettingsCategoryPageProps {
  settingsRepository?: Pick<typeof repositories.settings, 'get' | 'update' | 'reset'>;
  readStorageStatus?: typeof getPersistentStorageStatus;
  persistStorage?: typeof requestPersistentStorage;
}

export function SettingsCategoryPage({
  settingsRepository = repositories.settings,
  readStorageStatus = getPersistentStorageStatus,
  persistStorage = requestPersistentStorage,
}: SettingsCategoryPageProps = {}) {
  const { pathname } = useLocation();
  const category = settingsCategoryForPath(pathname);
  const { setTheme } = useTheme();
  const actionToast = useActionToast();
  const [settings, setSettings] = useState<AppSettings>();
  const [storageStatus, setStorageStatus] = useState<PersistentStorageStatus>('unsupported');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string }>();
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

  const handleSubmit = async (values: SettingsFormValues) => {
    setFeedback(undefined);
    try {
      const updated = await settingsRepository.update(settingsFormValuesToChanges(values));
      await recalculateExistingTargetsAfterSettingsChange();
      setSettings(updated);
      setTheme(updated.theme);
      setStorageStatus(updated.requestPersistentStorage ? await persistStorage() : await readStorageStatus());
      setFeedback({ tone: 'success', message: 'Les réglages de cette catégorie ont été enregistrés.' });
      actionToast.success({ key: 'settings-category-save', title: 'Paramètres enregistrés' });
    } catch (error) {
      const fallback = 'Les paramètres n’ont pas pu être enregistrés.';
      setFeedback({ tone: 'error', message: error instanceof Error ? error.message : fallback });
      actionToast.error({ key: 'settings-category-save', error, fallback });
    }
  };

  const handleResetToDefaults = async (): Promise<SettingsFormValues> => {
    const defaults = await settingsRepository.reset();
    await recalculateExistingTargetsAfterSettingsChange();
    setSettings(defaults);
    setTheme(defaults.theme);
    return settingsToFormValues(defaults);
  };

  if (!category) {
    return <InlineNotice tone="error" title="Catégorie introuvable">Cette catégorie de paramètres n’existe pas.</InlineNotice>;
  }

  if (loadError) {
    return (
      <InlineNotice tone="error" title="Chargement impossible">
        <p>{loadError}</p>
        <Button
          className="mt-3"
          variant="secondary"
          onClick={() => void load()}
        >
          Réessayer
        </Button>
      </InlineNotice>
    );
  }

  if (!settings) return <PageSkeleton variant="form" />;

  return (
    <section aria-labelledby="settings-category-title" className="min-w-0">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Paramètres</p>
        <h1 id="settings-category-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          {category.title}
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">{category.description}</p>
      </div>

      {feedback ? (
        <InlineNotice
          className="mt-4"
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Paramètres enregistrés' : 'Enregistrement impossible'}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="mt-6">
        <CategoryContent
          categoryId={category.id}
          settings={settings}
          storageStatus={storageStatus}
          onSubmit={handleSubmit}
          onResetToDefaults={handleResetToDefaults}
        />
      </div>
    </section>
  );
}
