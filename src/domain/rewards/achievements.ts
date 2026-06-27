export type AchievementId =
  | "first-session"
  | "ten-sessions"
  | "endurance-five"
  | "endurance-twenty"
  | "strength-five"
  | "strength-twenty"
  | "active-seven"
  | "versatile-three";

export type AchievementCategory =
  | "starter"
  | "endurance"
  | "strength"
  | "consistency"
  | "versatility";

export type AchievementMetricKey =
  | "totalLoggedSessions"
  | "enduranceActivities"
  | "completedStrengthSessions"
  | "activeDays"
  | "disciplineCount";

export interface AchievementDefinition {
  id: AchievementId;
  name: string;
  description: string;
  category: AchievementCategory;
  metric: AchievementMetricKey;
  target: number;
  requirementLabel: string;
}

export interface EarnedAchievement {
  id: AchievementId;
  earnedAt: string;
}

export interface AchievementState {
  earnedAchievements: EarnedAchievement[];
}

export const ACHIEVEMENT_STORAGE_KEY = "sport-pilot.achievements";

export const achievementCatalog: readonly AchievementDefinition[] = [
  {
    id: "first-session",
    name: "Premier élan",
    description: "Le début officiel de ton historique sportif dans SportPilot.",
    category: "starter",
    metric: "totalLoggedSessions",
    target: 1,
    requirementLabel: "Enregistrer une activité ou terminer une séance",
  },
  {
    id: "ten-sessions",
    name: "Rythme installé",
    description: "Dix entraînements enregistrés : la routine commence à prendre.",
    category: "starter",
    metric: "totalLoggedSessions",
    target: 10,
    requirementLabel: "Enregistrer 10 entraînements",
  },
  {
    id: "endurance-five",
    name: "Cap endurance",
    description: "Une première série de sorties de course, natation ou vélo.",
    category: "endurance",
    metric: "enduranceActivities",
    target: 5,
    requirementLabel: "Enregistrer 5 activités d’endurance",
  },
  {
    id: "endurance-twenty",
    name: "Fond solide",
    description: "Vingt activités d’endurance constituent une base durable.",
    category: "endurance",
    metric: "enduranceActivities",
    target: 20,
    requirementLabel: "Enregistrer 20 activités d’endurance",
  },
  {
    id: "strength-five",
    name: "Force lancée",
    description: "Cinq séances terminées pour ancrer le suivi de musculation.",
    category: "strength",
    metric: "completedStrengthSessions",
    target: 5,
    requirementLabel: "Terminer 5 séances de musculation",
  },
  {
    id: "strength-twenty",
    name: "Force régulière",
    description: "Vingt séances terminées témoignent d’une vraie continuité.",
    category: "strength",
    metric: "completedStrengthSessions",
    target: 20,
    requirementLabel: "Terminer 20 séances de musculation",
  },
  {
    id: "active-seven",
    name: "Semaine active",
    description: "Sept journées distinctes avec une activité, une séance ou une pesée.",
    category: "consistency",
    metric: "activeDays",
    target: 7,
    requirementLabel: "Enregistrer 7 journées actives distinctes",
  },
  {
    id: "versatile-three",
    name: "Profil polyvalent",
    description: "Trois disciplines différentes suivies dans la même application.",
    category: "versatility",
    metric: "disciplineCount",
    target: 3,
    requirementLabel: "Pratiquer 3 disciplines différentes",
  },
] as const;

function isAchievementId(value: unknown): value is AchievementId {
  return achievementCatalog.some((achievement) => achievement.id === value);
}

function createDefaultState(): AchievementState {
  return { earnedAchievements: [] };
}

export function readAchievementState(): AchievementState {
  if (typeof window === "undefined") return createDefaultState();

  try {
    const rawValue = window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);
    if (!rawValue) return createDefaultState();

    const parsed = JSON.parse(rawValue) as Partial<AchievementState>;
    if (!Array.isArray(parsed.earnedAchievements)) return createDefaultState();

    const earnedById = new Map<AchievementId, EarnedAchievement>();

    for (const candidate of parsed.earnedAchievements) {
      if (
        typeof candidate === "object" &&
        candidate !== null &&
        isAchievementId(candidate.id) &&
        typeof candidate.earnedAt === "string" &&
        candidate.earnedAt.length > 0 &&
        !earnedById.has(candidate.id)
      ) {
        earnedById.set(candidate.id, {
          id: candidate.id,
          earnedAt: candidate.earnedAt,
        });
      }
    }

    return { earnedAchievements: [...earnedById.values()] };
  } catch {
    return createDefaultState();
  }
}

function persistAchievementState(state: AchievementState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      ACHIEVEMENT_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Les badges restent calculables pendant la session si le stockage est refusé.
  }
}

export function unlockAchievements(
  achievementIds: readonly AchievementId[],
  earnedAt: string = new Date().toISOString(),
): AchievementState {
  const currentState = readAchievementState();
  const earnedById = new Map(
    currentState.earnedAchievements.map((achievement) => [
      achievement.id,
      achievement,
    ]),
  );

  for (const achievementId of achievementIds) {
    if (isAchievementId(achievementId) && !earnedById.has(achievementId)) {
      earnedById.set(achievementId, { id: achievementId, earnedAt });
    }
  }

  const nextState = { earnedAchievements: [...earnedById.values()] };
  persistAchievementState(nextState);
  return nextState;
}
