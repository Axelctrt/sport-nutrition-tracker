import {
  ArrowDown,
  ArrowUp,
  Check,
  Gauge,
  LayoutDashboard,
  RotateCcw,
  Save,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  createDashboardPreferencesFromPreset,
  DASHBOARD_QUICK_ACTION_IDS,
  DASHBOARD_QUICK_ACTION_LABELS,
  DASHBOARD_SUMMARY_METRIC_IDS,
  DASHBOARD_SUMMARY_METRIC_LABELS,
  DASHBOARD_WIDGET_DESCRIPTIONS,
  DASHBOARD_WIDGET_LABELS,
  isDashboardWidgetVisible,
  moveDashboardWidget,
  normalizeDashboardPreferences,
  toggleDashboardQuickAction,
  toggleDashboardSummaryMetric,
  toggleDashboardWidget,
  type DashboardDensity,
  type DashboardPreferences,
  type DashboardPreset,
} from '@/domain/dashboard/dashboardPreferences';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface DashboardCustomizationFormProps {
  initialPreferences: DashboardPreferences;
  initialDensity?: DashboardDensity;
  isSubmitting?: boolean;
  onSubmit: (
    preferences: DashboardPreferences,
    density: DashboardDensity,
  ) => Promise<void> | void;
}

const PRESETS: Array<{
  id: Exclude<DashboardPreset, 'custom'>;
  title: string;
  description: string;
}> = [
  { id: 'balanced', title: 'Équilibré', description: 'Nutrition, actions, sport et détails.' },
  { id: 'nutrition', title: 'Nutrition', description: 'Le suivi alimentaire passe en premier.' },
  { id: 'training', title: 'Entraînement', description: 'Séance, actions et activités prioritaires.' },
  { id: 'minimal', title: 'Essentiel', description: 'Résumé et actions rapides uniquement.' },
];

const DENSITIES: Array<{
  id: DashboardDensity;
  title: string;
  description: string;
}> = [
  {
    id: 'comfortable',
    title: 'Confortable',
    description: 'Plus d’espace entre les cartes et les informations.',
  },
  {
    id: 'compact',
    title: 'Compact',
    description: 'Davantage d’informations visibles sans réduire les zones tactiles.',
  },
];

