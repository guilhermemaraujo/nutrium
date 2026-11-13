import { Header } from "@/components/Header";
import { SearchForm } from "@/features/search/components/SearchForm";
import { SearchResults } from "@/features/search/components/SearchResults";
import { useNutritionistSearch } from "@/features/search/hooks/useNutritionistSearch";

export function SearchPage() {
  const search = useNutritionistSearch();

  return (
    <main className="min-h-screen bg-[#f8f8fa] pb-14">
      <div className="bg-[linear-gradient(115deg,#38b989,#31ab91)] text-white">
        <Header />
        <div className="bg-[linear-gradient(110deg,rgba(14,154,120,0.18),rgba(24,135,128,0.13))]">
          <div className="mx-auto max-w-[1380px] px-5 py-8 sm:px-8 sm:py-14">
            <h1 className="sr-only">Find your nutritionist</h1>
            <SearchForm onSearch={search.submit} />
          </div>
        </div>
      </div>
      <SearchResults
        params={search.params}
        result={search.result}
        status={search.status}
        onPageChange={search.changePage}
        onRetry={search.retry}
      />
    </main>
  );
}
