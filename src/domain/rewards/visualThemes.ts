export const visualThemeIds = [
  "core",
  "neon-pulse",
  "emerald-focus",
  "aurora",
  "zenith-gold",
] as const;

export type SportPilotThemeId = (typeof visualThemeIds)[number];
export type VisualThemeId = SportPilotThemeId;
export type SportPilotThemeRarity =
  | "standard"
  | "rare"
  | "epic"
  | "legendary";
export type ThemeMotionProfileName =
  | "balanced"
  | "energetic"
  | "focused"
  | "smooth-premium"
  | "prestige";
export type ThemeRewardEffect =
  | "pulse"
  | "neon-ring"
  | "focus-bloom"
  | "aurora-sparkles"
  | "golden-reveal";

export interface ThemePalette {
  backgroundPrimary: string;
  backgroundSecondary: string;
  surfacePrimary: string;
  surfaceElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accentPrimary: string;
  accentSecondary: string;
  accentIntense: string;
  success: string;
  warning: string;
  error: string;
  progress: string;
  chart: readonly [string, string, string, string, string];
}

export interface ThemeMotionProfile {
  name: ThemeMotionProfileName;
  durationStandard: number;
  durationEmphasis: number;
  intensity: "low" | "medium" | "restrained";
}

export interface SportPilotThemeDefinition {
  id: SportPilotThemeId;
  name: string;
  description: string;
  rarity: SportPilotThemeRarity;
  palette: {
    light: ThemePalette;
    dark: ThemePalette;
  };
  backgroundStyle:
    | "technical-grid"
    | "pulse-grid"
    | "organic-lines"
    | "aurora-bands"
    | "mineral-lines";
  surfaceStyle:
    | "performance"
    | "translucent"
    | "satin"
    | "glass"
    | "prestige";
  buttonStyle:
    | "electric"
    | "neon"
    | "focused"
    | "aurora"
    | "gold";
  chartStyle: {
    strokeWidth: number;
    gridOpacity: number;
    pointRadius: number;
  };
  motionProfile: ThemeMotionProfile;
  rewardEffect: ThemeRewardEffect;
  preview: {
    from: string;
    to: string;
  };
}

export interface VisualThemeUnlockMetadata {
  unlockedAt: string;
  revealSeenAt?: string;
}

export interface VisualThemeState {
  activeThemeId: VisualThemeId;
  unlockedThemeIds: VisualThemeId[];
  unlockMetadata: Partial<Record<VisualThemeId, VisualThemeUnlockMetadata>>;
}

export const DEFAULT_VISUAL_THEME_ID: VisualThemeId = "core";
export const VISUAL_THEME_STORAGE_KEY = "sport-pilot.reward-themes";
export const VISUAL_THEME_BOOT_STORAGE_KEY = "sport-pilot.active-theme";

const coreLight: ThemePalette = {
  backgroundPrimary: "#F4F7FB",
  backgroundSecondary: "#EAF0F8",
  surfacePrimary: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  border: "#C5D0DF",
  textPrimary: "#101827",
  textSecondary: "#40516A",
  textMuted: "#65758C",
  accentPrimary: "#2563EB",
  accentSecondary: "#0891B2",
  accentIntense: "#7C3AED",
  success: "#059669",
  warning: "#B45309",
  error: "#E11D48",
  progress: "#7C3AED",
  chart: ["#2563EB", "#0891B2", "#059669", "#7C3AED", "#D97706"],
};

const coreDark: ThemePalette = {
  backgroundPrimary: "#070B17",
  backgroundSecondary: "#0B1222",
  surfacePrimary: "#111A2E",
  surfaceElevated: "#17233A",
  border: "#26344F",
  textPrimary: "#F6F8FC",
  textSecondary: "#AAB5C8",
  textMuted: "#78869F",
  accentPrimary: "#3B82F6",
  accentSecondary: "#22D3EE",
  accentIntense: "#8B5CF6",
  success: "#34D399",
  warning: "#FBBF24",
  error: "#FB7185",
  progress: "#8B5CF6",
  chart: ["#60A5FA", "#22D3EE", "#34D399", "#A78BFA", "#FBBF24"],
};

