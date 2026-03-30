// this is the main component that does basically everything lol
// shows the book list, handles filtering, pagination, and the cart
import { useEffect, useMemo, useRef, useState } from 'react';

// just defining what a Book looks like so TypeScript stops yelling at me
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

// this is what the API sends back - the book list plus some extra pagination info
type BookListResponse = {
  items: Book[];
  categories: string[];   // all available categories for the filter dropdown
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

// each item in the cart is just a book + how many the user wants
type CartItem = {
  book: Book;
  quantity: number;
};

// using sessionStorage so the cart and page state survive if the user
// clicks around but gets wiped when they close the tab (which is fine)
const CART_KEY = 'bookstore_cart';
const LIST_STATE_KEY = 'bookstore_list_state';

// pull the saved list state (page, filters, etc.) out of sessionStorage
// wrapping in try/catch because JSON.parse will blow up on corrupted data
function loadSavedListState() {
  try {
    const raw = sessionStorage.getItem(LIST_STATE_KEY);
    if (raw) return JSON.parse(raw) as { pageNumber: number; pageSize: number; sortOrder: 'asc' | 'desc'; selectedCategory: string };
  } catch { /* if something is messed up just start fresh */ }
  return null;
}

// same idea but for the cart
function loadSavedCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_KEY);
    if (raw) return JSON.parse(raw) as CartItem[];
  } catch { /* corrupt cart? just empty it */ }
  return [];
}

