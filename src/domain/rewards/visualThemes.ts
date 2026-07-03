export const visualThemeIds = [
  "classic",
  "endurance",
  "power",
  "balance",
  "aurore",
  "foret",
  "ocean",
  "acier",
  "nuit-polaire",
  "abysses",
  "volcan",
  "canopee",
  "cosmos",
  "forge",
  "nexus-vivant",
] as const;

export type VisualThemeId = (typeof visualThemeIds)[number];
export type VisualThemeTier = "base" | "accessible" | "advanced" | "legendary";

export interface VisualThemeDefinition {
  id: VisualThemeId;
  name: string;
  description: string;
  previewFrom: string;
  previewTo: string;
  tier: VisualThemeTier;
  patternLabel: string;
  dynamic?: boolean;
}

export interface VisualThemeState {
  activeThemeId: VisualThemeId;
  unlockedThemeIds: VisualThemeId[];
}

export const DEFAULT_VISUAL_THEME_ID: VisualThemeId = "classic";
export const VISUAL_THEME_STORAGE_KEY = "sport-pilot.reward-themes";

export const visualThemeCatalog: readonly VisualThemeDefinition[] = [
  {
    id: "classic",
    name: "SportPilot classique",
    description: "Le thème bleu d’origine, disponible dès l’installation.",
    previewFrom: "#0369a1",
    previewTo: "#38bdf8",
    tier: "base",
    patternLabel: "Palette historique",
  },
  {
    id: "endurance",
    name: "Horizon endurance",
    description: "Une palette turquoise inspirée des sorties longues et de l’eau.",
    previewFrom: "#0f766e",
    previewTo: "#22d3ee",
    tier: "accessible",
    patternLabel: "Dégradé fluide",
  },
  {
    id: "power",
    name: "Puissance",
    description: "Une palette chaude pour célébrer la progression en musculation.",
    previewFrom: "#c2410c",
    previewTo: "#f59e0b",
    tier: "accessible",
    patternLabel: "Lumière chaude",
  },
  {
    id: "balance",
    name: "Équilibre",
    description: "Une palette violette obtenue grâce à une pratique régulière.",
    previewFrom: "#7e22ce",
    previewTo: "#ec4899",
    tier: "accessible",
    patternLabel: "Halo violet",
  },
  {
    id: "aurore",
    name: "Aurore",
    description: "Rose, orange et lumière douce pour les premiers jalons.",
    previewFrom: "#fb7185",
    previewTo: "#fbbf24",
    tier: "accessible",
    patternLabel: "Aube diffuse",
  },
  {
    id: "foret",
    name: "Forêt",
    description: "Verts profonds, mousse et impression de sous-bois.",
    previewFrom: "#166534",
    previewTo: "#84cc16",
    tier: "accessible",
    patternLabel: "Feuillage discret",
  },
  {
    id: "ocean",
    name: "Océan",
    description: "Fond bleu-turquoise plus coloré, aquatique et lisible, avec bulles stylisées et lumière marine sans asset image ni animation.",
    previewFrom: "#0284c7",
    previewTo: "#2dd4bf",
    tier: "accessible",
    patternLabel: "Dégradé océanique coloré",
  },
  {
    id: "acier",
    name: "Acier",
    description: "Gris froid, accents rouges et rendu plus mécanique.",
    previewFrom: "#475569",
    previewTo: "#dc2626",
    tier: "accessible",
    patternLabel: "Métal brossé",
  },
  {
    id: "nuit-polaire",
    name: "Nuit polaire",
    description: "Bleu nuit, cyan et halos froids pour une ambiance calme.",
    previewFrom: "#0f172a",
    previewTo: "#06b6d4",
    tier: "accessible",
    patternLabel: "Aurores froides",
  },
  {
    id: "abysses",
    name: "Abysses",
    description: "Ambiance abyssale plus colorée et profonde, sombre mais lisible, avec halos aquatiques et bulles discrètes sans animation.",
    previewFrom: "#082f49",
    previewTo: "#0e7490",
    tier: "advanced",
    patternLabel: "Dégradé abyssal profond",
  },
  {
    id: "volcan",
    name: "Volcan",
    description: "Ambiance volcanique plus présente : lave suggérée, fumée sombre et braises stylisées, sans image lourde ni mouvement.",
    previewFrom: "#1c1917",
    previewTo: "#f97316",
    tier: "advanced",
    patternLabel: "Dégradé volcanique coloré",
  },
  {
    id: "canopee",
    name: "Canopée",
    description: "Fond canopée plus vivant et coloré, avec feuillage, profondeur verte et lumière filtrée sans asset externe.",
    previewFrom: "#14532d",
    previewTo: "#a3e635",
    tier: "advanced",
    patternLabel: "Canopée colorée",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    description: "Fond cosmique plus visible et coloré, avec halos de nébuleuse, étoiles et profondeur sci-fi sans animation.",
    previewFrom: "#312e81",
    previewTo: "#f0abfc",
    tier: "advanced",
    patternLabel: "Dégradé cosmique premium",
  },
  {
    id: "forge",
    name: "Forge",
    description: "Forge industrielle colorée, acier sombre et chaleur maîtrisée, plus présente sans devenir trop flashy.",
    previewFrom: "#334155",
    previewTo: "#f97316",
    tier: "advanced",
    patternLabel: "Forge industrielle colorée",
  },
  {
    id: "nexus-vivant",
    name: "Nexus vivant",
    description: "Thème ultime sci-fi/fantasy plus coloré, avec énergie Nexus suggérée par halos et anneaux, sans animation ni asset image.",
    previewFrom: "#0f172a",
    previewTo: "#22c55e",
    tier: "legendary",
    patternLabel: "Nexus statique ultime",
    dynamic: true,
  },
] as const;