export const visualThemeCatalog: readonly SportPilotThemeDefinition[] = [
  {
    id: "core",
    name: "Core",
    description: "L'identite officielle SportPilot, claire, fiable et orientee performance.",
    rarity: "standard",
    palette: { light: coreLight, dark: coreDark },
    backgroundStyle: "technical-grid",
    surfaceStyle: "performance",
    buttonStyle: "electric",
    chartStyle: { strokeWidth: 2.5, gridOpacity: 0.42, pointRadius: 3 },
    motionProfile: {
      name: "balanced",
      durationStandard: 220,
      durationEmphasis: 380,
      intensity: "low",
    },
    rewardEffect: "pulse",
    preview: { from: "#2563EB", to: "#22D3EE" },
  },
  {
    id: "neon-pulse",
    name: "Neon Pulse",
    description: "Une energie cyber sportive controlee, rythmee par le cyan et le violet.",
    rarity: "rare",
    palette: {
      light: {
        backgroundPrimary: "#F3F7FF",
        backgroundSecondary: "#E7EEFF",
        surfacePrimary: "#FFFFFF",
        surfaceElevated: "#F8FAFF",
        border: "#A8B8DD",
        textPrimary: "#10152A",
        textSecondary: "#47516D",
        textMuted: "#68738F",
        accentPrimary: "#007C91",
        accentSecondary: "#6D28D9",
        accentIntense: "#A21CAF",
        success: "#047857",
        warning: "#A16207",
        error: "#DB2860",
        progress: "#7C3AED",
        chart: ["#007C91", "#6D28D9", "#A21CAF", "#047857", "#CA8A04"],
      },
      dark: {
        backgroundPrimary: "#040612",
        backgroundSecondary: "#080B1C",
        surfacePrimary: "#0E1328",
        surfaceElevated: "#151B36",
        border: "#24305A",
        textPrimary: "#F8FAFF",
        textSecondary: "#AEB8D2",
        textMuted: "#7F8AAA",
        accentPrimary: "#00E5FF",
        accentSecondary: "#7C3AED",
        accentIntense: "#D946EF",
        success: "#39FFB6",
        warning: "#FFD166",
        error: "#FF4D7D",
        progress: "#D946EF",
        chart: ["#00E5FF", "#A78BFA", "#D946EF", "#39FFB6", "#FFD166"],
      },
    },
    backgroundStyle: "pulse-grid",
    surfaceStyle: "translucent",
    buttonStyle: "neon",
    chartStyle: { strokeWidth: 3, gridOpacity: 0.36, pointRadius: 3 },
    motionProfile: {
      name: "energetic",
      durationStandard: 190,
      durationEmphasis: 440,
      intensity: "medium",
    },
    rewardEffect: "neon-ring",
    preview: { from: "#00E5FF", to: "#7C3AED" },
  },
  {
    id: "emerald-focus",
    name: "Emerald Focus",
    description: "Une identite calme et precise pour la discipline et la regularite.",
    rarity: "rare",
    palette: {
      light: {
        backgroundPrimary: "#F2F8F5",
        backgroundSecondary: "#E4F1EB",
        surfacePrimary: "#FFFFFF",
        surfaceElevated: "#F8FCFA",
        border: "#A9C9BE",
        textPrimary: "#11221D",
        textSecondary: "#405F55",
        textMuted: "#647F76",
        accentPrimary: "#047857",
        accentSecondary: "#0F8F83",
        accentIntense: "#065F46",
        success: "#047857",
        warning: "#B45309",
        error: "#DB365F",
        progress: "#059669",
        chart: ["#047857", "#0F8F83", "#65A30D", "#2563EB", "#B45309"],
      },
      dark: {
        backgroundPrimary: "#06110F",
        backgroundSecondary: "#0A1916",
        surfacePrimary: "#10231E",
        surfaceElevated: "#163029",
        border: "#285045",
        textPrimary: "#F3FBF8",
        textSecondary: "#ABC8BE",
        textMuted: "#72988B",
        accentPrimary: "#10B981",
        accentSecondary: "#5EEAD4",
        accentIntense: "#047857",
        success: "#6EE7B7",
        warning: "#FBBF24",
        error: "#FB7185",
        progress: "#A7F3D0",
        chart: ["#10B981", "#5EEAD4", "#A7F3D0", "#60A5FA", "#FBBF24"],
      },
    },
    backgroundStyle: "organic-lines",
    surfaceStyle: "satin",
    buttonStyle: "focused",
    chartStyle: { strokeWidth: 2.5, gridOpacity: 0.34, pointRadius: 3 },
    motionProfile: {
      name: "focused",
      durationStandard: 240,
      durationEmphasis: 360,
      intensity: "low",
    },
    rewardEffect: "focus-bloom",
    preview: { from: "#047857", to: "#5EEAD4" },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Une experience premium, fluide et immersive aux accents froids.",
    rarity: "epic",
    palette: {
      light: {
        backgroundPrimary: "#F7F5FC",
        backgroundSecondary: "#EDEAF7",
        surfacePrimary: "#FFFFFF",
        surfaceElevated: "#FCFAFF",
        border: "#C6BFDC",
        textPrimary: "#18152A",
        textSecondary: "#554F70",
        textMuted: "#756E90",
        accentPrimary: "#087C91",
        accentSecondary: "#7C3AED",
        accentIntense: "#A21CAF",
        success: "#0F8F83",
        warning: "#A16207",
        error: "#D94763",
        progress: "#7C3AED",
        chart: ["#087C91", "#7C3AED", "#A21CAF", "#0F8F83", "#CA8A04"],
      },
      dark: {
        backgroundPrimary: "#070713",
        backgroundSecondary: "#0E0C20",
        surfacePrimary: "#17152C",
        surfaceElevated: "#211E3D",
        border: "#38335D",
        textPrimary: "#FCFAFF",
        textSecondary: "#C5BED9",
        textMuted: "#8D85A8",
        accentPrimary: "#67E8F9",
        accentSecondary: "#A78BFA",
        accentIntense: "#F0ABFC",
        success: "#5EEAD4",
        warning: "#FCD34D",
        error: "#FDA4AF",
        progress: "#A78BFA",
        chart: ["#67E8F9", "#A78BFA", "#F0ABFC", "#5EEAD4", "#FCD34D"],
      },
    },
    backgroundStyle: "aurora-bands",
    surfaceStyle: "glass",
    buttonStyle: "aurora",
    chartStyle: { strokeWidth: 3, gridOpacity: 0.3, pointRadius: 3.5 },
    motionProfile: {
      name: "smooth-premium",
      durationStandard: 270,
      durationEmphasis: 500,
      intensity: "medium",
    },
    rewardEffect: "aurora-sparkles",
    preview: { from: "#67E8F9", to: "#A78BFA" },
  },
  {
    id: "zenith-gold",
    name: "Zenith Gold",
    description: "Une maitrise sobre et prestigieuse, soulignee par un or profond.",
    rarity: "legendary",
    palette: {
      light: {
        backgroundPrimary: "#F8F7F2",
        backgroundSecondary: "#EEECE2",
        surfacePrimary: "#FFFFFF",
        surfaceElevated: "#FCFBF6",
        border: "#C8BE98",
        textPrimary: "#211F16",
        textSecondary: "#5F5943",
        textMuted: "#7D7558",
        accentPrimary: "#8C6A18",
        accentSecondary: "#B68A1F",
        accentIntense: "#6F5210",
        success: "#3F7D47",
        warning: "#A16207",
        error: "#C74343",
        progress: "#8C6A18",
        chart: ["#8C6A18", "#3F7D47", "#2563EB", "#7C3AED", "#B45309"],
      },
      dark: {
        backgroundPrimary: "#080806",
        backgroundSecondary: "#11100C",
        surfacePrimary: "#19170F",
        surfaceElevated: "#242116",
        border: "#4A4225",
        textPrimary: "#FFFDF5",
        textSecondary: "#CFC6A5",
        textMuted: "#918867",
        accentPrimary: "#D4AF37",
        accentSecondary: "#F6D978",
        accentIntense: "#8C6A18",
        success: "#A7D8A0",
        warning: "#FFD166",
        error: "#FF8A8A",
        progress: "#D4AF37",
        chart: ["#D4AF37", "#A7D8A0", "#67E8F9", "#A78BFA", "#FFD166"],
      },
    },
    backgroundStyle: "mineral-lines",
    surfaceStyle: "prestige",
    buttonStyle: "gold",
    chartStyle: { strokeWidth: 2.5, gridOpacity: 0.28, pointRadius: 3 },
    motionProfile: {
      name: "prestige",
      durationStandard: 260,
      durationEmphasis: 520,
      intensity: "restrained",
    },
    rewardEffect: "golden-reveal",
    preview: { from: "#8C6A18", to: "#F6D978" },
  },
] as const;

