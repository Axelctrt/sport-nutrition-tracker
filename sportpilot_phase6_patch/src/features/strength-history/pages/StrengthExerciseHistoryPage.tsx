import { ArrowLeft, BarChart3, Dumbbell } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { buildStrengthExerciseAnalytics } from '@/application/strength/strengthAnalyticsService';
import { routePaths } from '@/app/routePaths';
import { defaultTrackingModeForLoadUnit } from '@/domain/strength/strengthTracking';
import { StrengthExerciseAnalyticsPanel } from '@/features/strength-analytics/components/StrengthExerciseAnalyticsPanel';
import { StrengthHistorySessionCard } from '@/features/strength-history/components/StrengthHistorySessionCard';
import { StrengthHistorySummary } from '@/features/strength-history/components/StrengthHistorySummary';
import { useStrengthExerciseHistory } from '@/features/strength-history/hooks/useStrengthExerciseHistory';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function StrengthExerciseHistoryPage() {
  const { exerciseId = '' } = useParams();
  const { exercise, history, status, errorMessage, refresh } = useStrengthExerciseHistory(exerciseId);

  if (status === 'loading') return <PageSkeleton variant="detail" />;

  if (!exercise) {
    return (
      <InlineNotice tone="error" title="Historique indisponible">
        <p>{errorMessage ?? 'Cet exercice n’existe pas.'}</p>
        <Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button>
      </InlineNotice>
    );
  }

  const analytics = buildStrengthExerciseAnalytics(
    history,
    exercise.trackingMode ?? defaultTrackingModeForLoadUnit(exercise.loadUnit),
  );

  return (
    <section aria-labelledby="strength-history-title">
      <Link to={routePaths.strengthExercises} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au catalogue
      </Link>

      <div className="mt-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Historique et statistiques</p>
        <h1 id="strength-history-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{exercise.name}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Consulte les records, les tendances et le détail des séries validées sans surcharger l’écran.</p>
      </div>

      <StrengthHistorySummary sessionCount={history.length} analytics={analytics} />

      {history.length === 0 ? (
        <EmptyState className="mt-5" icon={Dumbbell} title="Aucune performance enregistrée" description="Termine une séance avec au moins une série validée pour faire apparaître cet historique." />
      ) : (
        <>
          <CollapsibleSection className="mt-4" title="Records et tendances" description="Indicateurs adaptés à la méthode de suivi de l’exercice." summary={<BarChart3 aria-hidden="true" className="size-4" />}>
            <StrengthExerciseAnalyticsPanel analytics={analytics} embedded />
          </CollapsibleSection>

          <div className="mt-7">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">Détail des séances</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ouvre une carte uniquement lorsque tu veux revoir toutes les séries.</p>
          </div>
          <div className="mt-4 space-y-3">
            {history.map((entry) => <StrengthHistorySessionCard key={entry.session.id} entry={entry} />)}
          </div>
        </>
      )}
    </section>
  );
}
