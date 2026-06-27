import {
  Bike,
  CopyPlus,
  Dumbbell,
  Flame,
  Footprints,
  MoreHorizontal,
  Pencil,
  PersonStanding,
  Trash2,
  Waves,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { editActivityPath } from '@/app/routePaths';
import type { Activity, ActivityType } from '@/domain/models/activity';
import type { ActivityJournalNavigationState } from '@/features/activities/navigation/activityJournalNavigation';
import { presentActivity } from '@/features/activities/utils/activityPresentation';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { cn } from '@/shared/utils/cn';

interface ActivityJournalCardProps {
  activity: Activity;
  navigationState: ActivityJournalNavigationState;
  highlighted?: boolean;
  busyId?: string | undefined;
  onDuplicate: (activityId: string) => Promise<unknown>;
  onRemove: (activityId: string) => Promise<boolean>;
}

const iconByType: Record<ActivityType, LucideIcon> = {
  running: PersonStanding,
  swimming: Waves,
  strengthTraining: Dumbbell,
  cycling: Bike,
  walking: Footprints,
  otherCardio: Flame,
};

const toneByType: Record<ActivityType, string> = {
  running: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
  swimming: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
  strengthTraining: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
  cycling: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  walking: 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-200',
  otherCardio: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200',
};

export function ActivityJournalCard({
  activity,
  navigationState,
  highlighted = false,
  busyId,
  onDuplicate,
  onRemove,
}: ActivityJournalCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const presentation = presentActivity(activity);
  const Icon = iconByType[activity.type];
  const duplicateBusy = busyId === `duplicate-${activity.id}`;
  const deleteBusy = busyId === `delete-${activity.id}`;

  return (
    <>
      <Card
        id={`activity-entry-${activity.id}`}
        className={cn(
          'scroll-mt-28 p-4 transition-colors sm:p-5 motion-reduce:transition-none',
          highlighted && 'border-brand-300 bg-brand-50/70 dark:border-brand-800 dark:bg-brand-950/30',
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', toneByType[activity.type])}>
            <Icon aria-hidden="true" className="size-5" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <h2 className="break-words font-semibold text-slate-950 dark:text-white">
                    {presentation.title}
                  </h2>
                  {activity.time ? (
                    <span className="text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                      {activity.time}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                  {presentation.subtitle}
                </p>
              </div>

              <details className="relative shrink-0">
                <summary
                  role="button"
                  aria-label={`Actions pour ${presentation.title}`}
                  className="grid size-11 cursor-pointer list-none place-items-center rounded-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-none dark:text-slate-300 dark:hover:bg-slate-800 [&::-webkit-details-marker]:hidden"
                >
                  <MoreHorizontal aria-hidden="true" className="size-5" />
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-52 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <Link
                    to={editActivityPath(activity.id)}
                    state={navigationState}
                    onClick={(event) => event.currentTarget.closest('details')?.removeAttribute('open')}
                    className="inline-flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <Pencil aria-hidden="true" className="size-4" />
                    Modifier
                  </Link>
                  <Button
                    className="w-full justify-start"
                    size="sm"
                    variant="ghost"
                    disabled={duplicateBusy || deleteBusy}
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      void onDuplicate(activity.id);
                    }}
                  >
                    <CopyPlus aria-hidden="true" className="size-4" />
                    {duplicateBusy ? 'Duplication…' : 'Dupliquer'}
                  </Button>
                  <Button
                    className="w-full justify-start"
                    size="sm"
                    variant="dangerGhost"
                    disabled={duplicateBusy || deleteBusy}
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open');
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    Supprimer
                  </Button>
                </div>
              </details>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {presentation.metrics.map((metric) => (
                <span
                  key={metric}
                  className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {metric}
                </span>
              ))}
              <span className="inline-flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 font-semibold text-orange-900 dark:bg-orange-950/40 dark:text-orange-100">
                <Flame aria-hidden="true" className="size-3.5" />
                {Math.round(presentation.caloriesKcal)} kcal
              </span>
              {presentation.usesManualCalories ? (
                <span className="text-slate-500 dark:text-slate-400">corrigées</span>
              ) : null}
            </div>

            {activity.notes ? (
              <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950/70">
                <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700 dark:text-slate-200 [&::-webkit-details-marker]:hidden">
                  Notes et ressenti
                </summary>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {activity.notes}
                </p>
              </details>
            ) : null}
          </div>
        </div>
      </Card>

      <ConfirmationDialog
        open={deleteOpen}
        title="Supprimer cette activité ?"
        description={`« ${presentation.title} » sera supprimée définitivement et les objectifs de la journée seront recalculés.`}
        confirmLabel="Supprimer"
        tone="danger"
        isPending={deleteBusy}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => {
          void onRemove(activity.id).then((removed) => {
            if (removed) setDeleteOpen(false);
          });
        }}
      />
    </>
  );
}