export function isVisualThemeId(value: unknown): value is VisualThemeId {
  return visualThemeIds.includes(value as VisualThemeId);
}

export function getVisualThemeDefinition(
  themeId: unknown,
): SportPilotThemeDefinition {
  return visualThemeCatalog.find(({ id }) => id === themeId)
    ?? visualThemeCatalog[0]!;
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function normalizeUnlockMetadata(
  value: unknown,
  unlockedThemeIds: readonly VisualThemeId[],
): VisualThemeState["unlockMetadata"] {
  if (!value || typeof value !== "object") return {};

  return Object.fromEntries(
    unlockedThemeIds.flatMap((themeId) => {
      const candidate = (value as Record<string, unknown>)[themeId];
      if (!candidate || typeof candidate !== "object") return [];
      const unlockedAt = (candidate as { unlockedAt?: unknown }).unlockedAt;
      const revealSeenAt = (candidate as { revealSeenAt?: unknown }).revealSeenAt;
      if (!isTimestamp(unlockedAt)) return [];
      return [[
        themeId,
        {
          unlockedAt,
          ...(isTimestamp(revealSeenAt) ? { revealSeenAt } : {}),
        },
      ]];
    }),
  );
}

export function emptyVisualThemeState(): VisualThemeState {
  return {
    activeThemeId: DEFAULT_VISUAL_THEME_ID,
    unlockedThemeIds: [DEFAULT_VISUAL_THEME_ID],
    unlockMetadata: {},
  };
}

export function parseVisualThemeState(value: unknown): VisualThemeState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const parsed = value as Partial<VisualThemeState>;
  const requestedUnlocked = Array.isArray(parsed.unlockedThemeIds)
    ? parsed.unlockedThemeIds.filter(isVisualThemeId)
    : [];
  const unlockedThemeIds = visualThemeIds.filter((themeId) => (
    themeId === DEFAULT_VISUAL_THEME_ID || requestedUnlocked.includes(themeId)
  ));
  const activeThemeId = isVisualThemeId(parsed.activeThemeId)
    && unlockedThemeIds.includes(parsed.activeThemeId)
    ? parsed.activeThemeId
    : DEFAULT_VISUAL_THEME_ID;

  return {
    activeThemeId,
    unlockedThemeIds,
    unlockMetadata: normalizeUnlockMetadata(
      parsed.unlockMetadata,
      unlockedThemeIds,
    ),
  };
}

