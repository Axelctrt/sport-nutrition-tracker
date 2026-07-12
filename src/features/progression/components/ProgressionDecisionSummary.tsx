import {
  Activity,
  ArrowRight,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProgressionHubSummary } from '@/application/progression/progressionHubSummaryService';
import { routePaths } from '@/app/routePaths';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface ProgressionDecisionSummaryProps {
  data?: ProgressionHubSummary | undefined;
  status: 'loading' | 'ready' | 'error';
  errorMessage?: string | undefined;
  onRetry: () => void;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  return remaining === 0 ? `${hours} h` : `${hours} h ${remaining} min`;
}

function formatWeight(value: number): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;
}

function formatWeightChange(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;
}

function ActivityCard({ data }: { data: ProgressionHubSummary['activity'] }) {
  const hasActivity = data.sessionCount > 0;
  const hasSteps = data.recordedStepDays > 0 && data.averageSteps !== undefined;

  return (
    <DecisionCard
      description={hasActivity
        ? `${formatMinutes(data.totalMinutes)} cette semaine${hasSteps ? ` · ${Math.round(data.averageSteps ?? 0).toLocaleString('fr-FR')} pas/j` : ''}`
        : hasSteps
          ? `${Math.round(data.averageSteps ?? 0).toLocaleString('fr-FR')} pas/j sur ${data.recordedStepDays} jour(s)`
          : 'Enregistre une activité ou tes pas pour obtenir un signal hebdomadaire.'}
      icon={Activity}
      label="Activité cette semaine"
      path={routePaths.analytics}
      tone="blue"
      value={hasActivity
        ? `${data.sessionCount} séance${data.sessionCount > 1 ? 's' : ''}`
        : hasSteps
          ? 'Pas enregistrés'
          : 'Aucune donnée'}
    />
  );
}

function WeightCard({ data }: { data: ProgressionHubSummary['weight'] }) {
  const descriptions = {
    empty: 'Ajoute une pesée pour commencer à suivre la tendance.',
    insufficient: 'Une seconde semaine de pesées est nécessaire pour comparer la tendance.',
    aligned: data.changeKg === undefined
      ? 'Tendance cohérente avec ton objectif.'
      : `${formatWeightChange(data.changeKg)} par rapport à la semaine précédente · dans le sens de ton objectif.`,
    stable: 'Tendance récente stable. Continue les pesées régulières pour confirmer.',
    attention: data.changeKg === undefined
      ? 'Tendance à surveiller par rapport à ton objectif.'
      : `${formatWeightChange(data.changeKg)} par rapport à la semaine précédente · tendance à surveiller.`,
  } as const;

  return (
    <DecisionCard
      description={descriptions[data.state]}
      icon={data.changeKg !== undefined && data.changeKg < 0 ? TrendingDown : data.changeKg !== undefined && data.changeKg > 0 ? TrendingUp : Scale}
      label="Tendance du poids"
      path={routePaths.weight}
      tone={data.state === 'attention' ? 'amber' : 'violet'}
      value={data.latestAverageKg === undefined
        ? 'Aucune moyenne'
        : formatWeight(data.latestAverageKg)}
    />
  );
}

function GoalCard({ data }: { data: ProgressionHubSummary['goal'] }) {
  const progress = data.progressPercent === undefined
    ? undefined
    : `${Math.round(data.progressPercent)} %`;
  const description = data.state === 'empty'
    ? 'Crée un objectif mesurable pour faire apparaître la prochaine priorité.'
    : data.state === 'overdue'
      ? `Échéance dépassée${progress ? ` · ${progress} atteint` : ''}.`
      : data.state === 'dueSoon'
        ? `${data.daysRemaining ?? 0} jour(s) restant(s)${progress ? ` · ${progress} atteint` : ''}.`
        : `Aucune échéance urgente${progress ? ` · ${progress} atteint` : ''}.`;

  return (
    <DecisionCard
      description={description}
      icon={Target}
      label="Objectif à surveiller"
      path={routePaths.goals}
      tone={data.state === 'overdue' || data.state === 'dueSoon' ? 'amber' : 'emerald'}
      value={data.title ?? 'Aucun objectif actif'}
    />
  );
}

interface DecisionCardProps {
  description: string;
  icon: typeof Activity;
  label: string;
  path: string;
  tone: 'amber' | 'blue' | 'emerald' | 'violet';
  value: string;
}

const toneClasses = {
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
} as const;

function DecisionCard({
  description,
  icon: Icon,
  label,
  path,
  tone,
  value,
}: DecisionCardProps) {
  return (
    <Link
      to={path}
      className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700"
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
            <ArrowRight aria-hidden="true" className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </span>
          <span className="mt-2 block break-words text-lg font-bold text-slate-950 dark:text-white">
            {value}
          </span>
          <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300">
            {description}
          </span>
        </span>
      </div>
    </Link>
  );
}

export function ProgressionDecisionSummary({
  data,
  status,
  errorMessage,
  onRetry,
}: ProgressionDecisionSummaryProps) {
  if (status === 'error') {
    return (
      <InlineNotice className="mt-6" tone="error" title="Synthèse indisponible" role="alert">
        <p>{errorMessage ?? 'La synthèse de progression ne peut pas être chargée.'}</p>
        <button
          type="button"
          className="mt-3 min-h-10 rounded-lg border border-red-300 px-3 text-sm font-semibold dark:border-red-800"
          onClick={onRetry}
        >
          Réessayer
        </button>
      </InlineNotice>
    );
  }

  return (
    <Card className="mt-6 overflow-hidden" aria-labelledby="progression-decision-title">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
        <h2 id="progression-decision-title" className="font-semibold text-slate-950 dark:text-white">
          À retenir cette semaine
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Trois signaux factuels pour décider où regarder ensuite.
        </p>
      </div>

      {status === 'loading' || !data ? (
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5" aria-label="Chargement de la synthèse">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-36 animate-pulse rounded-2xl bg-slate-100 motion-reduce:animate-none dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
          <ActivityCard data={data.activity} />
          <WeightCard data={data.weight} />
          <GoalCard data={data.goal} />
        </div>
      )}
    </Card>
  );
}
