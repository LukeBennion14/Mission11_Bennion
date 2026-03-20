using Backend.Models;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class BookstoreDbContext : DbContext
{
    public BookstoreDbContext(DbContextOptions<BookstoreDbContext> options) : base(options)
    {
    }

    public DbSet<Book> Books => Set<Book>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Map the existing pre-populated SQLite schema (no migrations required).
        modelBuilder.Entity<Book>(entity =>
        {
            entity.ToTable("Books");
            entity.HasKey(e => e.BookID);

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