export type VisualThemeStatePersistence = (
  state: VisualThemeState,
) => Promise<void>;

interface VisualThemeStateRuntime {
  state: VisualThemeState;
  persist: VisualThemeStatePersistence;
}

interface VisualThemeTrial {
  previousThemeId: VisualThemeId;
  trialThemeId: VisualThemeId;
}

let visualThemeStateRuntime: VisualThemeStateRuntime | undefined;
let visualThemePersistenceQueue: Promise<void> = Promise.resolve();
let latestVisualThemeFallback: string | undefined;
let visualThemeTrial: VisualThemeTrial | undefined;

function cloneVisualThemeState(state: VisualThemeState): VisualThemeState {
  return {
    activeThemeId: state.activeThemeId,
    unlockedThemeIds: [...state.unlockedThemeIds],
    unlockMetadata: Object.fromEntries(
      Object.entries(state.unlockMetadata).map(([id, metadata]) => [
        id,
        metadata ? { ...metadata } : metadata,
      ]),
    ),
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
    // Dexie reste prioritaire lorsque ce secours temporaire est indisponible.
  }
}

function writeBootTheme(themeId: VisualThemeId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(VISUAL_THEME_BOOT_STORAGE_KEY, themeId);
  } catch {
    // Le theme sera applique apres l'hydratation lorsque le stockage est bloque.
  }
}

function removeVisualThemeFallback(serialized: string): void {
  if (typeof window === "undefined") return;
  try {
    if (
      latestVisualThemeFallback === serialized
      && window.localStorage.getItem(VISUAL_THEME_STORAGE_KEY) === serialized
    ) {
      window.localStorage.removeItem(VISUAL_THEME_STORAGE_KEY);
    }
  } catch {
    // La valeur sera revaluee au prochain demarrage.
  }
}

