import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type UIEvent,
} from "react";

import "@/shared/ui/uxMotionPolish.css";
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

interface IndicatorGeometry {
  left: number;
  width: number;
}

export function SportPilotAnimatedTabs({
  label,
  tabs,
  activeTab,
  onChange,
  className,
}: SportPilotAnimatedTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const [indicator, setIndicator] = useState<IndicatorGeometry>({ left: 0, width: 0 });
  const [canScrollStart, setCanScrollStart] = useState(false);
  const [canScrollEnd, setCanScrollEnd] = useState(false);

  const refreshGeometry = useCallback(() => {
    const container = containerRef.current;
    const activeIndex = tabs.findIndex(({ id }) => id === activeTab);
    const activeNode = refs.current[activeIndex];
    if (!container || !activeNode) return;

    setIndicator({
      left: activeNode.offsetLeft,
      width: activeNode.offsetWidth,
    });

    const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
    setCanScrollStart(container.scrollLeft > 2);
    setCanScrollEnd(container.scrollLeft < maxScroll - 2);
  }, [activeTab, tabs]);

  useLayoutEffect(() => {
    refreshGeometry();
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return undefined;

    const observer = new ResizeObserver(refreshGeometry);
    observer.observe(container);
    refs.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [refreshGeometry]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const node = event.currentTarget;
    const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
    setCanScrollStart(node.scrollLeft > 2);
    setCanScrollEnd(node.scrollLeft < maxScroll - 2);
  };

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
        behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  };

  const style = {
    "--sp-tab-indicator-left": `${indicator.left}px`,
    "--sp-tab-indicator-width": `${indicator.width}px`,
  } as CSSProperties;

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label={label}
      data-can-scroll-start={canScrollStart ? "true" : "false"}
      data-can-scroll-end={canScrollEnd ? "true" : "false"}
      onScroll={handleScroll}
      style={style}
      className={cn("sp-animated-tabs", className)}
    >
      <span className="sp-animated-tabs__indicator" aria-hidden="true" />
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
