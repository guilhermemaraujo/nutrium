import { afterEach, describe, expect, it, vi } from "vitest";

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import { api, createMockApi } from "@/api/client";
import type { AppointmentRequest } from "@/api/types";

import { usePendingRequests } from "./usePendingRequests";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("pending request state", () => {
  it("settles both list states when no nutritionist is available", async () => {
    vi.spyOn(api, "listNutritionists").mockResolvedValue([]);
    const { result } = renderHook(usePendingRequests);

    await waitFor(() =>
      expect(result.current.nutritionistsStatus).toBe("success"),
    );
    expect(result.current.requestsStatus).toBe("success");
    expect(result.current.selectedId).toBeNull();
    expect(result.current.requests).toEqual([]);
  });

  it("does not show an old decision result after the selected professional changes", async () => {
    const mock = createMockApi(0);
    vi.spyOn(api, "listNutritionists").mockImplementation(
      mock.listNutritionists,
    );
    vi.spyOn(api, "listAppointmentRequests").mockImplementation(
      mock.listAppointmentRequests,
    );
    let resolveDecision!: (result: AppointmentRequest) => void;
    vi.spyOn(api, "decideAppointmentRequest").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveDecision = resolve;
        }),
    );
    const { result } = renderHook(usePendingRequests);
    await waitFor(() => expect(result.current.requestsStatus).toBe("success"));
    const request = result.current.requests[0];

    let decision!: Promise<void>;
    act(() => {
      decision = result.current.decide(request, "accept");
      result.current.selectNutritionist(2);
    });
    await waitFor(() => expect(result.current.selectedId).toBe(2));
    await waitFor(() =>
      expect(result.current.requests[0]?.guest.name).toBe("Casey Lee"),
    );
    await act(async () => {
      resolveDecision(
        await mock.decideAppointmentRequest(1, request.id, {
          decision: "accept",
        }),
      );
      await decision;
    });
    expect(result.current.selectedId).toBe(2);
    expect(result.current.feedback).toBeNull();
    expect(result.current.decisionError).toBeNull();
    expect(result.current.requests[0]?.guest.name).toBe("Casey Lee");
  });
});
