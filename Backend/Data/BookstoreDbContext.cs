// this is the EF Core database context - basically the gateway to the database
// it knows about all the tables and how they map to our C# models
using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class BookstoreDbContext : DbContext
{
    // constructor passes options up to the base DbContext class
    // the options (like the connection string) come from Program.cs
    public BookstoreDbContext(DbContextOptions<BookstoreDbContext> options) : base(options)
    {
    }

    // this is how you access the Books table - EF generates the SQL for you
    public DbSet<Book> Books => Set<Book>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // the SQLite file already exists with data in it so we're not running migrations,
        // just telling EF how to map the existing table and columns
        modelBuilder.Entity<Book>(entity =>
        {
            entity.ToTable("Books");
            entity.HasKey(e => e.BookID);

            // explicitly mapping column names - mostly they match the property names but good to be explicit
            entity.Property(e => e.BookID).HasColumnName("BookID");
            entity.Property(e => e.Title).HasColumnName("Title");
            entity.Property(e => e.Author).HasColumnName("Author");
            entity.Property(e => e.Publisher).HasColumnName("Publisher");
            entity.Property(e => e.ISBN).HasColumnName("ISBN");

            entity.Property(e => e.Classification).HasColumnName("Classification");
            entity.Property(e => e.Category).HasColumnName("Category");

            entity.Property(e => e.PageCount).HasColumnName("PageCount");
            entity.Property(e => e.Price).HasColumnName("Price");
        });
    }
}
