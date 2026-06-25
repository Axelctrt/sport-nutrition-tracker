import { Dumbbell, Layers3, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { editWorkoutTemplatePath, routePaths, workoutSessionPath } from '@/app/routePaths';
import { WorkoutTemplateCard } from '@/features/strength-templates/components/WorkoutTemplateCard';
import { WorkoutTemplatesSummary } from '@/features/strength-templates/components/WorkoutTemplatesSummary';
import { useWorkoutTemplates } from '@/features/strength-templates/hooks/useWorkoutTemplates';
import { checkboxClassName, inputClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { EmptyState } from '@/shared/ui/EmptyState';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

export function WorkoutTemplatesPage() {
  const navigate = useNavigate();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [query, setQuery] = useState('');
  const { templates, status, errorMessage, actionErrorMessage, actionId, refresh, setArchived, duplicate, start } = useWorkoutTemplates(includeArchived);

  const visibleTemplates = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('fr');
    if (!normalized) return templates;
    return templates.filter(({ template }) => [template.name, template.description, template.notes]
      .filter(Boolean)
      .some((value) => value?.toLocaleLowerCase('fr').includes(normalized)));
  }, [query, templates]);

  const duplicateAndEdit = async (id: string) => {
    const created = await duplicate(id);
    if (created) await navigate(editWorkoutTemplatePath(created.id));
  };

  const startAndOpen = async (id: string) => {
    const session = await start(id);
    if (session) await navigate(workoutSessionPath(session.id));
  };

  return (
    <section aria-labelledby="workout-templates-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
          <h1 id="workout-templates-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Séances modèles</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Prépare tes entraînements réutilisables et démarre la bonne séance en quelques secondes.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link to={routePaths.workoutSessions} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <Dumbbell aria-hidden="true" className="size-4" />Entraînements
          </Link>
          <Link to={routePaths.newWorkoutTemplate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white shadow-sm hover:bg-brand-800">
            <Plus aria-hidden="true" className="size-4" />Créer
          </Link>
        </div>
      </div>

      {status === 'loading' ? <PageSkeleton className="mt-6" variant="list" /> : null}

      {status === 'ready' ? (
        <>
          <WorkoutTemplatesSummary templates={visibleTemplates} />
          <div className="mt-4">
            <label htmlFor="workout-template-search" className="sr-only">Rechercher une séance modèle</label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input id="workout-template-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClassName} pl-10`} placeholder="Rechercher une séance" />
            </div>
          </div>
          <label className="mt-3 flex min-h-11 items-center gap-3 rounded-xl border border-slate-300 px-4 dark:border-slate-700 sm:w-fit">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className={checkboxClassName} />
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Afficher les séances archivées</span>
          </label>
        </>
      ) : null}

      {actionErrorMessage ? <InlineNotice className="mt-4" tone="error" title="Action impossible"><p>{actionErrorMessage}</p><Link className="mt-2 inline-flex font-semibold text-brand-700 hover:underline dark:text-brand-300" to={routePaths.workoutSessions}>Voir les entraînements</Link></InlineNotice> : null}
      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Séances indisponibles"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}

      {status === 'ready' && visibleTemplates.length === 0 ? (
        <EmptyState
          className="mt-5"
          icon={Layers3}
          title={templates.length === 0 ? 'Aucune séance modèle' : 'Aucun résultat'}
          description={templates.length === 0 ? 'Crée ta première séance pour préparer ton prochain entraînement.' : 'Modifie la recherche pour retrouver une séance.'}
          primaryAction={templates.length === 0 ? <Link to={routePaths.newWorkoutTemplate} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white">Créer une séance</Link> : undefined}
        />
      ) : null}

      {status === 'ready' && visibleTemplates.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {visibleTemplates.map((summary) => (
            <WorkoutTemplateCard
              key={summary.template.id}
              summary={summary}
              busy={actionId === summary.template.id}
              onStart={startAndOpen}
              onDuplicate={duplicateAndEdit}
              onArchiveChange={setArchived}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
