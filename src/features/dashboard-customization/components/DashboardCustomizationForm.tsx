import {
  BarChart3,
  Check,
  CircleOff,
  Gauge,
  RotateCcw,
  Save,
  Trophy,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  createDefaultDashboardPreferences,
  DASHBOARD_SUMMARY_METRIC_IDS,
  DASHBOARD_SUMMARY_METRIC_LABELS,
  normalizeDashboardPreferences,
  setDashboardSupplementalBlock,
  toggleDashboardSummaryMetric,
  type DashboardDensity,
  type DashboardPreferences,
  type DashboardSupplementalBlock,
} from '@/domain/dashboard/dashboardPreferences';
import { Button } from '@/shared/ui/Button';

interface DashboardCustomizationFormProps {
  initialPreferences: DashboardPreferences;
  initialDensity?: DashboardDensity;
  isSubmitting?: boolean;
  onSubmit: (
    preferences: DashboardPreferences,
    density: DashboardDensity,
  ) => Promise<void> | void;
}

const DENSITIES: Array<{
  id: DashboardDensity;
  title: string;
}> = [
  { id: 'comfortable', title: 'Confortable' },
  { id: 'compact', title: 'Compact' },
];

const SUPPLEMENTAL_BLOCKS: Array<{
  id: DashboardSupplementalBlock;
  title: string;
  description: string;
  icon: typeof CircleOff;
}> = [
  {
    id: 'none',
    title: 'Aucun',
    description: 'Recommandé pour garder un Accueil centré sur la journée.',
    icon: CircleOff,
  },
  {
    id: 'weeklyProgress',
    title: 'Progression de la semaine',
    description: 'Une synthèse courte du poids, du tour de taille et du suivi.',
    icon: BarChart3,
  },
  {
    id: 'achievements',
    title: 'Accomplissements',
    description: 'Le prochain badge et un accès au centre de récompenses.',
    icon: Trophy,
  },
];

export function DashboardCustomizationForm({
  initialPreferences,
  initialDensity = 'comfortable',
  isSubmitting = false,
  onSubmit,
}: DashboardCustomizationFormProps) {
  const [preferences, setPreferences] = useState(
    () => normalizeDashboardPreferences(initialPreferences),
  );
  const [density, setDensity] = useState<DashboardDensity>(initialDensity);

  useEffect(() => {
    setPreferences(normalizeDashboardPreferences(initialPreferences));
    setDensity(initialDensity);
  }, [initialDensity, initialPreferences]);

  const reset = () => {
    setPreferences(createDefaultDashboardPreferences());
    setDensity('comfortable');
  };

  return (
    <form
      className="space-y-7"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(preferences, density);
      }}
    >
      <fieldset>
        <legend className="text-lg font-bold text-slate-950 dark:text-white">
          Densité sur cet appareil
        </legend>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Ce choix peut être différent sur ton téléphone et ton ordinateur.
        </p>
        <div className="mt-3 inline-grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1 sm:w-auto dark:bg-slate-800">
          {DENSITIES.map((option) => {
            const selected = density === option.id;
            return (
              <label
                key={option.id}
                className={`flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors ${
                  selected
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-950 dark:text-white'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <input
                  type="radio"
                  name="dashboard-density"
                  value={option.id}
                  checked={selected}
                  className="sr-only"
                  onChange={() => setDensity(option.id)}
                />
                <Gauge aria-hidden="true" className="size-4" />
                {option.title}
              </label>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold text-slate-950 dark:text-white">
          Informations du résumé
        </legend>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Les calories restent toujours visibles.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {DASHBOARD_SUMMARY_METRIC_IDS.map((metricId) => (
            <label
              key={metricId}
              className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="font-semibold text-slate-900 dark:text-white">
                {DASHBOARD_SUMMARY_METRIC_LABELS[metricId]}
              </span>
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-brand-700"
                checked={preferences.summaryMetrics.includes(metricId)}
                onChange={() => setPreferences(
                  (current) => toggleDashboardSummaryMetric(current, metricId),
                )}
              />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-lg font-bold text-slate-950 dark:text-white">
          Bloc complémentaire
        </legend>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Un seul bloc peut apparaître sous l’assistant quotidien.
        </p>
        <div className="mt-3 space-y-2">
          {SUPPLEMENTAL_BLOCKS.map((option) => {
            const selected = preferences.supplementalBlock === option.id;
            const Icon = option.icon;
            return (
              <label
                key={option.id}
                className={`flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors ${
                  selected
                    ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
                }`}
              >
                <input
                  type="radio"
                  name="dashboard-supplemental-block"
                  value={option.id}
                  checked={selected}
                  className="sr-only"
                  onChange={() => setPreferences(
                    (current) => setDashboardSupplementalBlock(current, option.id),
                  )}
                />
                <Icon
                  aria-hidden="true"
                  className="size-5 shrink-0 text-brand-700 dark:text-brand-300"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-slate-950 dark:text-white">
                    {option.title}
                  </span>
                  <span className="mt-1 block text-sm text-slate-600 dark:text-slate-300">
                    {option.description}
                  </span>
                </span>
                {selected ? (
                  <Check
                    aria-hidden="true"
                    className="size-5 shrink-0 text-brand-700 dark:text-brand-300"
                  />
                ) : null}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:mx-0 sm:flex-row dark:border-slate-800 dark:bg-slate-950/95">
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
          <Save aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={reset}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Rétablir l’affichage recommandé
        </Button>
      </div>
    </form>
  );
}
