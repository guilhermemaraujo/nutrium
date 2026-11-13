import { useEffect, useState } from "react";

import { api } from "@/api/client";
import type { SearchResponse } from "@/api/types";

export interface SearchParams {
  query: string;
  location: string;
  page: number;
}

export type SearchStatus = "loading" | "success" | "error";

export function useNutritionistSearch() {
  const [params, setParams] = useState<SearchParams>({
    query: "",
    location: "",
    page: 1,
  });
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [status, setStatus] = useState<SearchStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();
    api
      .search(params.query, params.location, params.page, controller.signal)
      .then((response) => {
        if (controller.signal.aborted) return;
        setResult(response);
        setStatus("success");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setResult(null);
        setStatus("error");
      });
    return () => controller.abort();
  }, [params]);

  function submit(query: string, location: string) {
    setStatus("loading");
    setParams({ query: query.trim(), location: location.trim(), page: 1 });
  }

  function changePage(page: number) {
    setStatus("loading");
    setParams((current) => ({ ...current, page }));
  }

  function retry() {
    setStatus("loading");
    setParams((current) => ({ ...current }));
  }

  return { params, result, status, submit, changePage, retry };
}
