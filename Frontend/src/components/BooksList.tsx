import { useEffect, useMemo, useState } from 'react';

type Book = {
  bookId: number;
  title: string;
  author: string;
  publisher: string;
  isbn: string;
  classification: string;
  category: string;
  pageCount: number;
  price: number;
};

type BookListResponse = {
  items: Book[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export default function BooksList() {
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_BASE ?? 'http://localhost:5214',
    []
  );

  const [books, setBooks] = useState<Book[]>([]);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          pageNumber: pageNumber.toString(),
          pageSize: pageSize.toString(),
          sortBy: 'title',
          sortOrder,
        });

        const res = await fetch(`${apiBase}/api/Books?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Request failed (${res.status}): ${text}`);
        }

        const json = (await res.json()) as BookListResponse;
        setBooks(json.items);
        setTotalCount(json.totalCount);
        setTotalPages(json.totalPages);
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        setError(e?.message ?? 'Failed to load books');
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => controller.abort();
  }, [apiBase, pageNumber, pageSize, sortOrder]);

  useEffect(() => {
    // Reset to page 1 when pageSize changes.
    setPageNumber(1);
  }, [pageSize]);

  const currency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      value
    );

  const startIndex = (pageNumber - 1) * pageSize + 1;
  const endIndex = Math.min(pageNumber * pageSize, totalCount);

  return (
    <>
      <div className="row g-3 align-items-end mb-3">
        <div className="col-12 col-md-4">
          <label className="form-label mb-1" htmlFor="pageSizeSelect">
            Results per page
          </label>
          <select
            id="pageSizeSelect"
            className="form-select"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={15}>15</option>
            <option value={20}>20</option>
          </select>
        </div>

        <div className="col-12 col-md-4">
          <label className="form-label mb-1" htmlFor="sortOrderSelect">
            Sort by Title
          </label>
          <select
            id="sortOrderSelect"
            className="form-select"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
          >
            <option value="asc">A to Z</option>
            <option value="desc">Z to A</option>
          </select>
        </div>

        <div className="col-12 col-md-4">
          <div className="text-md-end mt-2 mt-md-0">
            <div className="small text-muted">
              {totalCount > 0
                ? `Showing ${startIndex}-${endIndex} of ${totalCount}`
                : 'No books found'}
            </div>
            <div className="small text-muted">
              {totalPages > 0 ? `Page ${pageNumber} of ${totalPages}` : ''}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="alert alert-info" role="alert">
          Loading books...
        </div>
      ) : null}

      <div className="table-responsive">
        <table className="table table-striped table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Title</th>
              <th>Author</th>
              <th>Publisher</th>
              <th>ISBN</th>
              <th>Classification/Category</th>
              <th className="text-end">Pages</th>
              <th className="text-end">Price</th>
            </tr>
          </thead>
          <tbody>
            {books.map((b) => (
              <tr key={b.bookId}>
                <td>{b.title}</td>
                <td>{b.author}</td>
                <td>{b.publisher}</td>
                <td>{b.isbn}</td>
                <td>
                  {b.classification} / {b.category}
                </td>
                <td className="text-end">{b.pageCount}</td>
                <td className="text-end">{currency(b.price)}</td>
              </tr>
            ))}
            {books.length === 0 && !loading ? (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  No books to display.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between align-items-center mt-3">
        <button
          className="btn btn-outline-primary"
          onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
          disabled={pageNumber <= 1 || loading || totalPages <= 1}
        >
          Previous
        </button>

        <div className="small text-muted">
          {totalPages > 0 ? `Page ${pageNumber} of ${totalPages}` : ''}
        </div>

        <button
          className="btn btn-outline-primary"
          onClick={() => setPageNumber((p) => Math.min(totalPages || p, p + 1))}
          disabled={loading || pageNumber >= totalPages}
        >
          Next
        </button>
      </div>
    </>
  );
}