export function hydrateVisualThemeStateRuntime(
  state: VisualThemeState,
  persist: VisualThemeStatePersistence,
): void {
  const normalized = parseVisualThemeState(state) ?? emptyVisualThemeState();
  visualThemeStateRuntime = {
    state: cloneVisualThemeState(normalized),
    persist,
  };
  visualThemePersistenceQueue = Promise.resolve();
  latestVisualThemeFallback = undefined;
  visualThemeTrial = undefined;
  writeBootTheme(normalized.activeThemeId);
}

export function resetVisualThemeStateRuntimeForTests(): void {
  visualThemeStateRuntime = undefined;
  visualThemePersistenceQueue = Promise.resolve();
  latestVisualThemeFallback = undefined;
  visualThemeTrial = undefined;
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
  writeBootTheme(snapshot.activeThemeId);

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
      console.error("La persistance Dexie des themes a echoue.", error);
    });
}

export function applyVisualTheme(themeId: unknown): VisualThemeId {
  const normalized = isVisualThemeId(themeId)
    ? themeId
    : DEFAULT_VISUAL_THEME_ID;
  if (typeof document !== "undefined") {
    document.documentElement.dataset.sportTheme = normalized;
    delete document.documentElement.dataset.sportThemeStyle;
  }
  return normalized;
}

export function applyStoredVisualTheme(): VisualThemeId {
  return applyVisualTheme(readVisualThemeState().activeThemeId);
}

export function previewVisualTheme(themeId: VisualThemeId): void {
  applyVisualTheme(themeId);
}

export function clearVisualThemePreview(): VisualThemeId {
  return applyStoredVisualTheme();
}

export function unlockVisualThemes(
  themeIds: readonly VisualThemeId[],
  unlockedAt: string = new Date().toISOString(),
): VisualThemeState {
  const currentState = readVisualThemeState();
  const validIds = themeIds.filter(isVisualThemeId);
  const unlockedThemeIds = visualThemeIds.filter((themeId) => (
    themeId === DEFAULT_VISUAL_THEME_ID
    || currentState.unlockedThemeIds.includes(themeId)
    || validIds.includes(themeId)
  ));
  const unlockMetadata = { ...currentState.unlockMetadata };
  for (const themeId of validIds) {
    if (themeId !== DEFAULT_VISUAL_THEME_ID && !unlockMetadata[themeId]) {
      unlockMetadata[themeId] = { unlockedAt };
    }
  }
  const nextState = { ...currentState, unlockedThemeIds, unlockMetadata };
  writeVisualThemeState(nextState);
  return nextState;
}

export function markVisualThemeRevealSeen(
  themeId: VisualThemeId,
  revealSeenAt: string = new Date().toISOString(),
): VisualThemeState {
  const currentState = readVisualThemeState();
  const metadata = currentState.unlockMetadata[themeId];
  if (!metadata || metadata.revealSeenAt) return currentState;
  const nextState: VisualThemeState = {
    ...currentState,
    unlockMetadata: {
      ...currentState.unlockMetadata,
      [themeId]: { ...metadata, revealSeenAt },
    },
  };
  writeVisualThemeState(nextState);
  return nextState;
}

export function activateVisualTheme(themeId: VisualThemeId): boolean {
  const currentState = readVisualThemeState();
  if (!currentState.unlockedThemeIds.includes(themeId)) return false;
  visualThemeTrial = undefined;
  const nextState = { ...currentState, activeThemeId: themeId };
  writeVisualThemeState(nextState);
  applyVisualTheme(themeId);
  return true;
}

export function beginVisualThemeTrial(themeId: VisualThemeId): boolean {
  const currentState = readVisualThemeState();
  if (!currentState.unlockedThemeIds.includes(themeId)) return false;
  visualThemeTrial = {
    previousThemeId: currentState.activeThemeId,
    trialThemeId: themeId,
  };
  applyVisualTheme(themeId);
  return true;
}

export function readVisualThemeTrial(): Readonly<VisualThemeTrial> | undefined {
  return visualThemeTrial ? { ...visualThemeTrial } : undefined;
}

export function confirmVisualThemeTrial(): boolean {
  const themeId = visualThemeTrial?.trialThemeId;
  if (!themeId) return false;
  return activateVisualTheme(themeId);
}

export function cancelVisualThemeTrial(): VisualThemeId {
  const themeId = visualThemeTrial?.previousThemeId
    ?? readVisualThemeState().activeThemeId;
  visualThemeTrial = undefined;
  return applyVisualTheme(themeId);
}
