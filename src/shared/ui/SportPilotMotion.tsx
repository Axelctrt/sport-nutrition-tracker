import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { sportPilotMotionTokens } from "@/shared/motion/motionTokens";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";
import { cn } from "@/shared/utils/cn";

interface MotionCardProps extends HTMLAttributes<HTMLDivElement> {
  priority?: boolean;
}

export function SportPilotMotionCard({
  priority = false,
  className,
  ...props
}: MotionCardProps) {
  return (
    <div
      className={cn(
        "sp-motion-card",
        priority && "sp-motion-card--priority",
        className,
      )}
      {...props}
    />
  );
}

interface ActiveBorderProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  rarity?: "standard" | "rare" | "epic" | "legendary";
}

export function SportPilotActiveBorder({
  active = false,
  rarity = "standard",
  className,
  children,
  ...props
}: ActiveBorderProps) {
  return (
    <div
      className={cn(
        "sp-active-border",
        active && "sp-active-border--active",
        rarity !== "standard" && `sp-active-border--${rarity}`,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface AnimatedNumberProps {
  value: number;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
  label: string;
}

export function SportPilotAnimatedNumber({
  value,
  format = (current) => Math.round(current).toLocaleString("fr-FR"),
  duration = sportPilotMotionTokens.durationEmphasis,
  className,
  label,
}: AnimatedNumberProps) {
  const reducedMotion = useReducedMotion();
  const previousValue = useRef(value);
  const [displayedValue, setDisplayedValue] = useState(value);

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = value;
    if (reducedMotion || from === value) {
      setDisplayedValue(value);
      return;
    }

    let animationFrame = 0;
    const startedAt = performance.now();
    const update = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setDisplayedValue(from + (value - from) * eased);
      if (progress < 1) animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animationFrame);
  }, [duration, reducedMotion, value]);

  return (
    <span
      className={cn("tabular-nums", className)}
      aria-label={`${label} : ${format(value)}`}
    >
      {format(displayedValue)}
    </span>
  );
}

interface ProgressTransitionProps {
  value: number;
  max?: number;
  label: string;
  className?: string;
  indicatorClassName?: string;
  showValue?: boolean;
}

export function SportPilotProgressTransition({
  value,
  max = 100,
  label,
  className,
  indicatorClassName,
  showValue = true,
}: ProgressTransitionProps) {
  const safeMax = Math.max(1, max);
  const safeValue = Math.min(safeMax, Math.max(0, value));
  const percentage = (safeValue / safeMax) * 100;
  const style = { "--sp-progress-value": `${percentage}%` } as CSSProperties;

  return (
    <div className={className}>
      {showValue ? (
        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-[var(--sp-text-secondary)]">{label}</span>
          <span className="tabular-nums text-[var(--sp-text-muted)]">
            {Math.round(percentage)} %
          </span>
        </div>
      ) : null}
      <div
        className="sp-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={safeValue}
      >
        <span
          className={cn("sp-progress-indicator", indicatorClassName)}
          style={style}
        />
      </div>
    </div>
  );
}

interface SuccessEffectProps {
  active: boolean;
  children: ReactNode;
  className?: string;
}

export function SportPilotSuccessEffect({
  active,
  children,
  className,
}: SuccessEffectProps) {
  return (
    <div
      className={cn("sp-success-effect", active && "sp-success-effect--active", className)}
      aria-live="polite"
    >
      {children}
    </div>
  );
}
