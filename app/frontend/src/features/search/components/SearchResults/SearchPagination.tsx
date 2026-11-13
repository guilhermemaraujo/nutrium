interface SearchPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const buttonClass =
  "min-h-[33px] min-w-[33px] text-[0.8rem] text-[#748295] aria-[current=page]:bg-[#def9ef] aria-[current=page]:text-[#2daf93] disabled:text-[#aeb8c0]";

export function SearchPagination({
  page,
  totalPages,
  onPageChange,
}: SearchPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-7 flex w-fit items-center gap-0 bg-white"
      aria-label="Search pages"
    >
      <button
        className={buttonClass}
        aria-label="Previous"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        &lt;
      </button>
      {Array.from({ length: totalPages }, (_, index) => index + 1).map(
        (pageNumber) => (
          <button
            key={pageNumber}
            className={buttonClass}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === page ? "page" : undefined}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ),
      )}
      <button
        className={buttonClass}
        aria-label="Next"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        &gt;
      </button>
    </nav>
  );
}
