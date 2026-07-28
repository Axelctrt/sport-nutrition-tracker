import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  isStableVersionAtLeast,
  stableVersionExpectation,
} from "./shared/stableVersion.mjs";

const root = process.cwd();
const failures = [];

function fail(message) {
  failures.push(message);
}

function read(relativePath) {
  return readFileSync(join(root, relativePath), "utf8");
}

function requireMarkers(source, markers, label) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      fail(`${label} ne contient pas le marqueur attendu : ${marker}.`);
    }
  }
}

const packageJson = JSON.parse(read("package.json"));
const achievements = read("src/domain/rewards/achievements.ts");
const achievementService = read(
  "src/application/rewards/achievementService.ts",
);
const visualThemes = read("src/domain/rewards/visualThemes.ts");
const themeService = read(
  "src/application/rewards/themeAchievementService.ts",
);
const themesPanel = read(
  "src/features/settings/components/RewardThemesPanel.tsx",
);
const rewardsPage = read(
  "src/features/rewards/pages/RewardsCenterPage.tsx",
);
const rewardNotifier = read(
  "src/app/rewards/RewardUnlockNotifier.tsx",
);
const unlockReveal = read("src/shared/ui/SportPilotUnlockReveal.tsx");
const css = read("src/styles/unlockableThemes.css");
const sharedCss = read("src/styles/index.css");
const allThemeCss = `${css}\n${sharedCss}`;
const themeBoot = read("public/theme-boot.js");
const indexHtml = read("index.html");
const productionAudit = read("scripts/audit-rc.mjs");
const automaticSyncReleaseAudit = read(
  "scripts/audit-automatic-sync-release.mjs",
);
const goalCard = read("src/features/goals/components/GoalCard.tsx");
const goalValueFormatter = read(
  "src/features/goals/utils/formatGoalValue.ts",
);

if (!isStableVersionAtLeast(packageJson.version, 34)) {
  fail(
    `la version doit etre ${stableVersionExpectation(34)}, recue ${String(packageJson.version)}.`,
  );
}
if (!packageJson.scripts?.["audit:reward-theme-catalog"]) {
  fail("le script audit:reward-theme-catalog est absent de package.json.");
}
if (
  !String(packageJson.scripts?.check ?? "").includes(
    "audit:reward-theme-catalog",
  )
) {
  fail("npm run check ne lance pas audit:reward-theme-catalog.");
}

const achievementIds = [...achievements.matchAll(/id: "([^"]+)"/g)].map(
  (match) => match[1],
);
if (achievementIds.length !== 50) {
  fail(
    `le catalogue doit contenir exactement 50 badges, ${achievementIds.length} detecte(s).`,
  );
}
if (new Set(achievementIds).size !== achievementIds.length) {
  fail("le catalogue de badges contient des identifiants dupliques.");
}
for (const requiredId of [
  "first-session",
  "ten-sessions",
  "strength-five",
  "strength-twenty",
  "active-seven",
  "versatile-three",
  "bench-100",
  "deadlift-150",
  "nutrition-seven",
]) {
  if (!achievementIds.includes(requiredId)) {
    fail(`le badge attendu ${requiredId} est absent du catalogue.`);
  }
}
for (const category of [
  "running",
  "swimming",
  "strength",
  "steps",
  "consistency",
  "versatility",
  "nutrition",
]) {
  if (!achievements.includes(`category: "${category}"`)) {
    fail(`la categorie de badge ${category} est absente.`);
  }
}
for (const metric of [
  "benchPressMaxKg",
  "squatMaxKg",
  "deadliftMaxKg",
  "runningFiveKmUnder25",
  "strengthVolumeKg",
]) {
  if (!achievementService.includes(metric)) {
    fail(`la metrique de badge ${metric} n'est pas calculee.`);
  }
}

const expectedThemeIds = [
  "core",
  "neon-pulse",
  "emerald-focus",
  "aurora",
  "zenith-gold",
];
const themeIds = [...visualThemes.matchAll(/id: "([^"]+)"/g)].map(
  (match) => match[1],
);
if (
  themeIds.length !== expectedThemeIds.length
  || expectedThemeIds.some((themeId) => !themeIds.includes(themeId))
) {
  fail(
    `le catalogue Performance Glass doit contenir uniquement ${expectedThemeIds.join(", ")}.`,
  );
}
if (new Set(themeIds).size !== themeIds.length) {
  fail("le catalogue de themes contient des identifiants dupliques.");
}

for (const themeId of expectedThemeIds) {
  for (const selector of [
    `html[data-sport-theme="${themeId}"]`,
    `html.dark[data-sport-theme="${themeId}"]`,
    `[data-theme-preview="${themeId}"]`,
  ]) {
    if (!css.includes(selector)) {
      fail(`le theme ${themeId} ne couvre pas ${selector}.`);
    }
  }
}

for (const removedThemeId of [
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
]) {
  if (visualThemes.includes(`id: "${removedThemeId}"`)) {
    fail(`l'ancien theme ${removedThemeId} doit etre retire du catalogue.`);
  }
}

