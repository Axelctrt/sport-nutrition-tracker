import { Archive, Copy, Dumbbell, Layers3, LoaderCircle, Pencil, Play, Plus, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { editWorkoutTemplatePath, routePaths, workoutSessionPath } from '@/app/routePaths';
import { useWorkoutTemplates } from '@/features/strength-templates/hooks/useWorkoutTemplates';
import { checkboxClassName } from '@/shared/forms/formStyles';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export function WorkoutTemplatesPage() {
  const navigate = useNavigate();
  const [includeArchived, setIncludeArchived] = useState(false);
  const { templates, status, errorMessage, actionErrorMessage, actionId, refresh, setArchived, duplicate, start } = useWorkoutTemplates(includeArchived);

  const duplicateAndEdit = async (id: string) => {
    const created = await duplicate(id);
    await navigate(editWorkoutTemplatePath(created.id));
  };

  const startAndOpen = async (id: string) => {
    const session = await start(id);
    if (session) await navigate(workoutSessionPath(session.id));
  };


  return (
    <section aria-labelledby="workout-templates-title">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">Carnet de musculation</p>
          <h1 id="workout-templates-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Séances modèles</h1>
          <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">Prépare des séances réutilisables avec l’ordre, les séries, les répétitions, la charge cible et le repos.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={routePaths.workoutSessions} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
            <Dumbbell aria-hidden="true" className="size-5" />Mes entraînements
          </Link>
          <Link to={routePaths.newWorkoutTemplate} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 font-semibold text-white shadow-sm hover:bg-brand-800">
            <Plus aria-hidden="true" className="size-5" />Créer une séance
          </Link>
        </div>
      </div>

      <label className="mt-6 flex min-h-11 w-fit items-center gap-3 rounded-xl border border-slate-300 px-4 dark:border-slate-700">
        <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className={checkboxClassName} />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">Afficher les séances archivées</span>
      </label>

      {actionErrorMessage ? <InlineNotice className="mt-6" tone="error" title="Démarrage impossible"><p>{actionErrorMessage}</p><Link className="mt-3 inline-flex font-semibold text-brand-700 hover:underline dark:text-brand-300" to={routePaths.workoutSessions}>Voir la séance en cours</Link></InlineNotice> : null}
      {errorMessage ? <InlineNotice className="mt-6" tone="error" title="Séances indisponibles"><p>{errorMessage}</p><Button className="mt-3" variant="secondary" onClick={() => void refresh()}>Réessayer</Button></InlineNotice> : null}
      {status === 'loading' ? <Card className="mt-6 p-8 text-center" role="status"><LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-brand-700" /><p className="mt-3 font-semibold">Chargement des séances…</p></Card> : null}
      {status === 'ready' && templates.length === 0 ? <Card className="mt-6 p-8 text-center"><Layers3 aria-hidden="true" className="mx-auto size-10 text-slate-400" /><h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Aucune séance modèle</h2><p className="mt-2 text-slate-600 dark:text-slate-300">Crée ta première séance pour préparer ton entraînement.</p></Card> : null}

      {status === 'ready' && templates.length > 0 ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {templates.map(({ template, exerciseCount }) => (
            <Card key={template.id} className={`p-5 sm:p-6 ${template.isArchived ? 'opacity-70' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white">{template.name}</h2>
                    {template.isArchived ? <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold dark:bg-slate-700">Archivée</span> : null}
                  </div>
                  <p className="mt-2 flex items-center gap-2 text-sm font-medium text-brand-700 dark:text-brand-300"><Dumbbell aria-hidden="true" className="size-4" />{exerciseCount} exercice{exerciseCount > 1 ? 's' : ''}</p>
                </div>
              </div>
              {template.description ? <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{template.description}</p> : null}
              <div className="mt-5 flex flex-wrap gap-2">
                {!template.isArchived ? <Button size="sm" disabled={actionId === template.id} onClick={() => void startAndOpen(template.id)}><Play aria-hidden="true" className="size-4" />{actionId === template.id ? 'Démarrage…' : 'Démarrer'}</Button> : null}
                <Link to={editWorkoutTemplatePath(template.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"><Pencil aria-hidden="true" className="size-4" />Modifier</Link>
                <Button variant="secondary" size="sm" disabled={actionId === template.id} onClick={() => void duplicateAndEdit(template.id)}><Copy aria-hidden="true" className="size-4" />Dupliquer</Button>
                <Button variant="ghost" size="sm" disabled={actionId === template.id} onClick={() => void setArchived(template.id, !template.isArchived)}>{template.isArchived ? <RotateCcw aria-hidden="true" className="size-4" /> : <Archive aria-hidden="true" className="size-4" />}{template.isArchived ? 'Réactiver' : 'Archiver'}</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}
    </section>
  );
}
