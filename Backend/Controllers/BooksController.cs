using Backend.Data;
using Backend.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BooksController : ControllerBase
{
    private readonly BookstoreDbContext _db;

    public BooksController(BookstoreDbContext db)
    {
        _db = db;
    }

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

    public class BookListResponse
    {
        public required List<BookListItem> Items { get; init; }
        public required int TotalCount { get; init; }
        public required int PageNumber { get; init; }
        public required int PageSize { get; init; }
        public required int TotalPages { get; init; }
    }

    [HttpGet]
    public async Task<ActionResult<BookListResponse>> GetBooks(
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 5,
        [FromQuery] string sortBy = "title",
        [FromQuery] string sortOrder = "asc"
    )
    {
        if (pageNumber < 1) return BadRequest("pageNumber must be >= 1");
        if (pageSize < 1 || pageSize > 50) return BadRequest("pageSize must be between 1 and 50");

        var normalizedSortBy = (sortBy ?? "").Trim().ToLowerInvariant();
        var normalizedSortOrder = (sortOrder ?? "").Trim().ToLowerInvariant();
        var descending = normalizedSortOrder == "desc";

        var baseQuery = _db.Books.AsNoTracking();

        // Assignment requirement: allow sorting by book title.
        IQueryable<Book> orderedQuery = normalizedSortBy == "title" || normalizedSortBy == ""
            ? (descending
                ? baseQuery.OrderByDescending(b => b.Title).ThenBy(b => b.BookID)
                : baseQuery.OrderBy(b => b.Title).ThenBy(b => b.BookID))
            : (descending
                ? baseQuery.OrderByDescending(b => b.BookID)
                : baseQuery.OrderBy(b => b.BookID));

        var totalCount = await orderedQuery.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await orderedQuery
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(b => new BookListItem(
                b.BookID,  // maps to BookId in the DTO
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
            TotalCount = totalCount,
            PageNumber = pageNumber,
            PageSize = pageSize,
            TotalPages = totalPages
        });
    }
}

