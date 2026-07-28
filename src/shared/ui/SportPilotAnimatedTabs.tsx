import {
  useRef,
  type KeyboardEvent,
} from "react";

import { cn } from "@/shared/utils/cn";

export interface SportPilotTab {
  id: string;
  label: string;
  disabled?: boolean;
}

interface SportPilotAnimatedTabsProps {
  label: string;
  tabs: readonly SportPilotTab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function SportPilotAnimatedTabs({
  label,
  tabs,
  activeTab,
  onChange,
  className,
}: SportPilotAnimatedTabsProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = tabs
      .map((tab, tabIndex) => ({ tab, tabIndex }))
      .filter(({ tab }) => !tab.disabled)
      .map(({ tabIndex }) => tabIndex);
    if (enabled.length === 0) return;

    const current = Math.max(0, enabled.indexOf(index));
    const nextIndex = event.key === "Home"
      ? enabled[0]
      : event.key === "End"
        ? enabled.at(-1)
        : enabled[
            (current + (event.key === "ArrowRight" ? 1 : -1) + enabled.length)
              % enabled.length
          ];
    if (nextIndex === undefined) return;
    const next = tabs[nextIndex];
    if (!next) return;
    onChange(next.id);
    const nextNode = refs.current[nextIndex];
    nextNode?.focus();
    if (typeof nextNode?.scrollIntoView === "function") {
      nextNode.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("sp-animated-tabs", className)}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            ref={(node) => { refs.current[index] = node; }}
            id={`${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`${tab.id}-panel`}
            tabIndex={selected ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => move(event, index)}
            className="sp-animated-tabs__tab"
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
