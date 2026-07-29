import { SportPilotProgressTransition } from "@/shared/ui/SportPilotMotion";

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  className?: string;
  indicatorClassName?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  className,
  indicatorClassName = 'bg-brand-600',
}: ProgressBarProps) {
  return (
    <SportPilotProgressTransition
      value={value}
      max={max}
      label={label}
      indicatorClassName={indicatorClassName}
      {...(className ? { className } : {})}
    />
  );
}
