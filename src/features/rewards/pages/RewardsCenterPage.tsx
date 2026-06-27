import { Trophy } from 'lucide-react';

import { DashboardWeeklyMissions } from '@/features/dashboard/components/DashboardWeeklyMissions';
import { AchievementsPanel } from '@/features/settings/components/AchievementsPanel';
import { ConsistencyStreakPanel } from '@/features/settings/components/ConsistencyStreakPanel';
import { RewardThemesPanel } from '@/features/settings/components/RewardThemesPanel';

export function RewardsCenterPage() {
  return (
    <section
      aria-labelledby="rewards-center-title"
      className="min-w-0 overflow-x-clip"
    >
      <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-brand-50 p-5 shadow-sm sm:p-6 dark:border-amber-900/70 dark:from-amber-950/35 dark:via-slate-900 dark:to-brand-950/35">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <Trophy aria-hidden="true" className="size-6" />
          </span>

          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200">
              Progression et régularité
            </p>
            <h1
              id="rewards-center-title"
              className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Centre de récompenses
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
              Retrouve tes badges, tes missions hebdomadaires, tes séries de
              régularité, les semaines réussies et les thèmes que tu peux
              débloquer.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid items-start gap-4 xl:grid-cols-2">
        <DashboardWeeklyMissions />
        <ConsistencyStreakPanel />
      </div>

      <AchievementsPanel className="mt-4" />
      <RewardThemesPanel className="mt-4" />
    </section>
  );
}
