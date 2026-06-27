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

function createDefaultState(): VisualThemeState {
  return {
    activeThemeId: DEFAULT_VISUAL_THEME_ID,
    unlockedThemeIds: [DEFAULT_VISUAL_THEME_ID],
  };
}

export function readVisualThemeState(): VisualThemeState {
  if (typeof window === "undefined") return createDefaultState();

  try {
    const rawValue = window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY);
    if (!rawValue) return createDefaultState();

    const parsed = JSON.parse(rawValue) as Partial<VisualThemeState>;
    const unlockedThemeIds = Array.isArray(parsed.unlockedThemeIds)
      ? parsed.unlockedThemeIds.filter(isVisualThemeId)
      : [];

    const normalizedUnlockedThemeIds = Array.from(
      new Set<VisualThemeId>([DEFAULT_VISUAL_THEME_ID, ...unlockedThemeIds]),
    );

    const activeThemeId =
      isVisualThemeId(parsed.activeThemeId) &&
      normalizedUnlockedThemeIds.includes(parsed.activeThemeId)
        ? parsed.activeThemeId
        : DEFAULT_VISUAL_THEME_ID;

    return { activeThemeId, unlockedThemeIds: normalizedUnlockedThemeIds };
  } catch {
    return createDefaultState();
  }
}

function persistVisualThemeState(state: VisualThemeState): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      VISUAL_THEME_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    // Le thème reste utilisable pendant la session si le stockage est refusé.
  }
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
  persistVisualThemeState(nextState);
  return nextState;
}

export function activateVisualTheme(themeId: VisualThemeId): boolean {
  const currentState = readVisualThemeState();
  if (!currentState.unlockedThemeIds.includes(themeId)) return false;

  const nextState = { ...currentState, activeThemeId: themeId };
  persistVisualThemeState(nextState);
  applyVisualTheme(themeId);
  return true;
}
