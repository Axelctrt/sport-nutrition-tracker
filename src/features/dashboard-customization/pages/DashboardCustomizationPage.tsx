import { ArrowLeft, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import {
  normalizeDashboardPreferences,
  type DashboardDensity,
  type DashboardPreferences,
} from '@/domain/dashboard/dashboardPreferences';
import { DashboardCustomizationForm } from '@/features/dashboard-customization/components/DashboardCustomizationForm';
import { repositories } from '@/infrastructure/repositories/repositories';
import { useActionToast } from '@/shared/toast/useActionToast';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function DashboardCustomizationPage() {
  const actionToast = useActionToast();
  const [preferences, setPreferences] = useState<DashboardPreferences>();
  const [density, setDensity] = useState<DashboardDensity>('comfortable');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string }>();
  const [loadError, setLoadError] = useState<string>();

  useEffect(() => {
    let mounted = true;
    void repositories.settings.get().then((settings) => {
      if (!mounted) return;
      setPreferences(normalizeDashboardPreferences(settings.dashboardPreferences));
      setDensity(settings.dashboardDensity ?? 'comfortable');
    }).catch((error: unknown) => {
      if (mounted) {
        setLoadError(error instanceof Error ? error.message : 'La personnalisation n’a pas pu être chargée.');
      }
    });
    return () => { mounted = false; };
  }, []);

  const savePreferences = async (
    nextPreferences: DashboardPreferences,
    nextDensity: DashboardDensity,
  ) => {
    setIsSaving(true);
    setFeedback(undefined);
    try {
      const updated = await repositories.settings.update({
        dashboardPreferences: nextPreferences,
        dashboardDensity: nextDensity,
      });
      const normalized = normalizeDashboardPreferences(updated.dashboardPreferences);
      setPreferences(normalized);
      setDensity(updated.dashboardDensity ?? 'comfortable');
      setFeedback({
        tone: 'success',
        message: 'L’affichage est enregistré. Les informations et le bloc complémentaire suivent le compte ; la densité reste propre à cet appareil.',
      });
      actionToast.success({
        key: 'dashboard-customization',
        title: 'Accueil personnalisé',
      });
    } catch (error) {
      const fallback = 'La personnalisation n’a pas pu être enregistrée.';
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : fallback,
      });
      actionToast.error({
        key: 'dashboard-customization',
        error,
        fallback,
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
        className="hidden min-h-10 items-center gap-2 text-sm font-semibold text-brand-700 hover:underline lg:inline-flex dark:text-brand-300"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour à l’Accueil
      </Link>

      <div className="mt-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Accueil
        </p>
        <h1 id="dashboard-customization-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">
          Affichage de l’Accueil
        </h1>
        <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
          Le résumé calorique et l’assistant quotidien restent fixes. Choisis seulement les informations utiles et, si besoin, un bloc complémentaire.
        </p>
      </div>

      <InlineNotice className="mt-5" title="Synchronisation maîtrisée">
        <span className="inline-flex items-start gap-2">
          <Eye aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Les informations du résumé et le bloc complémentaire suivent le compte. La densité confortable ou compacte reste propre à cet appareil.
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
          initialDensity={density}
          isSubmitting={isSaving}
          onSubmit={savePreferences}
        />
      </div>
    </section>
  );
}
