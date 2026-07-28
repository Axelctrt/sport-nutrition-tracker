import { useEffect, useState } from "react";

import { useReducedMotion } from "@/shared/motion/useReducedMotion";

export function useSportPilotChartAnimation(): boolean {
  const reducedMotion = useReducedMotion();
  const [documentVisible, setDocumentVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const update = () => setDocumentVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  return !reducedMotion && documentVisible;
}