export default function BooksList() {
  // grabbing the API base URL from the env file, falling back to localhost for dev
  const apiBase = useMemo(
    () => import.meta.env.VITE_API_BASE ?? 'http://localhost:5214',
    []
  );

  // load the saved state once at the top so we can use it as initial values below.
  // using useRef here so it only runs once and doesn't cause extra re-renders
  const saved = useRef(loadSavedListState()).current;

  // all the state variables - initializing from sessionStorage if we have saved data
  const [books, setBooks] = useState<Book[]>([]);
  const [pageNumber, setPageNumber] = useState(saved?.pageNumber ?? 1);
  const [pageSize, setPageSize] = useState(saved?.pageSize ?? 5);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(saved?.sortOrder ?? 'asc');
  const [selectedCategory, setSelectedCategory] = useState(saved?.selectedCategory ?? '');
  const [categories, setCategories] = useState<string[]>([]);

  // cart starts from sessionStorage too so it persists while browsing
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadSavedCart());
  const [justAdded, setJustAdded] = useState<string | null>(null); // for the success alert

  // pagination display stuff
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // need this ref to skip resetting the page on the very first render
  // otherwise it would override the page number we just restored from sessionStorage
  const isFirstRender = useRef(true);

  // save cart to sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // save the current list state (page, filters) so "continue shopping" works
  useEffect(() => {
    sessionStorage.setItem(
      LIST_STATE_KEY,
      JSON.stringify({ pageNumber, pageSize, sortOrder, selectedCategory })
    );
  }, [pageNumber, pageSize, sortOrder, selectedCategory]);

  // main data fetching effect - runs whenever any filter or page setting changes
  useEffect(() => {
    // AbortController lets us cancel the fetch if the user changes filters
    // before the previous request finishes (avoids stale data showing up)
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // build query params from all the current filter state
        const params = new URLSearchParams({
          pageNumber: pageNumber.toString(),
          pageSize: pageSize.toString(),
          sortBy: 'title',
          sortOrder,
        });
        // only add category param if one is actually selected
        if (selectedCategory) {
          params.append('category', selectedCategory);
        }

        const res = await fetch(`${apiBase}/api/Books?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Request failed (${res.status}): ${text}`);
        }

        // unpack the response and update all the relevant state
        const json = (await res.json()) as BookListResponse;
        setBooks(json.items);
        setCategories(json.categories);
        setTotalCount(json.totalCount);
        setTotalPages(json.totalPages);
      } catch (e: any) {
        // AbortError just means we cancelled it on purpose, not a real error
        if (e?.name === 'AbortError') return;
        setError(e?.message ?? 'Failed to load books');
      } finally {
        setLoading(false);
      }
    }

    load();
    // cleanup: cancel the in-flight request when the effect re-runs
    return () => controller.abort();
  }, [apiBase, pageNumber, pageSize, sortOrder, selectedCategory]);

  // reset to page 1 when the user changes page size or category filter
  // skipping the first render so we don't override the restored page number from sessionStorage
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setPageNumber(1);
  }, [pageSize, selectedCategory]);

  // add a book to cart - if it's already there, just bump the quantity
  const addToCart = (book: Book) => {
    setCartItems((prev) => {
      const existing = prev.find((x) => x.book.bookId === book.bookId);
      if (existing) {
        // already in cart, just increase qty
        return prev.map((x) =>
          x.book.bookId === book.bookId ? { ...x, quantity: x.quantity + 1 } : x
        );
      }
      // new item, add it with quantity 1
      return [...prev, { book, quantity: 1 }];
    });
    setJustAdded(book.title); // triggers the green success alert at the top
  };

  // update quantity from the cart input - if quantity goes to 0, remove the item
  const updateQuantity = (bookId: number, quantity: number) => {
    setCartItems((prev) =>
      prev
        .map((x) => (x.book.bookId === bookId ? { ...x, quantity } : x))
        .filter((x) => x.quantity > 0) // filter out anything with qty <= 0
    );
  };

  // derived totals for the cart summary and cart panel
  const cartTotalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cartItems.reduce(
    (sum, item) => sum + item.book.price * item.quantity,
    0
  );

  // format numbers as USD currency - Intl.NumberFormat handles all the $, commas, decimals
  const currency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
      value
    );

  // figure out the "Showing X-Y of Z" range for the current page
  const startIndex = (pageNumber - 1) * pageSize + 1;
  const endIndex = Math.min(pageNumber * pageSize, totalCount);

  return (
    <>
      {/* success alert that pops up when a book is added to cart */}
      {justAdded ? (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          Added "{justAdded}" to cart.
          <button
            type="button"
            className="btn-close"
            data-bs-dismiss="alert"
            aria-label="Close"
            onClick={() => setJustAdded(null)}
          />
        </div>
      ) : null}

      {/* top row: filters accordion on the left, cart summary card on the right */}
      <div className="row g-3 mb-3">
        <div className="col-12 col-lg-8">
          {/* Bootstrap Accordion - collapses/expands the filter panel (new bootstrap feature #1) */}
          <div className="accordion" id="filtersAccordion">
            <div className="accordion-item">
              <h2 className="accordion-header">
                <button
                  className="accordion-button"
                  type="button"
                  data-bs-toggle="collapse"
                  data-bs-target="#filtersCollapse"
                  aria-expanded="true"
                  aria-controls="filtersCollapse"
                >
                  Book Filters
                </button>
              </h2>
              <div
                id="filtersCollapse"
                className="accordion-collapse collapse show"
                data-bs-parent="#filtersAccordion"
              >
                <div className="accordion-body">
                  <div className="row g-3 align-items-end">
                    {/* category dropdown - options come from the API response */}
                    <div className="col-12 col-md-4">
                      <label className="form-label mb-1" htmlFor="categorySelect">
                        Category
                      </label>
                      <select
                        id="categorySelect"
                        className="form-select"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                      >
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* how many books to show per page */}
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

                    {/* sort direction - only sorting by title for now */}
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* cart summary card - always visible so users know what's in their cart */}
        <div className="col-12 col-lg-4">
          <div className="card h-100">
            <div className="card-body d-flex flex-column">
              <h5 className="card-title mb-2">Cart Summary</h5>
              <div className="small text-muted mb-1">Items: {cartTotalQuantity}</div>
              <div className="small text-muted mb-3">Subtotal: {currency(cartSubtotal)}</div>
              {/* triggers the offcanvas cart panel to slide open */}
              <button
                type="button"
                className="btn btn-primary mt-auto"
                data-bs-toggle="offcanvas"
                data-bs-target="#cartOffcanvas"
                aria-controls="cartOffcanvas"
              >
                Open Cart
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* showing the user which page they're on and how many results total */}
      <div className="row g-3 align-items-end mb-3">
        <div className="col-12">
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

      {/* error and loading states */}
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

      {/* main book table */}
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
              <th className="text-end">Cart</th>
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
                <td className="text-end">
                  {/* clicking Add also opens the cart offcanvas so the user sees it was added */}
                  <button
                    className="btn btn-sm btn-success"
                    onClick={() => addToCart(b)}
                    data-bs-toggle="offcanvas"
                    data-bs-target="#cartOffcanvas"
                    aria-controls="cartOffcanvas"
                  >
                    Add
                  </button>
                </td>
              </tr>
            ))}
            {/* empty state if no books match the current filter */}
            {books.length === 0 && !loading ? (
              <tr>
                <td colSpan={8} className="text-center text-muted">
                  No books to display.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {/* prev/next pagination buttons */}
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

      {/* Bootstrap Offcanvas - the cart slides in from the right side (new bootstrap feature #2) */}
      <div
        className="offcanvas offcanvas-end"
        tabIndex={-1}
        id="cartOffcanvas"
        aria-labelledby="cartOffcanvasLabel"
      >
        <div className="offcanvas-header">
          <h5 id="cartOffcanvasLabel">Shopping Cart</h5>
          <button
            type="button"
            className="btn-close text-reset"
            data-bs-dismiss="offcanvas"
            aria-label="Close"
          />
        </div>
        <div className="offcanvas-body">
          {cartItems.length === 0 ? (
            <p className="text-muted mb-0">Your cart is empty.</p>
          ) : (
            <>
              {/* cart table showing each book, its price, qty input, and line total */}
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th className="text-end">Price</th>
                      <th className="text-end">Qty</th>
                      <th className="text-end">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item) => (
                      <tr key={item.book.bookId}>
                        <td>{item.book.title}</td>
                        <td className="text-end">{currency(item.book.price)}</td>
                        {/* editable qty field - setting to 0 removes it from cart */}
                        <td className="text-end" style={{ width: '96px' }}>
                          <input
                            type="number"
                            min={0}
                            className="form-control form-control-sm text-end"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(item.book.bookId, Number(e.target.value))
                            }
                          />
                        </td>
                        <td className="text-end">
                          {currency(item.book.price * item.quantity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* grand total at the bottom */}
              <div className="d-flex justify-content-between border-top pt-2">
                <strong>Total</strong>
                <strong>{currency(cartSubtotal)}</strong>
              </div>
            </>
          )}

          {/* closes the offcanvas and takes the user back to wherever they were browsing */}
          <button
            type="button"
            className="btn btn-outline-primary mt-3"
            data-bs-dismiss="offcanvas"
          >
            Continue Shopping
          </button>
        </div>
      </div>
    </>
  );
}
