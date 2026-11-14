import { useEffect, useState } from "react";

import { Header } from "@/components/Header";

import { NutritionistSelect } from "./components/NutritionistSelect";
import { RequestCard } from "./components/RequestCard";
import { RequestPagination } from "./components/RequestPagination";
import { usePendingRequests } from "./hooks/usePendingRequests";

export function RequestsPage() {
  const dashboard = usePendingRequests();
  const [page, setPage] = useState(1);
  const selected = dashboard.nutritionists.find(
    (person) => person.id === dashboard.selectedId,
  );
  const pageSize = 3;
  const totalPages = Math.ceil(dashboard.requests.length / pageSize);
  const lastAvailablePage = Math.max(1, totalPages);
  const currentPage = Math.min(page, lastAvailablePage);
  const visibleRequests = dashboard.requests.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    if (dashboard.requestsStatus !== "success" || page <= lastAvailablePage)
      return;
    // A refreshed list may have fewer pages; reconcile only after it settles.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(lastAvailablePage);
  }, [dashboard.requestsStatus, lastAvailablePage, page]);

  return (
    <div className="min-h-screen bg-[#f5f6f7]">
      <div className="bg-[linear-gradient(115deg,#38b989,#31ab91)] text-white">
        <Header showProfessionalCta={false} />
      </div>
      <main className="px-4 py-5 text-[#263b3e] sm:px-6 sm:py-8">
        <div className="mx-auto max-w-[1180px]">
          {selected && dashboard.nutritionistsStatus === "success" && (
            <NutritionistSelect
              dashboard={dashboard}
              selected={selected}
              setPage={setPage}
            />
          )}
          <div className="rounded-[4px] bg-white px-5 py-[23px] md:p-6 min-[1101px]:px-[42px] min-[1101px]:py-[38px]">
            <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-[#5b6266]">
                  Pending requests
                </h1>
                <p className="mt-1 text-sm text-[#626e73]">
                  Accept or reject new pending requests
                </p>
              </div>
              {selected && dashboard.requestsStatus === "success" && (
                <RequestPagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={setPage}
                />
              )}
            </header>

            {dashboard.nutritionistsStatus === "loading" && (
              <p role="status" className="rounded-lg bg-[#f6f7f8] p-6">
                Loading nutritionists…
              </p>
            )}
            {dashboard.nutritionistsStatus === "error" && (
              <div role="alert" className="rounded-lg bg-[#f6f7f8] p-6">
                <p>Could not load nutritionists.</p>
                <button
                  type="button"
                  onClick={dashboard.retryNutritionists}
                  className="mt-3 font-semibold text-[#168d70] underline"
                >
                  Retry
                </button>
              </div>
            )}
            {dashboard.nutritionistsStatus === "success" &&
              dashboard.nutritionists.length === 0 && (
                <p className="rounded-lg bg-[#f6f7f8] p-6">
                  No nutritionists are available.
                </p>
              )}

            {selected && dashboard.nutritionistsStatus === "success" && (
              <section aria-label={`Pending requests for ${selected.name}`}>
                {dashboard.feedback && (
                  <p
                    role="status"
                    className="mb-4 rounded-lg bg-[#e8f8f2] px-5 py-3 font-medium text-[#166d56]"
                  >
                    {dashboard.feedback}
                  </p>
                )}
                {dashboard.requestsStatus === "loading" && (
                  <p role="status" className="rounded-lg bg-[#f6f7f8] p-6">
                    Loading pending requests…
                  </p>
                )}
                {dashboard.requestsStatus === "error" && (
                  <div role="alert" className="rounded-lg bg-[#f6f7f8] p-6">
                    <p>
                      {dashboard.feedback
                        ? "Decision saved, but pending requests could not be refreshed."
                        : "Could not load pending requests."}
                    </p>
                    <button
                      type="button"
                      onClick={dashboard.retryRequests}
                      className="mt-3 font-semibold text-[#168d70] underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {dashboard.requestsStatus === "success" &&
                  dashboard.requests.length === 0 && (
                    <div className="rounded-lg bg-[#f6f7f8] p-8 text-center">
                      <p className="font-semibold">No pending requests</p>
                      <p className="mt-1 text-sm text-slate-500">
                        New appointment requests will appear here.
                      </p>
                    </div>
                  )}
                {dashboard.requestsStatus === "success" &&
                  dashboard.requests.length > 0 && (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleRequests.map((request) => (
                        <RequestCard
                          key={request.id}
                          request={request}
                          timeZone={selected.time_zone}
                          updating={dashboard.decidingId === request.id}
                          disabled={dashboard.decidingId !== null}
                          error={
                            dashboard.decisionError?.id === request.id
                              ? dashboard.decisionError.message
                              : null
                          }
                          onAccept={() => dashboard.decide(request, "accept")}
                          onReject={() => dashboard.decide(request, "reject")}
                        />
                      ))}
                    </div>
                  )}
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
