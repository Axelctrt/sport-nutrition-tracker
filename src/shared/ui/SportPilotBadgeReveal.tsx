import { Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import "@/shared/ui/uxMotionPolish.css";

interface SportPilotBadgeRevealProps {
  name: string;
  description: string;
  onContinue: () => void;
  onViewRewards: () => void;
}

const sparkPositions = [
  { left: "14%", top: "28%", x: "-18px", delay: "30ms" },
  { left: "28%", top: "20%", x: "-8px", delay: "90ms" },
  { left: "70%", top: "18%", x: "10px", delay: "55ms" },
  { left: "84%", top: "30%", x: "20px", delay: "120ms" },
] as const;

export function SportPilotBadgeReveal({
  name,
  description,
  onContinue,
  onViewRewards,
}: SportPilotBadgeRevealProps) {
  return createPortal(
    <div className="sp-badge-reveal-backdrop" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sportpilot-badge-reveal-title"
        aria-describedby="sportpilot-badge-reveal-description"
        className="sp-badge-reveal"
      >
        {sparkPositions.map((spark, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="sp-badge-reveal__spark"
            style={{
              left: spark.left,
              top: spark.top,
              "--spark-x": spark.x,
              "--delay": spark.delay,
            } as CSSProperties}
          />
        ))}
        <div className="relative z-10">
          <span className="sp-badge-reveal__icon">
            <Trophy aria-hidden="true" className="size-6" />
          </span>
          <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--sp-success)]">
            Badge débloqué
          </p>
          <h2 id="sportpilot-badge-reveal-title" className="mt-2 text-2xl font-extrabold text-[var(--sp-text-primary)]">
            {name}
          </h2>
          <p id="sportpilot-badge-reveal-description" className="mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
            {description}
          </p>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="sp-button inline-flex min-h-12 items-center justify-center rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
              onClick={onViewRewards}
            >
              Voir mes récompenses
            </button>
            <button
              type="button"
              className="sp-button sp-button--secondary inline-flex min-h-12 items-center justify-center rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
              onClick={onContinue}
              autoFocus
            >
              Continuer
            </button>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
