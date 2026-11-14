interface RequestPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function RequestPagination({
  page,
  totalPages,
  onPageChange,
}: RequestPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Request pages"
      className="flex items-center justify-end gap-2"
    >
      <span aria-live="polite" className="mr-1 text-xs text-[#626e73]">
        {page} of {totalPages}
      </span>
      <button
        type="button"
        aria-label="Previous requests"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        className="grid size-8 place-items-center rounded border border-[#e4e8e8] text-[#657176] hover:bg-[#f4f8f7] disabled:opacity-40"
      >
        <svg
          aria-hidden="true"
          className="size-3"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="m10 3-5 5 5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        type="button"
        aria-label="Next requests"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        className="grid size-8 place-items-center rounded border border-[#e4e8e8] text-[#657176] hover:bg-[#f4f8f7] disabled:opacity-40"
      >
        <svg
          aria-hidden="true"
          className="size-3"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="m6 3 5 5-5 5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </nav>
  );
}
