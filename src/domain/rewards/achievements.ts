export const achievementMetricKeys = [
  "totalLoggedSessions",
  "enduranceActivities",
  "runningActivities",
  "runningTotalKm",
  "runningLongestKm",
  "runningFiveKmUnder30",
  "runningFiveKmUnder25",
  "runningSubFivePaceRuns",
  "runningElevationMetersTotal",
  "swimmingActivities",
  "swimmingTotalMeters",
  "swimmingLongestMeters",
  "completedStrengthSessions",
  "strengthCompletedSets",
  "strengthVolumeKg",
  "benchPressMaxKg",
  "squatMaxKg",
  "deadliftMaxKg",
  "maxDailySteps",
  "totalSteps",
  "activeDays",
  "activeWeeksWithThreeSessions",
  "disciplineCount",
  "tripleDisciplineWeeks",
  "completedNutritionDays",
] as const;

export type AchievementMetricKey = (typeof achievementMetricKeys)[number];

export type AchievementCategory =
  | "starter"
  | "running"
  | "swimming"
  | "strength"
  | "steps"
  | "consistency"
  | "versatility"
  | "nutrition";

export type AchievementTier = "bronze" | "silver" | "gold" | "legendary";

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  metric: AchievementMetricKey;
  target: number;
  requirementLabel: string;
  previewLabel?: string;
}

