import { ArrowLeft, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { normalizeDashboardPreferences, type DashboardPreferences } from '@/domain/dashboard/dashboardPreferences';
import { DashboardCustomizationForm } from '@/features/dashboard-customization/components/DashboardCustomizationForm';
import { repositories } from '@/infrastructure/repositories/repositories';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function DashboardCustomizationPage() {
  const [preferences, setPreferences] = useState<DashboardPreferences>();
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string }>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    void repositories.settings.get().then((settings) => {
      if (mounted) setPreferences(normalizeDashboardPreferences(settings.dashboardPreferences));
    }).catch((error: unknown) => {
      if (mounted) {
        setLoadError(error instanceof Error ? error.message : 'La personnalisation n’a pas pu être chargée.');
      }
    });
    return () => { mounted = false; };
  }, []);

  const savePreferences = async (nextPreferences: DashboardPreferences) => {
    setIsSaving(true);
    setFeedback(undefined);
    try {
      const updated = await repositories.settings.update({ dashboardPreferences: nextPreferences });
      const normalized = normalizeDashboardPreferences(updated.dashboardPreferences);
      setPreferences(normalized);
      setFeedback({ tone: 'success', message: 'Le tableau de bord a été personnalisé sur cet appareil.' });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'La personnalisation n’a pas pu être enregistrée.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadError) {
    return <InlineNotice tone="error" title="Chargement impossible" role="alert">{loadError}</InlineNotice>;
  }
  if (!preferences) return <PageSkeleton variant="form" />;

  return (
    <section aria-labelledby="dashboard-customization-title" className="min-w-0 overflow-x-clip">
      <Link
        to={routePaths.dashboard}
        className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au tableau de bord
      </Link>

      <div className="mt-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Affichage local
        </p>
        <h1 id="dashboard-customization-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Personnaliser le tableau de bord
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Choisis les informations prioritaires et leur ordre. Les données ne sont pas supprimées lorsqu’un bloc est masqué.
        </p>
      </div>

      <InlineNotice className="mt-5" title="Aperçu après enregistrement">
        <span className="inline-flex items-center gap-2">
          <Eye aria-hidden="true" className="size-4" />
          Les changements seront visibles dès le prochain affichage du tableau de bord.
        </span>
      </InlineNotice>

      {feedback ? (
        <InlineNotice
          className="mt-5"
          tone={feedback.tone}
          title={feedback.tone === 'success' ? 'Personnalisation enregistrée' : 'Enregistrement impossible'}
          role={feedback.tone === 'error' ? 'alert' : 'status'}
        >
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="mt-6">
        <DashboardCustomizationForm
          initialPreferences={preferences}
          isSubmitting={isSaving}
          onSubmit={savePreferences}
        />
      </div>
    </section>
  );
}
