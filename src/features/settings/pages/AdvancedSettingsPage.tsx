import { useEffect, useState } from 'react';
import { useTheme } from '@/app/providers/useTheme';
import type { AppSettings } from '@/domain/models/settings';
import { AdvancedSettingsForm } from '@/features/settings/components/AdvancedSettingsForm';
import { SettingsOverview } from '@/features/settings/components/SettingsOverview';
import type { SettingsFormValues } from '@/features/settings/schemas/settingsSchema';
import {
  settingsFormValuesToChanges,
  settingsToFormValues,
} from '@/features/settings/utils/settingsForm';
import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type PersistentStorageStatus,
} from '@/infrastructure/storage/persistentStorage';
import { repositories } from '@/infrastructure/repositories/repositories';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';
import { InlineNotice } from '@/shared/ui/InlineNotice';

const storageLabels: Record<PersistentStorageStatus, { title: string; description: string }> = {
  persisted: {
    title: 'Stockage persistant actif',
    description: 'Le navigateur indique qu’il ne supprimera pas automatiquement les données locales.',
  },
  notPersisted: {
    title: 'Stockage persistant non accordé',
    description: 'Les données restent utilisables, mais un export JSON régulier sera recommandé.',
  },
  unsupported: {
    title: 'Statut de persistance indisponible',
    description: 'Ce navigateur ne permet pas de vérifier ou demander cette protection.',
  },
};

export function AdvancedSettingsPage() {
  const { setTheme } = useTheme();
  const [settings, setSettings] = useState<AppSettings | undefined>();
  const [storageStatus, setStorageStatus] = useState<PersistentStorageStatus>('unsupported');
  const [feedback, setFeedback] = useState<
    { tone: 'success' | 'error'; message: string } | undefined
  >();
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const [storedSettings, currentStorageStatus] = await Promise.all([
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

  const handleSubmit = async (values: SettingsFormValues) => {
    setFeedback(undefined);

    try {
      const updated = await repositories.settings.update(settingsFormValuesToChanges(values));
      setSettings(updated);
      setTheme(updated.theme);

      if (updated.requestPersistentStorage) {
        setStorageStatus(await requestPersistentStorage());
      } else {
        setStorageStatus(await getPersistentStorageStatus());
      }

      setFeedback({
        tone: 'success',
        message: 'Les paramètres avancés ont été enregistrés localement.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'Les paramètres n’ont pas pu être enregistrés.',
      });
    }
  };

  const handleResetToDefaults = async (): Promise<SettingsFormValues> => {
    setFeedback(undefined);

    try {
      const defaults = await repositories.settings.reset();
      setSettings(defaults);
      setTheme(defaults.theme);
      setStorageStatus(
        defaults.requestPersistentStorage
          ? await requestPersistentStorage()
          : await getPersistentStorageStatus(),
      );
      setFeedback({
        tone: 'success',
        message: 'Les valeurs par défaut ont été restaurées.',
      });
      return settingsToFormValues(defaults);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Les paramètres n’ont pas pu être réinitialisés.';
      setFeedback({ tone: 'error', message });
      throw error;
    }
  };

  if (loadError) {
    return (
      <InlineNotice tone="error" title="Chargement impossible" role="alert">
        {loadError}
      </InlineNotice>
    );
  }

  if (!settings) {
    return <PageSkeleton variant="form" />;
  }

  const storagePresentation = storageLabels[storageStatus];

  return (
    <section aria-labelledby="settings-title" className="min-w-0 overflow-x-clip">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Réglages du moteur
        </p>
        <h1 id="settings-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Paramètres avancés
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Ces coefficients permettent d’adapter les estimations énergétiques et nutritionnelles. Les valeurs par défaut peuvent être personnalisées.
        </p>
      </div>

      <SettingsOverview settings={settings} storageStatus={storageStatus} />

      <InlineNotice className="mt-4" title={storagePresentation.title}>
        {storagePresentation.description}
      </InlineNotice>

      {feedback ? (
        <InlineNotice
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Paramètres mis à jour' : 'Enregistrement impossible'}
          className="mt-6"
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="mt-6">
        <AdvancedSettingsForm
          initialValues={settingsToFormValues(settings)}
          onSubmit={handleSubmit}
          onResetToDefaults={handleResetToDefaults}
        />
      </div>
    </section>
  );
}
