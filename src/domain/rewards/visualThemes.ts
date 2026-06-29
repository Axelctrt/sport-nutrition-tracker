export type VisualThemeId = "classic" | "endurance" | "power" | "balance";

export interface VisualThemeDefinition {
  id: VisualThemeId;
  name: string;
  description: string;
  previewFrom: string;
  previewTo: string;
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
  },
  {
    id: "endurance",
    name: "Horizon endurance",
    description:
      "Une palette turquoise inspirée des sorties longues et de l’eau.",
    previewFrom: "#0f766e",
    previewTo: "#22d3ee",
  },
  {
    id: "power",
    name: "Puissance",
    description:
      "Une palette chaude pour célébrer la progression en musculation.",
    previewFrom: "#c2410c",
    previewTo: "#f59e0b",
  },
  {
    id: "balance",
    name: "Équilibre",
    description: "Une palette violette obtenue grâce à une pratique régulière.",
    previewFrom: "#7e22ce",
    previewTo: "#ec4899",
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
