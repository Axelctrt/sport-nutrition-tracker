import {
  Check,
  Circle,
  LoaderCircle,
} from "lucide-react";

import { useMotionVisibility } from "@/shared/motion/useMotionVisibility";
import { cn } from "@/shared/utils/cn";

export interface SportPilotLoaderStep {
  id: string;
  label: string;
}

interface SportPilotMultiStepLoaderProps {
  steps: readonly SportPilotLoaderStep[];
  activeStep: number;
  label?: string;
  className?: string;
}

export function SportPilotMultiStepLoader({
  steps,
  activeStep,
  label = "Progression du traitement",
  className,
}: SportPilotMultiStepLoaderProps) {
  const { ref, visible } = useMotionVisibility<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("sp-multi-step-loader", className)}
      aria-label={label}
      data-motion-active={visible}
    >
      <ol className="space-y-3">
        {steps.map((step, index) => {
          const status = index < activeStep
            ? "complete"
            : index === activeStep
              ? "active"
              : "pending";
          return (
            <li
              key={step.id}
              className="sp-multi-step-loader__step"
              data-status={status}
              aria-current={status === "active" ? "step" : undefined}
            >
              <span className="sp-multi-step-loader__icon" aria-hidden="true">
                {status === "complete" ? (
                  <Check className="size-4" />
                ) : status === "active" ? (
                  <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Circle className="size-3" />
                )}
              </span>
              <span>{step.label}</span>
              <span className="sr-only">
                {status === "complete"
                  ? "terminee"
                  : status === "active"
                    ? "en cours"
                    : "a venir"}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

