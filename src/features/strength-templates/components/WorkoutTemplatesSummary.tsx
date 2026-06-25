import { Archive, Dumbbell, Layers3, Play } from 'lucide-react';
import type { WorkoutTemplateSummary } from '@/application/strength/workoutTemplateService';
import { Card } from '@/shared/ui/Card';

interface MetricProps {
  icon: typeof Layers3;
  label: string;
  value: number;
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70" aria-label={`${label} : ${value}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon aria-hidden="true" className="size-4" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export function WorkoutTemplatesSummary({ templates }: { templates: WorkoutTemplateSummary[] }) {
  const activeCount = templates.filter(({ template }) => !template.isArchived).length;
  const archivedCount = templates.filter(({ template }) => template.isArchived).length;
  const exerciseCount = templates.reduce((total, item) => total + item.exerciseCount, 0);

  return (
    <Card className="mt-5 p-4 sm:p-5" aria-label="Résumé des séances modèles">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">Planification des entraînements</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Démarre une séance en un geste ou adapte un modèle existant.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
          {templates.length} modèle{templates.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric icon={Layers3} label="Affichés" value={templates.length} />
        <Metric icon={Play} label="Actifs" value={activeCount} />
        <Metric icon={Archive} label="Archivés" value={archivedCount} />
        <Metric icon={Dumbbell} label="Exercices" value={exerciseCount} />
      </div>
    </Card>
  );
}
