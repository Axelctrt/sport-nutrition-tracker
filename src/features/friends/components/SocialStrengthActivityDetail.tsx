import type { SocialStrengthActivitySnapshotDetail } from '@/domain/friends/socialActivitySnapshotContract';
import {
  muscleGroupLabel,
  strengthTrackingModeLabel,
} from '@/features/strength-exercises/utils/exerciseLabels';
import { presentSocialStrengthSet } from '@/features/friends/components/socialActivityFeedPresentation';

interface SocialStrengthActivityDetailProps {
  readonly detail: SocialStrengthActivitySnapshotDetail;
}

export function SocialStrengthActivityDetail({ detail }: SocialStrengthActivityDetailProps) {
  if (!detail.exercises?.length) {
    return (
      <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        Aucun exercice détaillé n’a été partagé pour cette séance.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {detail.exercises.map((exercise, exerciseIndex) => (
        <section
          key={`${exercise.name}-${exerciseIndex}`}
          className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800"
        >
          <div className="bg-slate-50 px-4 py-3 dark:bg-slate-950/70">
            <h4 className="font-bold text-slate-950 dark:text-white">{exercise.name}</h4>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {exercise.muscleGroups?.length ? (
                <span>{exercise.muscleGroups.map(muscleGroupLabel).join(' · ')}</span>
              ) : null}
              {exercise.trackingMode ? (
                <span>{strengthTrackingModeLabel(exercise.trackingMode)}</span>
              ) : null}
            </div>
          </div>

          {exercise.sets?.length ? (
            <ol className="divide-y divide-slate-200 dark:divide-slate-800">
              {exercise.sets.map((set) => {
                const presentation = presentSocialStrengthSet(set);
                return (
                  <li
                    key={set.setNumber}
                    className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-3 px-4 py-3"
                  >
                    <span className="flex size-9 items-center justify-center rounded-full bg-brand-50 text-sm font-bold text-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
                      {set.setNumber}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <p className="font-bold text-slate-950 dark:text-white">
                          {presentation.main}
                        </p>
                        {presentation.type ? (
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {presentation.type}
                          </span>
                        ) : null}
                      </div>
                      {presentation.secondary.length > 0 ? (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                          {presentation.secondary.join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Les séries ne sont pas incluses dans ce partage.
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
