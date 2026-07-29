import { Check, Sparkles, Trophy } from "lucide-react";
import { createPortal } from "react-dom";
import {
  useEffect,
  useMemo,
  useRef,
  type CSSProperties,
} from "react";

import type { SportPilotThemeDefinition } from "@/domain/rewards/visualThemes";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

const revealCopy: Record<SportPilotThemeDefinition["id"], string> = {
  core: "La performance commence par une base solide.",
  "neon-pulse": "Ton rythme prend une nouvelle dimension.",
  "emerald-focus": "La régularité devient ta force.",
  aurora: "Toutes tes données convergent.",
  "zenith-gold": "La maîtrise se construit dans la durée.",
};

const rarityLabels: Record<SportPilotThemeDefinition["rarity"], string> = {
  standard: "Standard",
  rare: "Rare",
  epic: "Épique",
  legendary: "Légendaire",
};

interface SportPilotUnlockRevealProps {
  theme: SportPilotThemeDefinition;
  onTry: () => void;
  onKeepCurrent: () => void;
}

export function SportPilotUnlockReveal({
  theme,
  onTry,
  onKeepCurrent,
}: SportPilotUnlockRevealProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const tryButtonRef = useRef<HTMLButtonElement>(null);
  const reducedMotion = useReducedMotion();
  const palette = useMemo(() => (
    typeof document !== "undefined"
    && document.documentElement.classList.contains("dark")
      ? theme.palette.dark
      : theme.palette.light
  ), [theme]);
  const style = {
    "--reveal-background": palette.backgroundPrimary,
    "--reveal-surface": palette.surfacePrimary,
    "--reveal-surface-elevated": palette.surfaceElevated,
    "--reveal-border": palette.border,
    "--reveal-text": palette.textPrimary,
    "--reveal-text-secondary": palette.textSecondary,
    "--reveal-accent": palette.accentPrimary,
    "--reveal-accent-secondary": palette.accentSecondary,
    "--reveal-accent-intense": palette.accentIntense,
  } as CSSProperties;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = "hidden";
    tryButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onKeepCurrent();
        return;
      }
      if (event.key !== "Tab") return;
      const buttons = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>(
          "button:not([disabled])",
        ) ?? [],
      );
      const first = buttons[0];
      const last = buttons.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onKeepCurrent]);

  return createPortal(
    <div
      className="sp-unlock-reveal"
      data-theme-reveal={theme.id}
      data-reduced-motion={reducedMotion ? "true" : "false"}
      style={style}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sportpilot-unlock-title"
        aria-describedby="sportpilot-unlock-description"
        className="sp-unlock-reveal__dialog"
      >
        <div className="sp-unlock-reveal__effect" aria-hidden="true">
          {theme.rarity === "epic" || theme.rarity === "legendary"
            ? Array.from({ length: 8 }, (_, index) => (
                <span key={index} style={{ "--spark-index": index } as CSSProperties} />
              ))
            : null}
        </div>

        <div className="sp-unlock-reveal__heading">
          <span className="sp-unlock-reveal__icon" aria-hidden="true">
            {theme.rarity === "legendary"
              ? <Trophy className="size-7" />
              : <Sparkles className="size-7" />}
          </span>
          <p>Nouveau thème</p>
          <h2 id="sportpilot-unlock-title">{theme.name}</h2>
          <span className="sp-unlock-reveal__rarity">
            {rarityLabels[theme.rarity]}
          </span>
          <p id="sportpilot-unlock-description">
            {revealCopy[theme.id]}
          </p>
        </div>

        <div className="sp-unlock-reveal__preview" aria-label={`Aperçu du thème ${theme.name}`}>
          <div className="sp-unlock-reveal__preview-header">
            <span>SportPilot</span>
            <span>Progression</span>
          </div>
          <div className="sp-unlock-reveal__preview-grid">
            <div className="sp-unlock-reveal__preview-priority">
              <span>Prochaine action</span>
              <strong>Continuer sur ta lancée</strong>
              <button type="button" tabIndex={-1}>Démarrer</button>
            </div>
            <div className="sp-unlock-reveal__preview-metric">
              <span>Régularité</span>
              <strong>82 %</strong>
              <div><i /></div>
            </div>
          </div>
          <div className="sp-unlock-reveal__chart" aria-hidden="true">
            {[38, 58, 49, 72, 66, 84, 78].map((height, index) => (
              <i key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="sp-unlock-reveal__preview-nav" aria-hidden="true">
            <i /><i /><i /><i />
          </div>
        </div>

        <div className="sp-unlock-reveal__actions">
          <button
            ref={tryButtonRef}
            type="button"
            className="sp-button sp-button--primary min-h-12 w-full rounded-[var(--sp-radius-control)] px-5 text-sm font-bold"
            onClick={onTry}
          >
            <Check aria-hidden="true" className="size-5" />
            Essayer maintenant
          </button>
          <button
            type="button"
            className="sp-button sp-button--secondary min-h-12 w-full rounded-[var(--sp-radius-control)] px-5 text-sm font-bold"
            onClick={onKeepCurrent}
          >
            Conserver mon thème actuel
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

interface SportPilotThemeTrialBarProps {
  themeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SportPilotThemeTrialBar({
  themeName,
  onConfirm,
  onCancel,
}: SportPilotThemeTrialBarProps) {
  return createPortal(
    <aside
      className="sp-theme-trial-bar"
      aria-label={`Essai du thème ${themeName}`}
    >
      <div>
        <p>Thème en essai</p>
        <strong>{themeName}</strong>
      </div>
      <div>
        <button type="button" className="sp-button sp-button--primary" onClick={onConfirm}>
          Conserver ce thème
        </button>
        <button type="button" className="sp-button sp-button--secondary" onClick={onCancel}>
          Revenir à l’ancien thème
        </button>
      </div>
    </aside>,
    document.body,
  );
}