requireMarkers(
  visualThemes,
  [
    "SportPilotThemeDefinition",
    "palette: {",
    "light: ThemePalette",
    "dark: ThemePalette",
    "backgroundStyle:",
    "surfaceStyle:",
    "buttonStyle:",
    "chartStyle:",
    "motionProfile:",
    "rewardEffect:",
    'DEFAULT_VISUAL_THEME_ID: VisualThemeId = "core"',
    "unlockedAt: string",
    "revealSeenAt?: string",
    "beginVisualThemeTrial",
    "confirmVisualThemeTrial",
    "cancelVisualThemeTrial",
    "getVisualThemeDefinition",
  ],
  "le moteur de themes",
);
requireMarkers(
  visualThemes,
  [
    'rarity: "standard"',
    'rarity: "rare"',
    'rarity: "epic"',
    'rarity: "legendary"',
    'name: "balanced"',
    'name: "energetic"',
    'name: "focused"',
    'name: "smooth-premium"',
    'name: "prestige"',
    'rewardEffect: "pulse"',
    'rewardEffect: "neon-ring"',
    'rewardEffect: "focus-bloom"',
    'rewardEffect: "aurora-sparkles"',
    'rewardEffect: "golden-reveal"',
  ],
  "les identites Performance Glass",
);

requireMarkers(
  themeService,
  [
    "const NEON_ACTIVITY_TARGET = 20",
    "const NEON_REGULAR_WEEK_TARGET = 3",
    "const EMERALD_COMPLETE_DAY_TARGET = 12",
    "const EMERALD_NUTRITION_DAY_TARGET = 10",
    "const AURORA_BALANCED_WEEK_TARGET = 4",
    "const ZENITH_BALANCED_WEEK_TARGET = 8",
    "const ZENITH_ACTIVITY_TARGET = 50",
    "const ZENITH_COMPLETE_DAY_TARGET = 40",
    "confirmedRestDays",
    "balancedWeeksInTwelveWeeks",
    "persistedUnlocked",
    "newlyUnlockedThemes",
  ],
  "le moteur de deblocage",
);

requireMarkers(
  rewardsPage,
  ['label: "Thèmes"', 'label: "Badges"', "<RewardThemesPanel />"],
  "la page Recompenses",
);
requireMarkers(
  themesPanel,
  [
    "Theme actif",
    "Ma collection",
    "ThemeMiniInterface",
    "Voir ma progression",
    "Appliquer ce theme",
    "beginVisualThemeTrial",
    "confirmVisualThemeTrial",
    "cancelVisualThemeTrial",
  ],
  "la collection de themes",
);
requireMarkers(
  unlockReveal,
  [
    "Nouveau thème",
    "Essayer maintenant",
    "Conserver mon thème actuel",
    'role="dialog"',
    'aria-modal="true"',
    "useReducedMotion",
    "sp-unlock-reveal__preview",
  ],
  "la revelation de theme",
);
requireMarkers(
  rewardNotifier,
  [
    "rewardRevealContextIsSafe",
    "Nouveau thème débloqué",
    "markVisualThemeRevealSeen",
    "SportPilotThemeTrialBar",
    "cancelVisualThemeTrial",
  ],
  "le report et l'essai des themes",
);

requireMarkers(
  allThemeCss,
  [
    "SportPilot 0.34.0 - Performance Glass themes",
    "@media (hover: hover) and (pointer: fine)",
    "@media (hover: none), (pointer: coarse)",
    "@media (prefers-reduced-motion: reduce)",
    ".sport-theme-app",
    ".sp-unlock-reveal",
    ".sp-theme-trial-bar",
  ],
  "le rendu Performance Glass",
);

requireMarkers(
  themeBoot,
  [
    "sport-pilot.active-theme",
    "dataset.sportTheme",
    "core",
    "neon-pulse",
    "emerald-focus",
    "aurora",
    "zenith-gold",
  ],
  "le demarrage sans flash",
);
if (!indexHtml.includes('<script src="/theme-boot.js"></script>')) {
  fail("index.html doit charger le bootstrap de theme externe compatible CSP.");
}

if (!productionAudit.includes("totalJavaScriptBytes: 3328 * 1024")) {
  fail("le budget JavaScript de production doit rester fixe a 3328 Kio.");
}
if (!productionAudit.includes("totalCssBytes: 176 * 1024")) {
  fail("le budget CSS de production doit rester fixe a 176 Kio.");
}
if (
  !automaticSyncReleaseAudit.includes(
    "budget JavaScript global validé de 3328 Kio",
  )
) {
  fail("l'audit F4 doit rester aligne avec le budget JavaScript valide.");
}

if (
  !goalCard.includes("formatGoalValue")
  || !goalValueFormatter.includes("unit === 'km' ? 1 : 2")
) {
  fail("les objectifs doivent arrondir les distances en kilometres a une decimale.");
}

if (failures.length > 0) {
  console.error("\nAudit recompenses et themes 0.34.0 echoue :");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    "Audit recompenses et themes 0.34.0 reussi : 50 badges, cinq themes Performance Glass, variantes claires/sombres, fallback Core, deblocages, collection, reveal differe et essai temporaire valides.",
  );
}
