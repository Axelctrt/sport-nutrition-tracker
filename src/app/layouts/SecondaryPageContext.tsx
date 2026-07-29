import { NavLink, useLocation } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';

const libraryItems = [
  { label: 'Aliments', path: routePaths.foodProducts },
  { label: 'Recettes', path: routePaths.recipes },
  { label: 'Repas favoris', path: routePaths.favoriteMeals },
  { label: 'Modèles musculation', path: routePaths.workoutTemplates },
  { label: 'Exercices', path: routePaths.strengthExercises },
  { label: 'Modèles endurance', path: routePaths.enduranceTemplates },
  { label: 'Séances passées', path: routePaths.workoutSessions },
] as const;

const libraryRoots = libraryItems.map(({ path }) => path);

const workflows: Partial<Record<string, { title: string; description: string; steps: readonly string[] }>> = {
  [routePaths.reports]: {
    title: 'Créer un rapport en quatre étapes',
    description: 'Choisis la période et les rubriques, vérifie l’aperçu, puis utilise le format de sortie adapté.',
    steps: ['Période', 'Rubriques', 'Aperçu', 'Exporter'],
  },
  [routePaths.backup]: {
    title: 'Restaurer sans risque',
    description: 'SportPilot analyse d’abord le fichier et crée une sauvegarde de sécurité avant toute restauration.',
    steps: ['Choisir', 'Vérifier', 'Sécuriser', 'Restaurer'],
  },
} as const;

function pathnameMatchesRoot(pathname: string, root: string): boolean {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function LibraryNavigation() {
  return (
    <nav
      aria-label="Bibliothèques SportPilot"
      className="mb-4 overflow-x-auto rounded-2xl border border-[var(--sp-border-subtle)] bg-[color-mix(in_srgb,var(--sp-surface-card)_94%,transparent)] p-1.5 shadow-[var(--sp-shadow-card)] backdrop-blur-xl"
    >
      <div className="flex min-w-max gap-1">
        {libraryItems.map(({ label, path }) => (
          <NavLink
            className={({ isActive }) => `inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition active:scale-[0.98] ${
              isActive
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
            end={path !== routePaths.foodProducts && path !== routePaths.recipes}
            key={path}
            to={path}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

function WorkflowGuide({
  title,
  description,
  steps,
}: {
  title: string;
  description: string;
  steps: readonly string[];
}) {
  return (
    <aside className="mb-4 rounded-2xl border border-brand-200 bg-brand-50/55 p-4 dark:border-brand-900 dark:bg-brand-950/20">
      <h2 className="font-semibold text-slate-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
      <ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Étapes recommandées">
        {steps.map((step, index) => (
          <li
            className="flex min-h-11 items-center gap-2 rounded-xl border border-brand-200 bg-white/75 px-3 text-sm font-semibold text-slate-700 dark:border-brand-900 dark:bg-slate-900/70 dark:text-slate-200"
            key={step}
          >
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {index + 1}
            </span>
            {step}
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function SecondaryPageContext() {
  const { pathname } = useLocation();
  const libraryVisible = libraryRoots.some((root) => pathnameMatchesRoot(pathname, root));
  const workflow = workflows[pathname];

  return (
    <>
      {libraryVisible ? <LibraryNavigation /> : null}
      {workflow ? <WorkflowGuide {...workflow} /> : null}
    </>
  );
}
