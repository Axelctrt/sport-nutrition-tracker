import {
  Archive,
  CheckCircle2,
  CircleDot,
  Pause,
  Plus,
  Target,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  GOAL_STATE_CHANGED_EVENT,
  type Goal,
  type GoalStatus,
} from '@/domain/goals/goalState';
import {
  deleteGoal,
  refreshGoalProgress,
  updateGoalStatus,
  type GoalProgressView,
} from '@/application/goals/goalProgressService';
import { GoalCard } from '@/features/goals/components/GoalCard';
import { GoalEditor } from '@/features/goals/components/GoalEditor';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { PageSkeleton } from '@/shared/ui/PageSkeleton';

type GoalFilter = 'current' | 'completed' | 'archived' | 'all';

interface GoalsPageProps {
  loadProgress?: () => Promise<GoalProgressView[]>;
}

export function GoalsPage({
  loadProgress = refreshGoalProgress,
}: GoalsPageProps) {
  const [views, setViews] = useState<GoalProgressView[]>();
  const [filter, setFilter] = useState<GoalFilter>('current');
  const [editingGoal, setEditingGoal] = useState<Goal>();
  const [deleteCandidate, setDeleteCandidate] =
    useState<Goal>();
  const [error, setError] = useState<string>();
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(undefined);

    try {
      setViews(await loadProgress());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Les objectifs n’ont pas pu être chargés.',
      );
    }
  }, [loadProgress]);

  useEffect(() => {
    void load();

    const handleChange = () => {
      void load();
    };

    window.addEventListener(
      GOAL_STATE_CHANGED_EVENT,
      handleChange,
    );

    return () => {
      window.removeEventListener(
        GOAL_STATE_CHANGED_EVENT,
        handleChange,
      );
    };
  }, [load]);

  const filtered = useMemo(() => {
    if (!views) return [];

    switch (filter) {
      case 'current':
        return views.filter(({ goal }) =>
          ['active', 'paused'].includes(goal.status),
        );
      case 'completed':
        return views.filter(
          ({ goal }) => goal.status === 'completed',
        );
      case 'archived':
        return views.filter(
          ({ goal }) => goal.status === 'archived',
        );
      case 'all':
        return views;
    }
  }, [filter, views]);

  const counts = useMemo(() => {
    const currentViews = views ?? [];

    return {
      active: currentViews.filter(
        ({ goal }) => goal.status === 'active',
      ).length,
      paused: currentViews.filter(
        ({ goal }) => goal.status === 'paused',
      ).length,
      completed: currentViews.filter(
        ({ goal }) => goal.status === 'completed',
      ).length,
      archived: currentViews.filter(
        ({ goal }) => goal.status === 'archived',
      ).length,
    };
  }, [views]);

  const handleStatus = (
    goalId: string,
    status: GoalStatus,
  ) => {
    updateGoalStatus(goalId, status);
    void load();
  };

  const handleSaved = () => {
    setEditingGoal(undefined);
    void load();
  };

  if (!views && !error) {
    return <PageSkeleton variant="list" />;
  }

  return (
    <section
      aria-labelledby="goals-title"
      className="min-w-0 overflow-x-clip"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <Target
            aria-hidden="true"
            className="mt-1 size-7 text-brand-700 dark:text-brand-300"
          />
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Progression personnelle
            </p>
            <h1
              id="goals-title"
              className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Objectifs et jalons
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
              Fixe une cible mesurable. SportPilot recalcule
              automatiquement la progression depuis tes pesées,
              pas, activités et séances terminées.
            </p>
          </div>
        </div>
      </div>

      {error ? (
        <InlineNotice
          className="mt-4"
          tone="error"
          title="Chargement impossible"
        >
          {error}
        </InlineNotice>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <CircleDot
            aria-hidden="true"
            className="size-5 text-brand-700"
          />
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {counts.active}
          </p>
          <p className="text-sm text-slate-500">Actifs</p>
        </Card>
        <Card className="p-4">
          <Pause
            aria-hidden="true"
            className="size-5 text-amber-700"
          />
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {counts.paused}
          </p>
          <p className="text-sm text-slate-500">En pause</p>
        </Card>
        <Card className="p-4">
          <CheckCircle2
            aria-hidden="true"
            className="size-5 text-emerald-700"
          />
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {counts.completed}
          </p>
          <p className="text-sm text-slate-500">Atteints</p>
        </Card>
        <Card className="p-4">
          <Archive
            aria-hidden="true"
            className="size-5 text-slate-600"
          />
          <p className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            {counts.archived}
          </p>
          <p className="text-sm text-slate-500">Archivés</p>
        </Card>
      </div>

      <div className="mt-4">
        <CollapsibleSection
          sectionId="goals-editor"
          storageKey="sportpilot:goals:editor"
          title={
            editingGoal
              ? 'Modifier un objectif'
              : 'Créer un nouvel objectif'
          }
          description="Choisir une métrique, une cible et éventuellement une échéance."
          icon={Plus}
          className="scroll-mt-24"
          defaultOpen={(views?.length ?? 0) === 0}
        >
          <GoalEditor
            onSaved={handleSaved}
            {...(editingGoal
              ? {
                  goal: editingGoal,
                  onCancelEdit: () =>
                    setEditingGoal(undefined),
                }
              : {})}
          />
        </CollapsibleSection>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(
          [
            ['current', 'En cours'],
            ['completed', 'Atteints'],
            ['archived', 'Archivés'],
            ['all', 'Tous'],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={
              filter === value ? 'primary' : 'secondary'
            }
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((view) => (
          <GoalCard
            key={view.goal.id}
            view={view}
            onEdit={() => {
              setEditingGoal(view.goal);
              window.location.hash = 'goals-editor';
            }}
            onStatusChange={(status) =>
              handleStatus(view.goal.id, status)
            }
            onDelete={() =>
              setDeleteCandidate(view.goal)
            }
          />
        ))}

        {filtered.length === 0 ? (
          <Card className="p-6 text-center">
            <Target
              aria-hidden="true"
              className="mx-auto size-8 text-slate-400"
            />
            <h2 className="mt-3 font-bold text-slate-950 dark:text-white">
              Aucun objectif dans cette vue
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Crée une première cible ou choisis un autre filtre.
            </p>
          </Card>
        ) : null}
      </div>

      <ConfirmationDialog
        open={deleteCandidate !== undefined}
        title="Supprimer cet objectif ?"
        description={
          deleteCandidate
            ? `« ${deleteCandidate.title} » sera retiré. Les données sportives et nutritionnelles utilisées pour calculer sa progression resteront intactes.`
            : ''
        }
        confirmLabel="Supprimer l’objectif"
        tone="danger"
        isPending={isDeleting}
        onConfirm={() => {
          if (!deleteCandidate) return;

          const goalId = deleteCandidate.id;
          setIsDeleting(true);
          setError(undefined);
          void deleteGoal(goalId)
            .then(() => {
              setDeleteCandidate(undefined);
              return load();
            })
            .catch((caughtError: unknown) => {
              setError(
                caughtError instanceof Error
                  ? caughtError.message
                  : 'L’objectif n’a pas pu être supprimé.',
              );
            })
            .finally(() => setIsDeleting(false));
        }}
        onCancel={() => {
          if (!isDeleting) setDeleteCandidate(undefined);
        }}
      />
    </section>
  );
}
