import {
  AlertCircle,
  Check,
  LoaderCircle,
} from "lucide-react";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/shared/utils/cn";

export type SportPilotButtonState =
  | "idle"
  | "pressed"
  | "loading"
  | "success"
  | "error";

export interface SportPilotStatefulButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  state?: SportPilotButtonState;
  idleLabel: ReactNode;
  loadingLabel?: ReactNode;
  successLabel?: ReactNode;
  errorLabel?: ReactNode;
  fullWidth?: boolean;
}

export const SportPilotStatefulButton = forwardRef<
  HTMLButtonElement,
  SportPilotStatefulButtonProps
>(function SportPilotStatefulButton(
  {
    state = "idle",
    idleLabel,
    loadingLabel = "Traitement...",
    successLabel = "Termine",
    errorLabel = "Reessayer",
    fullWidth = false,
    disabled,
    className,
    type = "button",
    ...props
  },
  ref,
) {
  const labels: Record<SportPilotButtonState, ReactNode> = {
    idle: idleLabel,
    pressed: idleLabel,
    loading: loadingLabel,
    success: successLabel,
    error: errorLabel,
  };
  const icon = state === "loading"
    ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
    : state === "success"
      ? <Check aria-hidden="true" className="size-4" />
      : state === "error"
        ? <AlertCircle aria-hidden="true" className="size-4" />
        : null;

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || state === "loading"}
      aria-busy={state === "loading" || undefined}
      data-state={state}
      className={cn(
        "sp-stateful-button",
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true" className="sp-stateful-button__sizer">
        {Object.values(labels).map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </span>
      <span className="sp-stateful-button__content" aria-live="polite">
        {icon}
        <span>{labels[state]}</span>
      </span>
    </button>
  );
});

