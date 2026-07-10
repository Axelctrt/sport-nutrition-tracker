import { Activity, Dumbbell, Footprints, Plus, Scale, ScanLine } from 'lucide-react';
import { useCallback, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import {
  addFoodPath,
  barcodeScannerPath,
  routePaths,
  workoutSessionPath,
} from '@/app/routePaths';
import {
  DASHBOARD_QUICK_ACTION_IDS,
  type DashboardDensity,
  type DashboardQuickActionId,
} from '@/domain/dashboard/dashboardPreferences';
import type { NewEntity } from '@/domain/models/common';
import type { DailySteps } from '@/domain/models/steps';
import type { WeightEntry } from '@/domain/models/weight';
import { DashboardQuickEntryDialog } from '@/features/dashboard/components/DashboardQuickEntryDialog';
import type { ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { StepsForm } from '@/features/steps/components/StepsForm';
import type { StepsFormValues } from '@/features/steps/schemas/stepsSchema';
import { WeightEntryForm } from '@/features/weight/components/WeightEntryForm';
import type { WeightEntryFormValues } from '@/features/weight/schemas/weightEntrySchema';
import { useActionToast } from '@/shared/toast/useActionToast';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface DashboardQuickActionsProps {
  date: string;
  totalSteps: number;
  stepsEntry?: DailySteps;
  weightKg: number;
  weightEntry?: WeightEntry;
  activeWorkout?: ActiveWorkoutSummary;
  visibleActions?: readonly DashboardQuickActionId[];
  density?: DashboardDensity;
  onSaveWeight: (data: NewEntity<WeightEntry>) => Promise<void>;
  onSaveSteps: (data: NewEntity<DailySteps>) => Promise<void>;
}

type ActionIcon = ComponentType<SVGProps<SVGSVGElement>>;
type QuickEntry = 'steps' | 'weight';

type Feedback = {
  tone: 'success' | 'error';
  title: string;
  message: string;
};

function ActionContent({ icon: Icon, label }: { icon: ActionIcon; label: string }) {
  return (
    <>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        <Icon aria-hidden="true" className="size-4.5" />
      </span>
      <span className="min-w-0 leading-tight">{label}</span>
    </>
  );
}

export function DashboardQuickActions({
  date,
  totalSteps,
  stepsEntry,
  weightKg,
  weightEntry,
  activeWorkout,
  visibleActions = DASHBOARD_QUICK_ACTION_IDS,
  density = 'comfortable',
  onSaveWeight,
  onSaveSteps,
}: DashboardQuickActionsProps) {
  const actionToast = useActionToast();
  const [quickEntry, setQuickEntry] = useState<QuickEntry>();
  const [feedback, setFeedback] = useState<Feedback>();
  const [dialogError, setDialogError] = useState<string>();
  const workoutPath = activeWorkout
    ? workoutSessionPath(activeWorkout.session.id)
    : routePaths.workoutSessions;
  const actionClassName = density === 'compact'
    ? 'flex min-h-14 min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800'
    : 'flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

  const openQuickEntry = useCallback((entry: QuickEntry) => {
    setFeedback(undefined);
    setDialogError(undefined);
    setQuickEntry(entry);
  }, []);

  const closeQuickEntry = useCallback(() => {
    setDialogError(undefined);
    setQuickEntry(undefined);
  }, []);

  const handleStepsSubmit = async (values: StepsFormValues) => {
    setDialogError(undefined);
    try {
      await onSaveSteps({ date, totalSteps: values.totalSteps, source: 'manual' });
      const message = 'Les pas du jour et la dépense estimée ont été actualisés.';
      setFeedback({ tone: 'success', title: 'Pas enregistrés', message });
      actionToast.success({
        key: `dashboard-steps:${date}`,
        title: 'Pas enregistrés',
        description: message,
      });
      setQuickEntry(undefined);
    } catch (error) {
      const fallback = 'Les pas n’ont pas pu être enregistrés.';
      setDialogError(error instanceof Error ? error.message : fallback);
      actionToast.error({ key: `dashboard-steps:${date}`, error, fallback });
    }
  };

  const handleWeightSubmit = async (values: WeightEntryFormValues) => {
    setDialogError(undefined);
    try {
      await onSaveWeight({
        date,
        weightKg: values.weightKg,
        ...(values.note.trim() ? { note: values.note.trim() } : {}),
      });
      const message = 'Le poids du jour et les objectifs associés ont été actualisés.';
      setFeedback({ tone: 'success', title: 'Poids enregistré', message });
      actionToast.success({
        key: `dashboard-weight:${date}`,
        title: 'Poids enregistré',
        description: message,
      });
      setQuickEntry(undefined);
    } catch (error) {
      const fallback = 'La pesée n’a pas pu être enregistrée.';
      setDialogError(error instanceof Error ? error.message : fallback);
      actionToast.error({ key: `dashboard-weight:${date}`, error, fallback });
    }
  };

  const renderAction = (actionId: DashboardQuickActionId): ReactNode => {
    switch (actionId) {
      case 'addFood':
        return (
          <Link
            key={actionId}
            to={addFoodPath(date, 'snacks')}
            className={`flex min-w-0 items-center rounded-xl bg-brand-700 px-3 text-left text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500 ${density === 'compact' ? 'min-h-14 gap-2 py-2' : 'min-h-16 gap-3 py-2.5'}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15">
              <Plus aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 leading-tight">Ajouter un aliment</span>
          </Link>
        );
      case 'scanFood':
        return (
          <Link key={actionId} to={barcodeScannerPath(date, 'snacks')} className={actionClassName}>
            <ActionContent icon={ScanLine} label="Scanner un produit" />
          </Link>
        );
      case 'steps':
        return (
          <button key={actionId} type="button" className={actionClassName} onClick={() => openQuickEntry('steps')}>
            <ActionContent icon={Footprints} label="Saisir les pas" />
          </button>
        );
      case 'weight':
        return (
          <button key={actionId} type="button" className={actionClassName} onClick={() => openQuickEntry('weight')}>
            <ActionContent icon={Scale} label="Saisir le poids" />
          </button>
        );
      case 'addActivity':
        return (
          <Link key={actionId} to={routePaths.addActivity} className={actionClassName}>
            <ActionContent icon={Activity} label="Ajouter une activité" />
          </Link>
        );
      case 'workout':
        return (
          <Link
            key={actionId}
            to={workoutPath}
            className={activeWorkout
              ? `flex min-w-0 items-center rounded-xl border border-brand-300 bg-brand-50 px-3 text-left text-sm font-semibold text-brand-900 shadow-sm transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-100 dark:hover:bg-brand-950/70 ${density === 'compact' ? 'min-h-14 gap-2 py-2' : 'min-h-16 gap-3 py-2.5'}`
              : actionClassName}
          >
            <ActionContent
              icon={Dumbbell}
              label={activeWorkout ? 'Reprendre la séance' : 'Démarrer une séance'}
            />
          </Link>
        );
    }
  };

  return (
    <>
      <Card className={density === 'compact' ? 'mt-3 p-4' : 'mt-4 p-4 sm:p-5'}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-950 dark:text-white">Actions rapides</h2>
          <span className="text-xs text-slate-500 dark:text-slate-400">Aujourd’hui</span>
        </div>
        <div className={`mt-3 grid grid-cols-2 gap-2 ${density === 'comfortable' ? 'sm:grid-cols-3 sm:gap-3' : 'sm:grid-cols-3'}`}>
          {visibleActions.map(renderAction)}
        </div>

        {feedback ? (
          <InlineNotice
            className="mt-4"
            tone={feedback.tone}
            title={feedback.title}
            role={feedback.tone === 'error' ? 'alert' : 'status'}
          >
            {feedback.message}
          </InlineNotice>
        ) : null}
      </Card>

      <DashboardQuickEntryDialog
        open={quickEntry === 'steps'}
        title="Saisir les pas"
        description={`Actuellement ${totalSteps.toLocaleString('fr-FR')} pas enregistrés aujourd’hui.`}
        onClose={closeQuickEntry}
      >
        {dialogError ? (
          <InlineNotice className="mb-4" tone="error" title="Enregistrement impossible" role="alert">
            {dialogError}
          </InlineNotice>
        ) : null}
        <StepsForm
          key={stepsEntry?.updatedAt ?? 'no-steps'}
          formId="dashboard-quick-steps-form"
          initialSteps={stepsEntry?.totalSteps ?? 0}
          submitLabel="Enregistrer"
          showDescription={false}
          onSubmit={handleStepsSubmit}
        />
      </DashboardQuickEntryDialog>

      <DashboardQuickEntryDialog
        open={quickEntry === 'weight'}
        title="Saisir le poids"
        description={weightEntry
          ? `${weightEntry.weightKg.toLocaleString('fr-FR')} kg sont déjà enregistrés aujourd’hui.`
          : 'Aucune pesée n’est encore enregistrée aujourd’hui.'}
        onClose={closeQuickEntry}
      >
        {dialogError ? (
          <InlineNotice className="mb-4" tone="error" title="Enregistrement impossible" role="alert">
            {dialogError}
          </InlineNotice>
        ) : null}
        <WeightEntryForm
          key={`${date}-${weightEntry?.updatedAt ?? 'profile'}`}
          formId="dashboard-quick-weight-form"
          showDate={false}
          showNote={false}
          submitLabel="Enregistrer"
          initialValues={{
            date,
            weightKg: weightEntry?.weightKg ?? weightKg,
            note: weightEntry?.note ?? '',
          }}
          onSubmit={handleWeightSubmit}
        />
      </DashboardQuickEntryDialog>
    </>
  );
}