export const achievementCatalog = [
  {
    id: "first-session",
    name: "Premier élan",
    description: "Le début officiel de ton historique sportif dans SportPilot.",
    category: "starter",
    tier: "bronze",
    metric: "totalLoggedSessions",
    target: 1,
    requirementLabel: "Enregistrer une activité ou terminer une séance",
  },
  {
    id: "ten-sessions",
    name: "Rythme installé",
    description: "Dix entraînements enregistrés : la routine commence à prendre.",
    category: "starter",
    tier: "bronze",
    metric: "totalLoggedSessions",
    target: 10,
    requirementLabel: "Enregistrer 10 entraînements",
  },
  {
    id: "sessions-fifty",
    name: "Agenda solide",
    description: "Cinquante entraînements suivis sans casser la traçabilité.",
    category: "starter",
    tier: "silver",
    metric: "totalLoggedSessions",
    target: 50,
    requirementLabel: "Enregistrer 50 entraînements",
  },
  {
    id: "sessions-hundred",
    name: "Routine d’acier",
    description: "Cent entraînements consignés dans l’application.",
    category: "starter",
    tier: "gold",
    metric: "totalLoggedSessions",
    target: 100,
    requirementLabel: "Enregistrer 100 entraînements",
  },
  {
    id: "running-first",
    name: "Première foulée",
    description: "Une première course enregistrée proprement.",
    category: "running",
    tier: "bronze",
    metric: "runningActivities",
    target: 1,
    requirementLabel: "Enregistrer une course",
  },
  {
    id: "running-ten",
    name: "Prise de rythme",
    description: "Dix courses pour poser une vraie base d’endurance.",
    category: "running",
    tier: "bronze",
    metric: "runningActivities",
    target: 10,
    requirementLabel: "Enregistrer 10 courses",
  },
  {
    id: "running-fifty",
    name: "Coureur confirmé",
    description: "Cinquante courses suivies avec régularité.",
    category: "running",
    tier: "silver",
    metric: "runningActivities",
    target: 50,
    requirementLabel: "Enregistrer 50 courses",
  },
  {
    id: "running-hundred",
    name: "Centurion de la route",
    description: "Cent courses dans l’historique SportPilot.",
    category: "running",
    tier: "gold",
    metric: "runningActivities",
    target: 100,
    requirementLabel: "Enregistrer 100 courses",
  },
  {
    id: "running-5k",
    name: "Premier 5K",
    description: "La première distance de référence est validée.",
    category: "running",
    tier: "bronze",
    metric: "runningLongestKm",
    target: 5,
    requirementLabel: "Courir au moins 5 km",
  },
  {
    id: "running-10k",
    name: "Premier 10K",
    description: "Dix kilomètres d’un seul tenant.",
    category: "running",
    tier: "silver",
    metric: "runningLongestKm",
    target: 10,
    requirementLabel: "Courir au moins 10 km",
  },
  {
    id: "running-half-marathon",
    name: "Semi-marathonien",
    description: "Le cap du semi-marathon est franchi.",
    category: "running",
    tier: "gold",
    metric: "runningLongestKm",
    target: 21.1,
    requirementLabel: "Courir au moins 21,1 km",
  },
  {
    id: "running-marathon",
    name: "Marathonien",
    description: "La distance mythique entre dans ton historique.",
    category: "running",
    tier: "legendary",
    metric: "runningLongestKm",
    target: 42.195,
    requirementLabel: "Courir au moins 42,195 km",
  },
  {
    id: "running-100k",
    name: "Premier centenaire",
    description: "Cent kilomètres cumulés en course à pied.",
    category: "running",
    tier: "silver",
    metric: "runningTotalKm",
    target: 100,
    requirementLabel: "Cumuler 100 km de course",
  },
  {
    id: "running-500k",
    name: "Grand voyageur",
    description: "Cinq cents kilomètres cumulés avec tes chaussures.",
    category: "running",
    tier: "gold",
    metric: "runningTotalKm",
    target: 500,
    requirementLabel: "Cumuler 500 km de course",
  },
  {
    id: "running-5k-under-30",
    name: "5K express",
    description: "Un 5 km couru en moins de 30 minutes.",
    category: "running",
    tier: "silver",
    metric: "runningFiveKmUnder30",
    target: 1,
    requirementLabel: "Courir 5 km en moins de 30 min",
  },
  {
    id: "running-5k-under-25",
    name: "Barrière des 5 min/km",
    description: "Un 5 km couru sous les 25 minutes.",
    category: "running",
    tier: "gold",
    metric: "runningFiveKmUnder25",
    target: 1,
    requirementLabel: "Courir 5 km en moins de 25 min",
  },
  {
    id: "endurance-five",
    name: "Cap endurance",
    description: "Une première série de sorties de course, natation ou vélo.",
    category: "running",
    tier: "bronze",
    metric: "enduranceActivities",
    target: 5,
    requirementLabel: "Enregistrer 5 activités d’endurance",
  },
  {
    id: "endurance-twenty",
    name: "Fond solide",
    description: "Vingt activités d’endurance constituent une base durable.",
    category: "running",
    tier: "silver",
    metric: "enduranceActivities",
    target: 20,
    requirementLabel: "Enregistrer 20 activités d’endurance",
  },
  {
    id: "swimming-first",
    name: "Premier plongeon",
    description: "Une première séance de natation enregistrée.",
    category: "swimming",
    tier: "bronze",
    metric: "swimmingActivities",
    target: 1,
    requirementLabel: "Enregistrer une séance de natation",
  },
  {
    id: "swimming-ten",
    name: "Nageur régulier",
    description: "Dix séances dans le bassin ou en eau libre.",
    category: "swimming",
    tier: "bronze",
    metric: "swimmingActivities",
    target: 10,
    requirementLabel: "Enregistrer 10 séances de natation",
  },
  {
    id: "swimming-fifty",
    name: "Nageur confirmé",
    description: "Cinquante séances suivies en natation.",
    category: "swimming",
    tier: "silver",
    metric: "swimmingActivities",
    target: 50,
    requirementLabel: "Enregistrer 50 séances de natation",
  },
  {
    id: "swimming-hundred",
    name: "Maître du bassin",
    description: "Cent séances de natation dans l’historique.",
    category: "swimming",
    tier: "gold",
    metric: "swimmingActivities",
    target: 100,
    requirementLabel: "Enregistrer 100 séances de natation",
  },
  {
    id: "swimming-500m",
    name: "Sans reprendre pied",
    description: "Cinq cents mètres dans une même séance.",
    category: "swimming",
    tier: "bronze",
    metric: "swimmingLongestMeters",
    target: 500,
    requirementLabel: "Nager 500 m dans une séance",
  },
  {
    id: "swimming-1k",
    name: "Premier kilomètre",
    description: "Un kilomètre de natation dans une séance.",
    category: "swimming",
    tier: "silver",
    metric: "swimmingLongestMeters",
    target: 1000,
    requirementLabel: "Nager 1 km dans une séance",
  },
  {
    id: "swimming-2k",
    name: "Deux kilomètres",
    description: "Deux kilomètres dans l’eau sans sortir du suivi.",
    category: "swimming",
    tier: "gold",
    metric: "swimmingLongestMeters",
    target: 2000,
    requirementLabel: "Nager 2 km dans une séance",
  },
  {
    id: "swimming-10k-total",
    name: "Ligne d’eau durable",
    description: "Dix kilomètres cumulés en natation.",
    category: "swimming",
    tier: "silver",
    metric: "swimmingTotalMeters",
    target: 10000,
    requirementLabel: "Cumuler 10 km de natation",
  },
  {
    id: "swimming-100k-total",
    name: "Traversée au long cours",
    description: "Cent kilomètres cumulés dans l’eau.",
    category: "swimming",
    tier: "legendary",
    metric: "swimmingTotalMeters",
    target: 100000,
    requirementLabel: "Cumuler 100 km de natation",
  },
  {
    id: "strength-first",
    name: "Première fonte",
    description: "Une première séance de musculation terminée.",
    category: "strength",
    tier: "bronze",
    metric: "completedStrengthSessions",
    target: 1,
    requirementLabel: "Terminer une séance de musculation",
  },
  {
    id: "strength-five",
    name: "Force lancée",
    description: "Cinq séances terminées pour ancrer le suivi de musculation.",
    category: "strength",
    tier: "bronze",
    metric: "completedStrengthSessions",
    target: 5,
    requirementLabel: "Terminer 5 séances de musculation",
  },
  {
    id: "strength-twenty",
    name: "Force régulière",
    description: "Vingt séances terminées témoignent d’une vraie continuité.",
    category: "strength",
    tier: "silver",
    metric: "completedStrengthSessions",
    target: 20,
    requirementLabel: "Terminer 20 séances de musculation",
  },
  {
    id: "strength-fifty",
    name: "Pilier de la salle",
    description: "Cinquante séances de musculation terminées.",
    category: "strength",
    tier: "silver",
    metric: "completedStrengthSessions",
    target: 50,
    requirementLabel: "Terminer 50 séances de musculation",
  },
  {
    id: "strength-hundred",
    name: "Mur porteur",
    description: "Cent séances terminées avec suivi complet.",
    category: "strength",
    tier: "gold",
    metric: "completedStrengthSessions",
    target: 100,
    requirementLabel: "Terminer 100 séances de musculation",
  },
  {
    id: "strength-five-hundred",
    name: "Vétéran",
    description: "Cinq cents séances terminées : la régularité devient un actif.",
    category: "strength",
    tier: "legendary",
    metric: "completedStrengthSessions",
    target: 500,
    requirementLabel: "Terminer 500 séances de musculation",
  },
  {
    id: "strength-sets-100",
    name: "Cent séries",
    description: "Cent séries validées dans le carnet.",
    category: "strength",
    tier: "bronze",
    metric: "strengthCompletedSets",
    target: 100,
    requirementLabel: "Valider 100 séries",
  },
  {
    id: "strength-sets-1000",
    name: "Mille séries",
    description: "Mille séries validées, uniquement sur des séries terminées.",
    category: "strength",
    tier: "gold",
    metric: "strengthCompletedSets",
    target: 1000,
    requirementLabel: "Valider 1 000 séries",
  },
  {
    id: "strength-volume-50t",
    name: "Cinquante tonnes",
    description: "Le volume cumulé franchit un palier significatif.",
    category: "strength",
    tier: "gold",
    metric: "strengthVolumeKg",
    target: 50000,
    requirementLabel: "Cumuler 50 000 kg de volume",
  },
  {
    id: "bench-60",
    name: "Développé 60",
    description: "Une série validée à 60 kg au développé couché.",
    category: "strength",
    tier: "silver",
    metric: "benchPressMaxKg",
    target: 60,
    requirementLabel: "Valider 60 kg au développé couché",
  },
  {
    id: "bench-80",
    name: "Développé 80",
    description: "Une série validée à 80 kg au développé couché.",
    category: "strength",
    tier: "gold",
    metric: "benchPressMaxKg",
    target: 80,
    requirementLabel: "Valider 80 kg au développé couché",
  },
  {
    id: "bench-100",
    name: "Développé 100",
    description: "Le cap symbolique des 100 kg au développé couché.",
    category: "strength",
    tier: "legendary",
    metric: "benchPressMaxKg",
    target: 100,
    requirementLabel: "Valider 100 kg au développé couché",
  },
  {
    id: "squat-100",
    name: "Squat 100",
    description: "Une série validée à 100 kg au squat.",
    category: "strength",
    tier: "gold",
    metric: "squatMaxKg",
    target: 100,
    requirementLabel: "Valider 100 kg au squat",
  },
  {
    id: "deadlift-150",
    name: "Soulevé 150",
    description: "Une série validée à 150 kg au soulevé de terre.",
    category: "strength",
    tier: "legendary",
    metric: "deadliftMaxKg",
    target: 150,
    requirementLabel: "Valider 150 kg au soulevé de terre",
  },
  {
    id: "steps-10k",
    name: "Dix mille",
    description: "Dix mille pas atteints sur une journée.",
    category: "steps",
    tier: "bronze",
    metric: "maxDailySteps",
    target: 10000,
    requirementLabel: "Atteindre 10 000 pas en une journée",
  },
  {
    id: "steps-20k",
    name: "Grande marche",
    description: "Vingt mille pas sur une journée.",
    category: "steps",
    tier: "silver",
    metric: "maxDailySteps",
    target: 20000,
    requirementLabel: "Atteindre 20 000 pas en une journée",
  },
  {
    id: "steps-30k",
    name: "Marcheur infatigable",
    description: "Trente mille pas dans une seule journée.",
    category: "steps",
    tier: "gold",
    metric: "maxDailySteps",
    target: 30000,
    requirementLabel: "Atteindre 30 000 pas en une journée",
  },
  {
    id: "steps-million",
    name: "Un million de pas",
    description: "Un million de pas cumulés dans SportPilot.",
    category: "steps",
    tier: "legendary",
    metric: "totalSteps",
    target: 1000000,
    requirementLabel: "Cumuler 1 000 000 de pas",
  },
  {
    id: "active-seven",
    name: "Semaine active",
    description: "Sept journées distinctes avec une activité, une séance ou une pesée.",
    category: "consistency",
    tier: "bronze",
    metric: "activeDays",
    target: 7,
    requirementLabel: "Enregistrer 7 journées actives distinctes",
  },
  {
    id: "active-four-weeks",
    name: "Un mois solide",
    description: "Quatre semaines avec au moins trois entraînements.",
    category: "consistency",
    tier: "silver",
    metric: "activeWeeksWithThreeSessions",
    target: 4,
    requirementLabel: "Faire 3 séances par semaine pendant 4 semaines",
  },
  {
    id: "versatile-three",
    name: "Profil polyvalent",
    description: "Trois disciplines différentes suivies dans la même application.",
    category: "versatility",
    tier: "silver",
    metric: "disciplineCount",
    target: 3,
    requirementLabel: "Pratiquer 3 disciplines différentes",
  },
  {
    id: "triple-discipline-week",
    name: "Triple discipline",
    description: "Course, natation et musculation réunies sur une même semaine.",
    category: "versatility",
    tier: "gold",
    metric: "tripleDisciplineWeeks",
    target: 1,
    requirementLabel: "Faire course, natation et musculation la même semaine",
  },
  {
    id: "nutrition-seven",
    name: "Journal appliqué",
    description: "Sept journées nutritionnelles marquées comme complètes.",
    category: "nutrition",
    tier: "bronze",
    metric: "completedNutritionDays",
    target: 7,
    requirementLabel: "Compléter le journal alimentaire pendant 7 jours",
  },
] as const satisfies readonly AchievementDefinition[];

