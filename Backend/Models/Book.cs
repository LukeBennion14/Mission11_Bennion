namespace Backend.Models;

public class Book
{
    public int BookID { get; set; }

    public string Title { get; set; } = default!;
    public string Author { get; set; } = default!;
    public string Publisher { get; set; } = default!;
    public string ISBN { get; set; } = default!;

    public string Classification { get; set; } = default!;
    public string Category { get; set; } = default!;

    public int PageCount { get; set; }
    public decimal Price { get; set; }
}

