import { useEffect, useRef, useState } from "react";

export function useMotionVisibility<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(
    () => typeof document === "undefined" || document.visibilityState !== "hidden",
  );

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let intersecting = true;
    const update = () => {
      setVisible(intersecting && document.visibilityState !== "hidden");
    };
    const observer = typeof IntersectionObserver === "undefined"
      ? undefined
      : new IntersectionObserver(([entry]) => {
          intersecting = entry?.isIntersecting ?? true;
          update();
        }, { rootMargin: "80px" });

    observer?.observe(node);
    document.addEventListener("visibilitychange", update);
    update();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return { ref, visible };
}