export type AchievementId = (typeof achievementCatalog)[number]["id"];

export interface EarnedAchievement {
  id: AchievementId;
  earnedAt: string;
}

export interface AchievementState {
  earnedAchievements: EarnedAchievement[];
}

export const ACHIEVEMENT_STORAGE_KEY = "sport-pilot.achievements";

function isAchievementId(value: unknown): value is AchievementId {
  return achievementCatalog.some((achievement) => achievement.id === value);
}

export function emptyAchievementState(): AchievementState {
  return { earnedAchievements: [] };
}

export function parseAchievementState(
  value: unknown,
): AchievementState | undefined {
  if (!value || typeof value !== "object") return undefined;

  const parsed = value as Partial<AchievementState>;
  if (!Array.isArray(parsed.earnedAchievements)) return undefined;

  const earnedById = new Map<AchievementId, EarnedAchievement>();

  for (const candidate of parsed.earnedAchievements) {
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      isAchievementId(candidate.id) &&
      typeof candidate.earnedAt === "string" &&
      candidate.earnedAt.length > 0
    ) {
      const existing = earnedById.get(candidate.id);
      if (
        !existing ||
        candidate.earnedAt.localeCompare(existing.earnedAt) < 0
      ) {
        earnedById.set(candidate.id, {
          id: candidate.id,
          earnedAt: candidate.earnedAt,
        });
      }
    }
  }

  return {
    earnedAchievements: [...earnedById.values()].sort((left, right) =>
      left.earnedAt.localeCompare(right.earnedAt) ||
      left.id.localeCompare(right.id),
    ),
  };
}

