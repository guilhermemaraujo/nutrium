import type { Nutritionist, SearchResponse } from "@/api/types";
import { createMockNutritionists } from "@/mocks/fixtures";

export interface SearchApi {
  search(
    query: string,
    location: string,
    page: number,
    signal?: AbortSignal,
  ): Promise<SearchResponse>;
}

function wait(signal?: AbortSignal, delayMs = 160): Promise<void> {
  if (signal?.aborted) return Promise.reject(signal.reason);
  if (delayMs === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", abort);
      resolve();
    }, delayMs);
    function abort() {
      clearTimeout(timeout);
      reject(signal?.reason);
    }
    signal?.addEventListener("abort", abort, { once: true });
  });
}
const normalize = (value: string) => value.trim().toLocaleLowerCase();
export function createMockApi(delayMs = 160): SearchApi {
  const nutritionists = createMockNutritionists();
  const locations = [
    ...new Set(
      nutritionists.flatMap((person) =>
        person.services.map((service) => service.city),
      ),
    ),
  ];

  return {
    async search(query, location, page, signal) {
      await wait(signal, delayMs);
      const effectiveLocation =
        locations.find((city) => normalize(city) === normalize(location)) ??
        "Braga";
      const term = normalize(query);
      const matches: Nutritionist[] = nutritionists
        .map((person) => ({
          ...person,
          services: person.services.filter(
            (service) =>
              normalize(service.city) === normalize(effectiveLocation),
          ),
        }))
        .filter(
          (person) =>
            person.services.length &&
            (!term ||
              normalize(person.name).includes(term) ||
              person.services.some((service) =>
                normalize(service.name).includes(term),
              )),
        );
      const pageSize = 4;
      return {
        items: matches.slice((page - 1) * pageSize, page * pageSize),
        meta: {
          page,
          total_pages: Math.max(1, Math.ceil(matches.length / pageSize)),
          effective_location: effectiveLocation,
        },
      };
    },
  };
}

export const httpApi: SearchApi = {
  async search(query, location, page, signal) {
    const params = new URLSearchParams({
      q: query,
      location,
      page: String(page),
    });
    const response = await fetch(`/api/nutritionists?${params}`, {
      headers: { Accept: "application/json" },
      signal,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? "Search failed.");
    return body as SearchResponse;
  },
};

export const api: SearchApi =
  import.meta.env.VITE_API_MODE === "http" ? httpApi : createMockApi();
