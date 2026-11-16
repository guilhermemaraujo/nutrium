import { useCallback, useEffect, useState } from "react";

import { api } from "@/api/client";
import type { AvailableSlot } from "@/api/types";

type SlotState =
  | { key: string; status: "loading" | "error"; items: AvailableSlot[] }
  | { key: string; status: "success"; items: AvailableSlot[] };

export function useAvailableSlots(
  nutritionistId: number,
  serviceId: number,
  date: string,
  datesKey: string,
) {
  const [state, setState] = useState<SlotState | null>(null);
  const [version, setVersion] = useState(0);
  const key = `${nutritionistId}:${serviceId}:${date}:${datesKey}:${version}`;
  const retry = useCallback(
    () => setVersion((currentVersion) => currentVersion + 1),
    [],
  );

  useEffect(() => {
    if (!date) return;
    const controller = new AbortController();
    api
      .listAvailableSlots(nutritionistId, serviceId, date, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted)
          setState({ key, status: "success", items: response.items });
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setState({ key, status: "error", items: [] });
      });
    return () => controller.abort();
  }, [nutritionistId, serviceId, date, key]);

  const current = date && state?.key === key ? state : null;
  return {
    status: !date ? "idle" : (current?.status ?? "loading"),
    items: current?.items ?? [],
    retry,
  };
}