export type AchievementStatePersistence = (
  state: AchievementState,
) => Promise<void>;

interface AchievementStateRuntime {
  state: AchievementState;
  persist: AchievementStatePersistence;
}

let achievementStateRuntime: AchievementStateRuntime | undefined;
let achievementPersistenceQueue: Promise<void> = Promise.resolve();
let latestAchievementFallback: string | undefined;

function cloneAchievementState(
  state: AchievementState,
): AchievementState {
  return {
    earnedAchievements: state.earnedAchievements.map((achievement) => ({
      ...achievement,
    })),
  };
}

export function readLegacyAchievementState(): AchievementState | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const rawValue = window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY);

    return rawValue === null
      ? undefined
      : parseAchievementState(JSON.parse(rawValue));
  } catch {
    return undefined;
  }
}

function writeAchievementFallback(serialized: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ACHIEVEMENT_STORAGE_KEY, serialized);
  } catch {
    // Dexie reste prioritaire lorsque le fallback est indisponible.
  }
}

function removeAchievementFallback(serialized: string): void {
  if (typeof window === "undefined") return;

  try {
    if (
      latestAchievementFallback === serialized &&
      window.localStorage.getItem(ACHIEVEMENT_STORAGE_KEY) === serialized
    ) {
      window.localStorage.removeItem(ACHIEVEMENT_STORAGE_KEY);
    }
  } catch {
    // La clé sera réévaluée au prochain démarrage.
  }
}

