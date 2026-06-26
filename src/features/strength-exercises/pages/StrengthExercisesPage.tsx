import { Dumbbell, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { editStrengthExercisePath, routePaths } from '@/app/routePaths';
import type { ExerciseEquipment, ExerciseSource, MuscleGroup } from '@/domain/models/strength';
import { StrengthExerciseLibraryCard } from '@/features/strength-exercises/components/StrengthExerciseLibraryCard';
import { StrengthExercisesSummary } from '@/features/strength-exercises/components/StrengthExercisesSummary';
import { useStrengthExercises } from '@/features/strength-exercises/hooks/useStrengthExercises';
import { equipmentOptions, muscleGroupOptions } from '@/features/strength-exercises/utils/exerciseLabels';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function StrengthExercisesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | 'all'>('all');
  const [equipment, setEquipment] = useState<ExerciseEquipment | 'all'>('all');
  const [source, setSource] = useState<ExerciseSource | 'all'>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const filters = useMemo(
    () => ({ query, muscleGroup, equipment, source, includeArchived }),
    [query, muscleGroup, equipment, source, includeArchived],
  );
  const {
    exercises,
    status,
    errorMessage,
    actionErrorMessage,
    actionId,
    refresh,
    setArchived,
    duplicate,
  } = useStrengthExercises(filters);

  const duplicateAndEdit = async (id: string) => {
    const created = await duplicate(id);
    if (created) await navigate(editStrengthExercisePath(created.id));
  };

  return (
    <section aria-labelledby="strength-exercises-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
          <h1 id="strength-exercises-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Catalogue d’exercices</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Retrouve les mouvements système, tes exercices personnels et leur historique de progression.</p>
        </div>
        <Link to={routePaths.newStrengthExercise} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white shadow-sm hover:bg-brand-800">
          <Plus aria-hidden="true" className="size-5" />
          Créer un exercice
        </Link>
      </div>

      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {status === 'ready' ? (
        <>
          <StrengthExercisesSummary exercises={exercises} />

          <div className="mt-4">
            <label htmlFor="strength-exercise-search" className="sr-only">Rechercher un exercice</label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                id="strength-exercise-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className={`${inputClassName} pl-10`}
                placeholder="Rechercher un exercice"
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Filtrer selon l’origine">
            {([
              ['all', 'Tous'],
              ['catalog', 'Catalogue'],
              ['user', 'Personnels'],
            ] as const).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={source === value ? 'primary' : 'secondary'}
                aria-pressed={source === value}
                onClick={() => setSource(value)}
              >
                {label}
              </Button>
            ))}
          </div>

          <CollapsibleSection
            className="mt-3"
            title="Filtres avancés"
            description="Muscle, matériel et exercices archivés."
            summary={<SlidersHorizontal aria-hidden="true" className="size-4" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="strength-muscle-filter" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Muscle principal</label>
                <select id="strength-muscle-filter" value={muscleGroup} onChange={(event) => setMuscleGroup(event.target.value as MuscleGroup | 'all')} className={`${inputClassName} mt-2`}>
                  <option value="all">Tous les muscles</option>
                  {muscleGroupOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="strength-equipment-filter" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Matériel</label>
                <select id="strength-equipment-filter" value={equipment} onChange={(event) => setEquipment(event.target.value as ExerciseEquipment | 'all')} className={`${inputClassName} mt-2`}>
                  <option value="all">Tout le matériel</option>
                  {equipmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </div>
            <label className="mt-4 flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-4 dark:border-slate-700">
              <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className={checkboxClassName} />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Afficher les exercices archivés</span>
            </label>
          </CollapsibleSection>
        </>
      ) : null}

      {actionErrorMessage ? <InlineNotice className="mt-4" tone="error" title="Action impossible"><p>{actionErrorMessage}</p></InlineNotice> : null}
      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Catalogue indisponible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}

      {status === 'ready' && exercises.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={Dumbbell}
          title="Aucun exercice trouvé"
          description="Modifie la recherche ou les filtres, ou crée un exercice personnel."
          primaryAction={<Link to={routePaths.newStrengthExercise} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white">Créer un exercice</Link>}
        />
      ) : null}

      {status === 'ready' && exercises.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {exercises.map((exercise) => (
            <StrengthExerciseLibraryCard
              key={exercise.id}
              exercise={exercise}
              busy={actionId === exercise.id}
              onArchiveChange={setArchived}
              onDuplicate={duplicateAndEdit}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
