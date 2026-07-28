import {
  CalendarCheck2,
  Flame,
  Palette,
  Trophy,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";

import { DashboardWeeklyMissions } from "@/features/dashboard/components/DashboardWeeklyMissions";
import { AchievementsPanel } from "@/features/settings/components/AchievementsPanel";
import { ConsistencyStreakPanel } from "@/features/settings/components/ConsistencyStreakPanel";
import { RewardThemesPanel } from "@/features/settings/components/RewardThemesPanel";
import { CollapsibleSection } from "@/shared/ui/CollapsibleSection";
import { SportPilotAnimatedTabs } from "@/shared/ui/SportPilotAnimatedTabs";

const rewardTabs = [
  { id: "themes", label: "Thèmes" },
  { id: "badges", label: "Badges" },
] as const;

type RewardTabId = (typeof rewardTabs)[number]["id"];

function validTab(value: string | null): RewardTabId {
  return rewardTabs.some(({ id }) => id === value)
    ? value as RewardTabId
    : "themes";
}

export function RewardsCenterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = validTab(searchParams.get("tab"));

  const updateTab = (nextTab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", validTab(nextTab));
    setSearchParams(next, { replace: true });
  };

  return (
    <section aria-labelledby="rewards-title" className="min-w-0">
      <header className="border-b border-[var(--sp-border-subtle)] pb-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-[var(--sp-border-subtle)] bg-[var(--sp-surface-elevated)] text-[var(--sp-accent-primary)]">
            {activeTab === "themes"
              ? <Palette aria-hidden="true" className="size-5" />
              : <Trophy aria-hidden="true" className="size-5" />}
          </span>
          <div>
            <p className="text-xs font-bold uppercase text-[var(--sp-text-muted)]">
              Progression et régularité
            </p>
            <h1
              id="rewards-title"
              className="mt-1 text-2xl font-bold text-[var(--sp-text-primary)] sm:text-3xl"
            >
              Récompenses
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--sp-text-secondary)]">
              Consulte ta collection visuelle et les jalons gagnés au fil de tes données réelles.
            </p>
          </div>
        </div>
      </header>

      <SportPilotAnimatedTabs
        label="Sections des récompenses"
        tabs={rewardTabs}
        activeTab={activeTab}
        onChange={updateTab}
        className="mt-5"
      />

      <div
        id="themes-panel"
        role="tabpanel"
        aria-labelledby="themes-tab"
        hidden={activeTab !== "themes"}
        className="mt-5"
      >
        <RewardThemesPanel />
      </div>

      <div
        id="badges-panel"
        role="tabpanel"
        aria-labelledby="badges-tab"
        hidden={activeTab !== "badges"}
        className="mt-5 space-y-3"
      >
        <AchievementsPanel />
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
      </div>
    </section>
  );
}
