import {
  Archive,
  CalendarClock,
  CheckCircle2,
  Edit3,
  Pause,
  Play,
  Trash2,
} from 'lucide-react';

import {
  getGoalMetricDefinition,
  type GoalStatus,
} from '@/domain/goals/goalState';
import type { GoalProgressView } from '@/application/goals/goalProgressService';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';

interface GoalCardProps {
  view: GoalProgressView;
  onEdit: () => void;
  onStatusChange: (status: GoalStatus) => void;
  onDelete: () => void;
}

const statusLabels: Record<GoalStatus, string> = {
  active: 'Actif',
  paused: 'En pause',
  completed: 'Atteint',
  archived: 'Archivé',
};

function formatValue(
  value: number,
  unit: string,
): string {
  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value)} ${unit}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
  }).format(new Date(`${value}T00:00:00`));
}

export function GoalCard({
  view,
  onEdit,
  onStatusChange,
  onDelete,
}: GoalCardProps) {
  const { goal } = view;
  const definition = getGoalMetricDefinition(goal.metric);

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-bold text-slate-950 dark:text-white">
              {goal.title}
            </h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {statusLabels[goal.status]}
            </span>
            {view.isOverdue ? (
              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 dark:bg-red-950/50 dark:text-red-200">
                Échéance dépassée
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {definition.label}
          </p>
        </div>

        <p className="text-right">
          <span className="block text-2xl font-bold text-brand-700 dark:text-brand-300">
            {Math.round(view.progressPercent)} %
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            de progression
          </span>
        </p>
      </div>

      <div
        className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label={`Progression de ${goal.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(view.progressPercent)}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-300 motion-reduce:transition-none"
          style={{
            width: `${Math.min(100, view.progressPercent)}%`,
          }}
        />
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Actuel
          </dt>
          <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
            {formatValue(view.currentValue, definition.unit)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Cible
          </dt>
          <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
            {formatValue(goal.targetValue, definition.unit)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Restant
          </dt>
          <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
            {formatValue(view.remainingValue, definition.unit)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">
            Départ
          </dt>
          <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
            {formatDate(goal.startDate)}
          </dd>
        </div>
      </dl>

      {goal.deadline ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-950/50">
          <CalendarClock
            aria-hidden="true"
            className="size-4 text-slate-500"
          />
          <span>
            Échéance le {formatDate(goal.deadline)}
          </span>
          {view.daysRemaining !== undefined ? (
            <span className="font-semibold">
              · {view.daysRemaining} jour(s) restant(s)
            </span>
          ) : null}
          {view.requiredPerDay !== undefined &&
          definition.cumulative ? (
            <span>
              · environ{' '}
              {formatValue(
                view.requiredPerDay,
                definition.unit,
              )}{' '}
              par jour
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {[25, 50, 75, 100].map((milestone) => (
          <span
            key={milestone}
            className={[
              'rounded-full px-2.5 py-1 text-xs font-semibold',
              goal.reachedMilestones.includes(
                milestone as 25 | 50 | 75 | 100,
              )
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
            ].join(' ')}
          >
            {milestone} %
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={onEdit}
        >
          <Edit3 aria-hidden="true" className="size-4" />
          Modifier
        </Button>

        {goal.status === 'active' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onStatusChange('paused')}
          >
            <Pause aria-hidden="true" className="size-4" />
            Mettre en pause
          </Button>
        ) : null}

        {goal.status === 'paused' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onStatusChange('active')}
          >
            <Play aria-hidden="true" className="size-4" />
            Reprendre
          </Button>
        ) : null}

        {goal.status !== 'completed' &&
        goal.status !== 'archived' ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onStatusChange('completed')}
          >
            <CheckCircle2
              aria-hidden="true"
              className="size-4"
            />
            Marquer atteint
          </Button>
        ) : null}

        {goal.status !== 'archived' ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onStatusChange('archived')}
          >
            <Archive aria-hidden="true" className="size-4" />
            Archiver
          </Button>
        ) : null}

        <Button
          size="sm"
          variant="dangerGhost"
          onClick={onDelete}
        >
          <Trash2 aria-hidden="true" className="size-4" />
          Supprimer
        </Button>
      </div>
    </Card>
  );
}
