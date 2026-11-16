import { useCallback, useEffect, useState } from "react";

import { api } from "@/api/client";

interface DatesState {
  key: string;
  status: "success" | "error";
  dates: string[];
}

export function useAvailableDates(
  nutritionistId: number,
  serviceId: number,
  month: string,
) {
  const [state, setState] = useState<DatesState | null>(null);
  const [version, setVersion] = useState(0);
  const key = `${nutritionistId}:${serviceId}:${month}:${version}`;

  useEffect(() => {
    const controller = new AbortController();
    api
      .listAvailableDates(nutritionistId, serviceId, month, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted)
          setState({ key, status: "success", dates: response.dates });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ key, status: "error", dates: [] });
      });
    return () => controller.abort();
  }, [nutritionistId, serviceId, month, key]);

  const retry = useCallback(
    () => setVersion((currentVersion) => currentVersion + 1),
    [],
  );

  const current = state?.key === key ? state : null;
  return {
    key,
    status: current?.status ?? "loading",
    dates: current?.dates ?? [],
    retry,
  };
}
