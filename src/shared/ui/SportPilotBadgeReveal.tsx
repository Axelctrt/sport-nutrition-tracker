import { Trophy } from "lucide-react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import "@/shared/ui/uxMotionPolish.css";
import { useModalReveal } from "@/shared/ui/useModalReveal";

interface SportPilotBadgeRevealProps {
  name: string;
  description: string;
  onContinue: () => void;
  onViewRewards: () => void;
}

const sparkPositions = [
  { left: "8%", top: "34%", x: "-26px", y: "-34px", delay: "20ms" },
  { left: "15%", top: "22%", x: "-20px", y: "-42px", delay: "70ms" },
  { left: "24%", top: "14%", x: "-12px", y: "-46px", delay: "120ms" },
  { left: "36%", top: "10%", x: "-7px", y: "-52px", delay: "45ms" },
  { left: "48%", top: "8%", x: "0px", y: "-56px", delay: "100ms" },
  { left: "60%", top: "10%", x: "7px", y: "-52px", delay: "35ms" },
  { left: "72%", top: "14%", x: "12px", y: "-46px", delay: "140ms" },
  { left: "82%", top: "22%", x: "20px", y: "-42px", delay: "80ms" },
  { left: "91%", top: "34%", x: "26px", y: "-34px", delay: "30ms" },
  { left: "20%", top: "45%", x: "-22px", y: "-28px", delay: "160ms" },
  { left: "33%", top: "38%", x: "-10px", y: "-36px", delay: "190ms" },
  { left: "67%", top: "38%", x: "10px", y: "-36px", delay: "175ms" },
  { left: "80%", top: "45%", x: "22px", y: "-28px", delay: "150ms" },
  { left: "42%", top: "24%", x: "-4px", y: "-44px", delay: "220ms" },
  { left: "58%", top: "24%", x: "4px", y: "-44px", delay: "205ms" },
  { left: "50%", top: "30%", x: "0px", y: "-40px", delay: "250ms" },
] as const;

export function SportPilotBadgeReveal({
  name,
  description,
  onContinue,
  onViewRewards,
}: SportPilotBadgeRevealProps) {
  const { backdropRef, dialogRef, initialFocusRef } = useModalReveal(onContinue);

  return createPortal(
    <div ref={backdropRef} className="sp-badge-reveal-backdrop" role="presentation">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sportpilot-badge-reveal-title"
        aria-describedby="sportpilot-badge-reveal-description"
        tabIndex={-1}
        className="sp-badge-reveal"
      >
        <div className="sp-badge-reveal__halo" aria-hidden="true" />
        {sparkPositions.map((spark, index) => (
          <span
            key={index}
            aria-hidden="true"
            className="sp-badge-reveal__spark"
            style={{
              left: spark.left,
              top: spark.top,
              "--spark-x": spark.x,
              "--spark-y": spark.y,
              "--delay": spark.delay,
            } as CSSProperties}
          />
        ))}
        <div className="relative z-10">
          <span className="sp-badge-reveal__icon">
            <Trophy aria-hidden="true" className="size-6" />
          </span>
          <p className="sp-badge-reveal__eyebrow mt-5 text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--sp-success)]">
            Badge débloqué
          </p>
          <h2 id="sportpilot-badge-reveal-title" className="sp-badge-reveal__title mt-2 text-2xl font-extrabold text-[var(--sp-text-primary)]">
            {name}
          </h2>
          <p id="sportpilot-badge-reveal-description" className="sp-badge-reveal__description mt-2 text-sm leading-6 text-[var(--sp-text-secondary)]">
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
              ref={initialFocusRef}
              type="button"
              className="sp-button sp-button--secondary inline-flex min-h-12 items-center justify-center rounded-[var(--sp-radius-control)] px-4 text-sm font-bold"
              onClick={onContinue}
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
