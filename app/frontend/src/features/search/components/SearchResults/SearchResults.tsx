import type { SearchResponse } from "@/api/types";
import type {
  SearchParams,
  SearchStatus,
} from "@/features/search/hooks/useNutritionistSearch";

import { NutritionistCard } from "./NutritionistCard";
import { SearchPagination } from "./SearchPagination";

interface SearchResultsProps {
  params: SearchParams;
  result: SearchResponse | null;
  status: SearchStatus;
  onPageChange: (page: number) => void;
  onRetry: () => void;
}

export function SearchResults({
  params,
  result,
  status,
  onPageChange,
  onRetry,
}: SearchResultsProps) {
  const effectiveLocation = result?.meta.effective_location ?? "Braga";
  const fellBack =
    status === "success" &&
    result &&
    params.location &&
    params.location.toLocaleLowerCase() !==
      effectiveLocation.toLocaleLowerCase();

  return (
    <section
      className="mx-auto max-w-[1380px] px-5 pt-6 sm:px-8"
      aria-label="Search results"
    >
      <h2 className="sr-only">Nutritionists</h2>
      <div className="sr-only">
        {status === "success" && <p>Showing services in {effectiveLocation}</p>}
        {status === "success" && result && (
          <span>
            Page {result.meta.page} of {result.meta.total_pages}
          </span>
        )}
      </div>
      {fellBack && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Location “{params.location}” was not found. Showing Braga instead.
        </p>
      )}
      {status === "loading" && (
        <p role="status" className="rounded-xl bg-white p-7 text-slate-500">
          Loading nutritionists…
        </p>
      )}
      {status === "error" && (
        <div role="alert" className="rounded-xl bg-white p-7">
          <p>Search failed. Please try again.</p>
          <button
            className="mt-3 rounded-lg border border-[#cbeae1] bg-[#ebfaf5] px-[1.1rem] py-[0.65rem] font-bold text-[#199b79] hover:bg-[#d9f5eb]"
            onClick={onRetry}
          >
            Retry
          </button>
        </div>
      )}
      {status === "success" && result?.items.length === 0 && (
        <div className="rounded-xl bg-white p-8 text-center">
          <p className="font-semibold">No nutritionists found</p>
          <p className="mt-1 text-sm text-slate-500">
            Try another name or service.
          </p>
        </div>
      )}
      {status === "success" && result && result.items.length > 0 && (
        <div className="grid gap-4 sm:gap-5">
          {result.items.map((person) => (
            <NutritionistCard key={person.id} person={person} />
          ))}
        </div>
      )}
      {status === "success" && result && (
        <SearchPagination
          page={result.meta.page}
          totalPages={result.meta.total_pages}
          onPageChange={onPageChange}
        />
      )}
    </section>
  );
}
