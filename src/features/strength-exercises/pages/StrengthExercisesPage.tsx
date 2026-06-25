import { Archive, Copy, Dumbbell, History, LoaderCircle, Pencil, Plus, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { editStrengthExercisePath, routePaths, strengthExerciseHistoryPath } from '@/app/routePaths';
import type { ExerciseEquipment, ExerciseSource, MuscleGroup } from '@/domain/models/strength';
import { useStrengthExercises } from '@/features/strength-exercises/hooks/useStrengthExercises';
import {
  equipmentLabel,
  equipmentOptions,
  exerciseCategoryLabel,
  exerciseSourceLabel,
  loadUnitLabel,
  muscleGroupLabel,
  muscleGroupOptions,
  movementTypeLabel,
} from '@/features/strength-exercises/utils/exerciseLabels';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function StrengthExercisesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<MuscleGroup | 'all'>('all');
  const [equipment, setEquipment] = useState<ExerciseEquipment | 'all'>('all');
  const [source, setSource] = useState<ExerciseSource | 'all'>('all');
  const [includeArchived, setIncludeArchived] = useState(false);
  const filters = useMemo(() => ({ query, muscleGroup, equipment, source, includeArchived }), [query, muscleGroup, equipment, source, includeArchived]);
  const { exercises, status, errorMessage, actionId, refresh, setArchived, duplicate } = useStrengthExercises(filters);

  const confirmArchive = async (id: string, name: string, archived: boolean) => {
    const action = archived ? 'Réactiver' : 'Archiver';
    const message = archived
      ? `Réactiver « ${name} » ?`
      : `Archiver « ${name} » ? Il restera visible dans les anciennes séances.`;
    if (window.confirm(message)) await setArchived(id, !archived);
    return action;
  };

  const duplicateAndEdit = async (id: string) => {
    const created = await duplicate(id);
    await navigate(editStrengthExercisePath(created.id));
  };

  return (
    <section aria-labelledby="strength-exercises-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
          <h1 id="strength-exercises-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Catalogue d’exercices</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Le catalogue système fonctionne hors connexion. Tu peux le filtrer, dupliquer un exercice ou créer tes propres mouvements.</p>
        </div>
        <Link to={routePaths.newStrengthExercise} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white shadow-sm hover:bg-brand-800">
          <Plus aria-hidden="true" className="size-5" />
          Créer un exercice
        </Link>
      </div>

      <Card className="mt-8 p-5 sm:p-6">
        <div className="grid gap-5 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <label htmlFor="strength-exercise-search" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Rechercher</label>
            <div className="relative mt-2">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input id="strength-exercise-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClassName} pl-10`} placeholder="Nom de l’exercice" />
            </div>
          </div>
          <div>
            <label htmlFor="strength-muscle-filter" className="text-sm font-semibold text-slate-800 dark:text-slate-100">Muscle</label>
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
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <label htmlFor="strength-source-filter" className="sr-only">Origine des exercices</label>
            <select id="strength-source-filter" value={source} onChange={(event) => setSource(event.target.value as ExerciseSource | 'all')} className={inputClassName}>
              <option value="all">Toutes les origines</option>
              <option value="catalog">Catalogue système</option>
              <option value="user">Exercices personnels</option>
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-4 dark:border-slate-700">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className={checkboxClassName} />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Afficher les exercices archivés</span>
          </label>
        </div>
      </Card>

      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Catalogue indisponible"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}
      {status === 'loading' ? <Card className="mt-6 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement des exercices…</p></Card> : null}
      {status === 'ready' && exercises.length === 0 ? <Card className="mt-6 p-8 text-center"><Dumbbell aria-hidden="true" className="mx-auto size-10 text-slate-400" /><h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Aucun exercice trouvé</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Modifie les filtres ou crée un exercice personnel.</p></Card> : null}

      {status === 'ready' && exercises.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {exercises.map((exercise) => (
            <Card key={exercise.id} className={`p-5 ${exercise.isArchived ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-950 dark:text-white">{exercise.name}</h2>
                    {exercise.isArchived ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">Archivé</span> : null}
                  </div>
                  <p className="mt-1 text-sm font-medium text-brand-700 dark:text-brand-300">{muscleGroupLabel(exercise.primaryMuscleGroup)} · {equipmentLabel(exercise.equipment)}</p>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{exerciseSourceLabel(exercise.source)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">{exerciseCategoryLabel(exercise.category)}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">{movementTypeLabel(exercise.movementType)}</span>
                <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">Charge : {loadUnitLabel(exercise.loadUnit)}</span>
              </div>
              {exercise.secondaryMuscleGroups.length > 0 ? <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Secondaires : {exercise.secondaryMuscleGroups.map(muscleGroupLabel).join(', ')}</p> : null}
              {exercise.description ? <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{exercise.description}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to={strengthExerciseHistoryPath(exercise.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><History aria-hidden="true" className="size-4" />Historique</Link>
                {exercise.source === 'user' ? (
                  <>
                    <Link to={editStrengthExercisePath(exercise.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Pencil aria-hidden="true" className="size-4" />Modifier</Link>
                    <Button variant="ghost" size="sm" disabled={actionId === exercise.id} onClick={() => void confirmArchive(exercise.id, exercise.name, exercise.isArchived)}>
                      {exercise.isArchived ? <RotateCcw aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}
                      {actionId === exercise.id ? 'Traitement…' : exercise.isArchived ? 'Réactiver' : 'Archiver'}
                    </Button>
                  </>
                ) : null}
                <Button variant="secondary" size="sm" disabled={actionId === exercise.id} onClick={() => void duplicateAndEdit(exercise.id)}>
                  <Copy aria-hidden="true" className="size-4" />
                  {actionId === exercise.id ? 'Duplication…' : 'Dupliquer'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