export function hydrateAchievementStateRuntime(
  state: AchievementState,
  persist: AchievementStatePersistence,
): void {
  achievementStateRuntime = {
    state: cloneAchievementState(state),
    persist,
  };
  achievementPersistenceQueue = Promise.resolve();
  latestAchievementFallback = undefined;
}

export function resetAchievementStateRuntimeForTests(): void {
  achievementStateRuntime = undefined;
  achievementPersistenceQueue = Promise.resolve();
  latestAchievementFallback = undefined;
}

export async function flushAchievementStatePersistence(): Promise<void> {
  await achievementPersistenceQueue;
}

export function readAchievementState(): AchievementState {
  if (achievementStateRuntime) {
    return cloneAchievementState(achievementStateRuntime.state);
  }

  return readLegacyAchievementState() ?? emptyAchievementState();
}

export function writeAchievementState(state: AchievementState): void {
  const snapshot = cloneAchievementState(
    parseAchievementState(state) ?? emptyAchievementState(),
  );
  const serialized = JSON.stringify(snapshot);

  if (!achievementStateRuntime) {
    writeAchievementFallback(serialized);
    return;
  }

  const persist = achievementStateRuntime.persist;
  achievementStateRuntime.state = snapshot;
  latestAchievementFallback = serialized;
  writeAchievementFallback(serialized);

  achievementPersistenceQueue = achievementPersistenceQueue
    .catch(() => undefined)
    .then(() => persist(snapshot))
    .then(() => removeAchievementFallback(serialized))
    .catch((error: unknown) => {
      console.error(
        "La persistance Dexie des badges a échoué.",
        error,
      );
    });
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

  const nextState = {
    earnedAchievements: [...earnedById.values()].sort((left, right) =>
      left.earnedAt.localeCompare(right.earnedAt) ||
      left.id.localeCompare(right.id),
    ),
  };
  writeAchievementState(nextState);
  return nextState;
}
