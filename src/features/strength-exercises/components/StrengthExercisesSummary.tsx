import { Archive, BookOpen, Dumbbell, UserRound } from 'lucide-react';
import type { ExerciseDefinition } from '@/domain/models/strength';
import { Card } from '@/shared/ui/Card';

interface MetricProps {
  icon: typeof Dumbbell;
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

export function StrengthExercisesSummary({ exercises }: { exercises: ExerciseDefinition[] }) {
  const personalCount = exercises.filter((exercise) => exercise.source === 'user').length;
  const catalogCount = exercises.filter((exercise) => exercise.source === 'catalog').length;
  const archivedCount = exercises.filter((exercise) => exercise.isArchived).length;

  return (
    <Card className="mt-5 p-4 sm:p-5" aria-label="Résumé du catalogue d’exercices">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-950 dark:text-white">Catalogue disponible hors connexion</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Exercices système et mouvements personnels au même endroit.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
          {exercises.length} résultat{exercises.length > 1 ? 's' : ''}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric icon={Dumbbell} label="Affichés" value={exercises.length} />
        <Metric icon={BookOpen} label="Catalogue" value={catalogCount} />
        <Metric icon={UserRound} label="Personnels" value={personalCount} />
        <Metric icon={Archive} label="Archivés" value={archivedCount} />
      </div>
    </Card>
  );
}
