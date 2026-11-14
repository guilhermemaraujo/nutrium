import { useEffect, useRef, useState } from "react";

import { api } from "@/api/client";
import type {
  AppointmentRequest,
  DecideAppointmentRequest,
  NutritionistOption,
} from "@/api/types";

type LoadStatus = "loading" | "success" | "error";

export function usePendingRequests() {
  const [nutritionists, setNutritionists] = useState<NutritionistOption[]>([]);
  const [nutritionistsStatus, setNutritionistsStatus] =
    useState<LoadStatus>("loading");
  const [nutritionistsVersion, setNutritionistsVersion] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [requestsStatus, setRequestsStatus] = useState<LoadStatus>("loading");
  const [requestsVersion, setRequestsVersion] = useState(0);
  const [decidingId, setDecidingId] = useState<AppointmentRequest["id"] | null>(
    null,
  );
  const [decisionError, setDecisionError] = useState<{
    id: AppointmentRequest["id"];
    message: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inFlight = useRef(false);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .listNutritionists(controller.signal)
      .then((people) => {
        if (controller.signal.aborted) return;
        const currentId = selectedIdRef.current;
        const nextId =
          currentId !== null && people.some((person) => person.id === currentId)
            ? currentId
            : (people[0]?.id ?? null);
        setNutritionists(people);
        if (nextId !== currentId || nextId === null) {
          selectedIdRef.current = nextId;
          setRequests([]);
          setRequestsStatus(nextId === null ? "success" : "loading");
          setDecisionError(null);
          setFeedback(null);
        }
        setSelectedId(nextId);
        setNutritionistsStatus("success");
      })
      .catch(() => {
        if (!controller.signal.aborted) setNutritionistsStatus("error");
      });
    return () => controller.abort();
  }, [nutritionistsVersion]);

  useEffect(() => {
    if (selectedId === null) return;
    const controller = new AbortController();
    api
      .listAppointmentRequests(selectedId, controller.signal)
      .then((result) => {
        if (controller.signal.aborted || selectedIdRef.current !== selectedId)
          return;
        setRequests(result.items);
        setRequestsStatus("success");
      })
      .catch(() => {
        if (!controller.signal.aborted && selectedIdRef.current === selectedId)
          setRequestsStatus("error");
      });
    return () => controller.abort();
  }, [selectedId, requestsVersion]);

  function selectNutritionist(id: number) {
    if (id === selectedId) return;
    selectedIdRef.current = id;
    setSelectedId(id);
    setRequests([]);
    setRequestsStatus("loading");
    setDecisionError(null);
    setFeedback(null);
  }

  function retryNutritionists() {
    setNutritionistsStatus("loading");
    setNutritionistsVersion((version) => version + 1);
  }

  function retryRequests() {
    setRequests([]);
    setRequestsStatus("loading");
    setRequestsVersion((version) => version + 1);
  }

  async function decide(
    request: AppointmentRequest,
    decision: DecideAppointmentRequest["decision"],
  ) {
    if (
      inFlight.current ||
      selectedId === null ||
      request.nutritionist_id !== selectedId
    )
      return;
    inFlight.current = true;
    setDecidingId(request.id);
    setDecisionError(null);
    setFeedback(null);
    try {
      await api.decideAppointmentRequest(selectedId, request.id, { decision });
      if (selectedIdRef.current !== selectedId) return;
      setFeedback(
        `${request.guest.name}'s request ${decision === "accept" ? "accepted" : "rejected"}.`,
      );
      retryRequests();
    } catch (error) {
      if (selectedIdRef.current !== selectedId) return;
      setDecisionError({
        id: request.id,
        message:
          error instanceof Error
            ? error.message
            : "Could not update request. Please try again.",
      });
    } finally {
      inFlight.current = false;
      setDecidingId(null);
    }
  }

  return {
    nutritionists,
    nutritionistsStatus,
    selectedId,
    requests,
    requestsStatus,
    decidingId,
    decisionError,
    feedback,
    selectNutritionist,
    retryNutritionists,
    retryRequests,
    decide,
  };
}