export function DashboardCustomizationForm({
  initialPreferences,
  initialDensity = 'comfortable',
  isSubmitting = false,
  onSubmit,
}: DashboardCustomizationFormProps) {
  const [preferences, setPreferences] = useState(() => normalizeDashboardPreferences(initialPreferences));
  const [density, setDensity] = useState<DashboardDensity>(initialDensity);

  useEffect(() => {
    setPreferences(normalizeDashboardPreferences(initialPreferences));
    setDensity(initialDensity);
  }, [initialDensity, initialPreferences]);

  const visibleCount = useMemo(
    () => preferences.order.filter((widgetId) => isDashboardWidgetVisible(preferences, widgetId)).length,
    [preferences],
  );

  const applyPreset = (preset: Exclude<DashboardPreset, 'custom'>) => {
    setPreferences(createDashboardPreferencesFromPreset(preset));
  };

  return (
    <form
      className="space-y-7"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(preferences, density);
      }}
    >
      <section aria-labelledby="dashboard-presets-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="dashboard-presets-title" className="text-lg font-bold text-slate-950 dark:text-white">
              Disposition recommandée
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Choisissez une base claire, puis adaptez uniquement ce qui vous est utile.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {preferences.preset === 'custom' ? 'Personnalisé' : 'Préréglage actif'}
          </span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {PRESETS.map((preset) => {
            const selected = preferences.preset === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                className={`min-h-24 rounded-2xl border p-4 text-left transition-colors ${selected
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'}`}
                aria-pressed={selected}
                onClick={() => applyPreset(preset.id)}
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-bold text-slate-950 dark:text-white">{preset.title}</span>
                  {selected ? <Check aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" /> : null}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {preset.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="dashboard-density-title">
        <h2 id="dashboard-density-title" className="text-lg font-bold text-slate-950 dark:text-white">
          Densité sur cet appareil
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Ce choix reste propre à cet appareil afin d’adapter séparément le mobile et l’ordinateur.
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {DENSITIES.map((option) => {
            const selected = density === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                className={`min-h-20 rounded-2xl border p-4 text-left transition-colors ${selected
                  ? 'border-brand-500 bg-brand-50 dark:border-brand-600 dark:bg-brand-950/40'
                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'}`}
                onClick={() => setDensity(option.id)}
              >
                <span className="flex items-center gap-2 font-bold text-slate-950 dark:text-white">
                  <Gauge aria-hidden="true" className="size-5" />
                  {option.title}
                </span>
                <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {option.description}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="dashboard-metrics-title">
        <h2 id="dashboard-metrics-title" className="text-lg font-bold text-slate-950 dark:text-white">
          Métriques du résumé
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Les calories restent toujours visibles. Choisissez les autres indicateurs principaux.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {DASHBOARD_SUMMARY_METRIC_IDS.map((metricId) => (
            <label
              key={metricId}
              className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="font-semibold text-slate-900 dark:text-white">
                {DASHBOARD_SUMMARY_METRIC_LABELS[metricId]}
              </span>
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-brand-700"
                checked={preferences.summaryMetrics.includes(metricId)}
                onChange={() => setPreferences((current) => toggleDashboardSummaryMetric(current, metricId))}
              />
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="dashboard-actions-title">
        <h2 id="dashboard-actions-title" className="text-lg font-bold text-slate-950 dark:text-white">
          Raccourcis visibles
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Au moins une action reste affichée pour conserver un Accueil immédiatement utilisable.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DASHBOARD_QUICK_ACTION_IDS.map((actionId) => (
            <label
              key={actionId}
              className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-900 dark:text-white">
                <Zap aria-hidden="true" className="size-4 shrink-0 text-brand-700 dark:text-brand-300" />
                {DASHBOARD_QUICK_ACTION_LABELS[actionId]}
              </span>
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-brand-700"
                checked={preferences.quickActions.includes(actionId)}
                onChange={() => setPreferences((current) => toggleDashboardQuickAction(current, actionId))}
              />
            </label>
          ))}
        </div>
      </section>

      <section aria-labelledby="dashboard-blocks-title">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 id="dashboard-blocks-title" className="text-lg font-bold text-slate-950 dark:text-white">
              Blocs et ordre d’affichage
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Les boutons de déplacement restent utilisables au clavier et sur mobile.
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {visibleCount} visible{visibleCount > 1 ? 's' : ''}
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {preferences.order.map((widgetId, index) => {
            const visible = isDashboardWidgetVisible(preferences, widgetId);
            return (
              <Card key={widgetId} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <LayoutDashboard aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <label className="flex cursor-pointer items-start justify-between gap-4">
                      <span>
                        <span className="block font-bold text-slate-950 dark:text-white">
                          {DASHBOARD_WIDGET_LABELS[widgetId]}
                        </span>
                        <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                          {DASHBOARD_WIDGET_DESCRIPTIONS[widgetId]}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        className="mt-1 size-5 shrink-0 accent-brand-700"
                        checked={visible}
                        aria-label={`Afficher ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                        onChange={() => setPreferences((current) => toggleDashboardWidget(current, widgetId))}
                      />
                    </label>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={index === 0}
                        aria-label={`Monter ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                        onClick={() => setPreferences((current) => moveDashboardWidget(current, widgetId, 'up'))}
                      >
                        <ArrowUp aria-hidden="true" className="size-4" />
                        Monter
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={index === preferences.order.length - 1}
                        aria-label={`Descendre ${DASHBOARD_WIDGET_LABELS[widgetId]}`}
                        onClick={() => setPreferences((current) => moveDashboardWidget(current, widgetId, 'down'))}
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                        Descendre
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 -mx-2 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur sm:static sm:mx-0 sm:flex-row dark:border-slate-800 dark:bg-slate-950/95">
        <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
          <Save aria-hidden="true" className="size-4" />
          {isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          disabled={isSubmitting}
          onClick={() => applyPreset('balanced')}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Rétablir la disposition recommandée
        </Button>
      </div>
    </form>
  );
}
