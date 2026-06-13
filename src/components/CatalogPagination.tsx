type CatalogPaginationProps = {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function CatalogPagination({
  page,
  totalPages,
  onPageChange,
  className = "",
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className={`flex flex-wrap items-center justify-center gap-3 ${className}`.trim()}
      aria-label="Catalog pages"
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="border border-outline-variant/30 bg-surface-container-high px-4 py-2 font-label-md uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      <span className="font-label-md uppercase tracking-widest text-on-surface-variant">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="border border-outline-variant/30 bg-surface-container-high px-4 py-2 font-label-md uppercase tracking-widest text-on-surface-variant transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}