function isVisualThemeId(value: unknown): value is VisualThemeId {
  return visualThemeCatalog.some((theme) => theme.id === value);
}

export function emptyVisualThemeState(): VisualThemeState {
  return {
    activeThemeId: DEFAULT_VISUAL_THEME_ID,
    unlockedThemeIds: [DEFAULT_VISUAL_THEME_ID],
  };
}

export function parseVisualThemeState(
  value: unknown,
): VisualThemeState | undefined {
  if (!value || typeof value !== "object") return undefined;

  const parsed = value as Partial<VisualThemeState>;
  const unlockedThemeIds = Array.isArray(parsed.unlockedThemeIds)
    ? parsed.unlockedThemeIds.filter(isVisualThemeId)
    : [];

  const catalogOrder = new Map(
    visualThemeCatalog.map((theme, index) => [theme.id, index]),
  );
  const normalizedUnlockedThemeIds = Array.from(
    new Set<VisualThemeId>([DEFAULT_VISUAL_THEME_ID, ...unlockedThemeIds]),
  ).sort(
    (left, right) =>
      (catalogOrder.get(left) ?? 0) - (catalogOrder.get(right) ?? 0),
  );

  const activeThemeId =
    isVisualThemeId(parsed.activeThemeId) &&
    normalizedUnlockedThemeIds.includes(parsed.activeThemeId)
      ? parsed.activeThemeId
      : DEFAULT_VISUAL_THEME_ID;

  return { activeThemeId, unlockedThemeIds: normalizedUnlockedThemeIds };
}

export type VisualThemeStatePersistence = (
  state: VisualThemeState,
) => Promise<void>;

interface VisualThemeStateRuntime {
  state: VisualThemeState;
  persist: VisualThemeStatePersistence;
}

let visualThemeStateRuntime: VisualThemeStateRuntime | undefined;
let visualThemePersistenceQueue: Promise<void> = Promise.resolve();
let latestVisualThemeFallback: string | undefined;

function cloneVisualThemeState(state: VisualThemeState): VisualThemeState {
  return {
    activeThemeId: state.activeThemeId,
    unlockedThemeIds: [...state.unlockedThemeIds],
  };
}

