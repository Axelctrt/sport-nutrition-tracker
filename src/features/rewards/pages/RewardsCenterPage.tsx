import {
  CalendarCheck2,
  Flame,
  Palette,
  Trophy,
} from 'lucide-react';

import { DashboardWeeklyMissions } from '@/features/dashboard/components/DashboardWeeklyMissions';
import { AchievementsPanel } from '@/features/settings/components/AchievementsPanel';
import { ConsistencyStreakPanel } from '@/features/settings/components/ConsistencyStreakPanel';
import { RewardThemesPanel } from '@/features/settings/components/RewardThemesPanel';
import { CollapsibleSection } from '@/shared/ui/CollapsibleSection';

export function RewardsCenterPage() {
  return (
    <section
      aria-labelledby="rewards-title"
      className="min-w-0"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Progression et régularité
        </p>
        <h1
          id="rewards-title"
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
        >
          Centre de récompenses
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          Missions, séries, badges et thèmes sont désormais
          regroupés dans des sections indépendantes et
          repliables.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <CollapsibleSection
          sectionId="rewards-missions"
          storageKey="sportpilot:rewards:missions"
          title="Missions hebdomadaires"
          description="Voir les objectifs de la semaine et leur progression."
          icon={CalendarCheck2}
          className="scroll-mt-24"
        >
          <DashboardWeeklyMissions />
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="rewards-streaks"
          storageKey="sportpilot:rewards:streaks"
          title="Séries de régularité"
          description="Suivre les habitudes maintenues dans le temps."
          icon={Flame}
          className="scroll-mt-24"
        >
          <ConsistencyStreakPanel />
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="rewards-achievements"
          storageKey="sportpilot:rewards:achievements"
          title="Badges et accomplissements"
          description="Consulter les jalons atteints et ceux encore à débloquer."
          icon={Trophy}
          className="scroll-mt-24"
        >
          <AchievementsPanel />
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="rewards-themes"
          storageKey="sportpilot:rewards:themes"
          title="Thèmes visuels"
          description="Activer une palette déjà débloquée."
          icon={Palette}
          className="scroll-mt-24"
        >
          <RewardThemesPanel />
        </CollapsibleSection>
      </div>
    </section>
  );
}
