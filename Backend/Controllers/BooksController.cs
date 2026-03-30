// handles all the API endpoints for books
// right now there's just one GET endpoint but could add more later
using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    // inject the db context - ASP.NET handles creating it for us (dependency injection)
    private readonly BookstoreDbContext _db;

    public BooksController(BookstoreDbContext db)
    {
        _db = db;
    }

    // this is the shape of each book in the response list
    // using a record here because it's just data, no methods needed
    public record BookListItem(
        int BookId,
        string Title,
        string Author,
        string Publisher,
        string ISBN,
        string Classification,
        string Category,
        int PageCount,
        decimal Price
    );

    // the full response object - has the books plus pagination info and the category list
    public class BookListResponse
    {
        public required List<BookListItem> Items { get; init; }
        public required List<string> Categories { get; init; }   // for populating the filter dropdown
        public required int TotalCount { get; init; }
        public required int PageNumber { get; init; }
        public required int PageSize { get; init; }
        public required int TotalPages { get; init; }
    }

    // GET /api/Books?pageNumber=1&pageSize=5&category=Biography&sortBy=title&sortOrder=asc
    [HttpGet]
    public async Task<ActionResult<BookListResponse>> GetBooks(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 5,
        [FromQuery] string? category = null,
        [FromQuery] string sortBy = "title",
        [FromQuery] string sortOrder = "asc"
    )
    {
        // basic validation so nobody sends garbage values
        if (pageNumber < 1) return BadRequest("pageNumber must be >= 1");
        if (pageSize < 1 || pageSize > 50) return BadRequest("pageSize must be between 1 and 50");

        // normalize these so "Title" and "TITLE" and "title" all work the same
        var normalizedSortBy = (sortBy ?? "").Trim().ToLowerInvariant();
        var normalizedSortOrder = (sortOrder ?? "").Trim().ToLowerInvariant();
        var descending = normalizedSortOrder == "desc";

        // AsNoTracking is a perf thing - we're only reading, not updating, so EF doesn't need to track changes
        var baseQuery = _db.Books.AsNoTracking();

        // always fetch all categories regardless of the current filter
        // so the dropdown still shows every option even when one is selected
        var categories = await _db.Books
            .AsNoTracking()
            .Select(b => b.Category)
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Distinct()
            .OrderBy(c => c)
            .ToListAsync();

        // filter by category if one was passed in
        if (!string.IsNullOrWhiteSpace(category))
        {
            baseQuery = baseQuery.Where(b => b.Category == category);
        }

        // sorting - defaults to title, falls back to BookID if something weird comes in
        IQueryable<Book> orderedQuery = normalizedSortBy == "title" || normalizedSortBy == ""
            ? (descending
                ? baseQuery.OrderByDescending(b => b.Title).ThenBy(b => b.BookID)
                : baseQuery.OrderBy(b => b.Title).ThenBy(b => b.BookID))
            : (descending
                ? baseQuery.OrderByDescending(b => b.BookID)
                : baseQuery.OrderBy(b => b.BookID));

        // count first so we can calculate total pages
        var totalCount = await orderedQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        // Skip/Take is how you do pagination with LINQ - skip the pages before this one, take one page worth
        var items = await orderedQuery
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BookListItem(
                b.BookID,  // the DB column is BookID but the DTO calls it BookId (camelCase in JSON)
                b.Title,
                b.Author,
                b.Publisher,
                b.ISBN,
                b.Classification,
                b.Category,
                b.PageCount,
                b.Price
            ))
            .ToListAsync();

        return Ok(new BookListResponse
        {
            Items = items,
            Categories = categories,
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalPages
        });
    }
}
