import { useCallback, useEffect, useState } from "react";

import {
  loadPerformanceAnalytics,
  type PerformanceAnalyticsSnapshot,
} from "@/application/analytics/performanceAnalyticsService";
import type { LocalDate } from "@/domain/models/common";
import type { UserProfile } from "@/domain/models/profile";

export function usePerformanceAnalytics(
  referenceDate: LocalDate,
  profile: UserProfile | undefined,
) {
  const [data, setData] = useState<PerformanceAnalyticsSnapshot>();
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>();

  const refresh = useCallback(async () => {
    if (!profile) return;
    setStatus("loading");
    setErrorMessage(undefined);
    try {
      setData(await loadPerformanceAnalytics(referenceDate, profile));
      setStatus("ready");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Impossible de charger les analyses.",
      );
      setStatus("error");
    }
  }, [profile, referenceDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, status, errorMessage, refresh };
}
