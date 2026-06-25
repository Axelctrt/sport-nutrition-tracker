import { Activity, Dumbbell, Footprints, Plus, Scale, ScanLine } from 'lucide-react';
import type { ComponentType, SVGProps } from 'react';
import { Link } from 'react-router-dom';
import {
  addFoodPath,
  barcodeScannerPath,
  routePaths,
  workoutSessionPath,
} from '@/app/routePaths';
import type { ActiveWorkoutSummary } from '@/features/dashboard/hooks/useDailyDashboard';
import { Card } from '@/shared/ui/Card';

interface DashboardQuickActionsProps {
  date: string;
  activeWorkout?: ActiveWorkoutSummary;
}

type ActionIcon = ComponentType<SVGProps<SVGSVGElement>>;

const actionClassName = 'flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800';

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

export function DashboardQuickActions({ date, activeWorkout }: DashboardQuickActionsProps) {
  const workoutPath = activeWorkout
    ? workoutSessionPath(activeWorkout.session.id)
    : routePaths.workoutSessions;

  return (
    <Card className="mt-4 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-slate-950 dark:text-white">Actions rapides</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400">Aujourd’hui</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <Link
          to={addFoodPath(date, 'snacks')}
          className="flex min-h-16 min-w-0 items-center gap-3 rounded-xl bg-brand-700 px-3 py-2.5 text-left text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 dark:bg-brand-600 dark:hover:bg-brand-500"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/15">
            <Plus aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 leading-tight">Ajouter un aliment</span>
        </Link>
        <Link to={barcodeScannerPath(date, 'snacks')} className={actionClassName}>
          <ActionContent icon={ScanLine} label="Scanner un produit" />
        </Link>
        <a href="#dashboard-steps-entry" className={actionClassName}>
          <ActionContent icon={Footprints} label="Saisir les pas" />
        </a>
        <a href="#dashboard-weight-entry" className={actionClassName}>
          <ActionContent icon={Scale} label="Saisir le poids" />
        </a>
        <Link to={routePaths.addActivity} className={actionClassName}>
          <ActionContent icon={Activity} label="Ajouter une activité" />
        </Link>
        <Link
          to={workoutPath}
          className={activeWorkout
            ? 'flex min-h-16 min-w-0 items-center gap-3 rounded-xl border border-brand-300 bg-brand-50 px-3 py-2.5 text-left text-sm font-semibold text-brand-900 shadow-sm transition-colors hover:bg-brand-100 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-100 dark:hover:bg-brand-950/70'
            : actionClassName}
        >
          <ActionContent
            icon={Dumbbell}
            label={activeWorkout ? 'Reprendre la séance' : 'Démarrer une séance'}
          />
        </Link>
      </div>
    </Card>
  );
}
