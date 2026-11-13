import { afterEach, describe, expect, it, vi } from "vitest";

import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

import { api } from "@/api/client";
import type { SearchResponse } from "@/api/types";

import { useNutritionistSearch } from "./useNutritionistSearch";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("nutritionist search requests", () => {
  it("aborts the old request and ignores its late response", async () => {
    const first = deferred<SearchResponse>();
    const second = deferred<SearchResponse>();
    const search = vi
      .spyOn(api, "search")
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const { result, unmount } = renderHook(useNutritionistSearch);
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    const firstSignal = search.mock.calls[0][3];

    act(() => result.current.submit(" Mary ", " Braga "));
    await waitFor(() => expect(search).toHaveBeenCalledTimes(2));
    expect(firstSignal?.aborted).toBe(true);
    expect(result.current.params).toEqual({
      query: "Mary",
      location: "Braga",
      page: 1,
    });

    const latest: SearchResponse = {
      items: [],
      meta: { page: 1, total_pages: 1, effective_location: "Braga" },
    };
    await act(async () => second.resolve(latest));
    expect(result.current.result).toBe(latest);
    expect(result.current.status).toBe("success");

    await act(async () =>
      first.resolve({
        items: [],
        meta: { page: 1, total_pages: 1, effective_location: "Porto" },
      }),
    );
    expect(result.current.result).toBe(latest);
    unmount();
    expect(search.mock.calls[1][3]?.aborted).toBe(true);
  });
});