export function readLegacyVisualThemeState(): VisualThemeState | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    const rawValue = window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY);

    return rawValue === null
      ? undefined
      : parseVisualThemeState(JSON.parse(rawValue));
  } catch {
    return undefined;
  }
}

function writeVisualThemeFallback(serialized: string): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(VISUAL_THEME_STORAGE_KEY, serialized);
  } catch {
    // Dexie reste prioritaire lorsque le fallback est indisponible.
  }
}

function removeVisualThemeFallback(serialized: string): void {
  if (typeof window === "undefined") return;

  try {
    if (
      latestVisualThemeFallback === serialized &&
      window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY) === serialized
    ) {
      window.localStorage.removeItem(VISUAL_THEME_STORAGE_KEY);
    }
  } catch {
    // La clé sera réévaluée au prochain démarrage.
  }
}

export function hydrateVisualThemeStateRuntime(
  state: VisualThemeState,
  persist: VisualThemeStatePersistence,
): void {
  visualThemeStateRuntime = {
    state: cloneVisualThemeState(state),
    persist,
  };
  visualThemePersistenceQueue = Promise.resolve();
  latestVisualThemeFallback = undefined;
}

export function resetVisualThemeStateRuntimeForTests(): void {
  visualThemeStateRuntime = undefined;
  visualThemePersistenceQueue = Promise.resolve();
  latestVisualThemeFallback = undefined;
}

export async function flushVisualThemeStatePersistence(): Promise<void> {
  await visualThemePersistenceQueue;
}

export function readVisualThemeState(): VisualThemeState {
  if (visualThemeStateRuntime) {
    return cloneVisualThemeState(visualThemeStateRuntime.state);
  }

  return readLegacyVisualThemeState() ?? emptyVisualThemeState();
}

export function writeVisualThemeState(state: VisualThemeState): void {
  const snapshot = cloneVisualThemeState(
    parseVisualThemeState(state) ?? emptyVisualThemeState(),
  );
  const serialized = JSON.stringify(snapshot);

  if (!visualThemeStateRuntime) {
    writeVisualThemeFallback(serialized);
    return;
  }

  const persist = visualThemeStateRuntime.persist;
  visualThemeStateRuntime.state = snapshot;
  latestVisualThemeFallback = serialized;
  writeVisualThemeFallback(serialized);

  visualThemePersistenceQueue = visualThemePersistenceQueue
    .catch(() => undefined)
    .then(() => persist(snapshot))
    .then(() => removeVisualThemeFallback(serialized))
    .catch((error: unknown) => {
      console.error(
        "La persistance Dexie des thèmes de récompense a échoué.",
        error,
      );
    });
}

export function applyVisualTheme(themeId: VisualThemeId): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.sportTheme = themeId;
}

export function applyStoredVisualTheme(): VisualThemeId {
  const state = readVisualThemeState();
  applyVisualTheme(state.activeThemeId);
  return state.activeThemeId;
}

export function previewVisualTheme(themeId: VisualThemeId): void {
  applyVisualTheme(themeId);
}

export function clearVisualThemePreview(): VisualThemeId {
  return applyStoredVisualTheme();
}

export function unlockVisualThemes(
  themeIds: readonly VisualThemeId[],
): VisualThemeState {
  const currentState = readVisualThemeState();
  const unlockedThemeIds = Array.from(
    new Set<VisualThemeId>([
      ...currentState.unlockedThemeIds,
      ...themeIds.filter(isVisualThemeId),
    ]),
  );
  const nextState = { ...currentState, unlockedThemeIds };
  writeVisualThemeState(nextState);
  return nextState;
}

export function activateVisualTheme(themeId: VisualThemeId): boolean {
  const currentState = readVisualThemeState();
  if (!currentState.unlockedThemeIds.includes(themeId)) return false;

  const nextState = { ...currentState, activeThemeId: themeId };
  writeVisualThemeState(nextState);
  applyVisualTheme(themeId);
  return true;
}
