using Mamnungs.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Product> Products => Set<Product>();
    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<User>().HasIndex(u => u.Email).IsUnique();
        b.Entity<Category>().HasIndex(c => c.Name).IsUnique();
        b.Entity<Order>().HasIndex(o => o.InvoiceNumber).IsUnique();
        b.Entity<Order>().HasIndex(o => o.Status);
        b.Entity<Order>().HasIndex(o => o.CreatedAt);

        // Produk yang "dihapus" otomatis disaring dari query
        b.Entity<Product>().HasQueryFilter(p => !p.IsDeleted);

        b.Entity<Product>().HasOne(p => p.Category).WithMany(c => c.Products)
            .HasForeignKey(p => p.CategoryId).OnDelete(DeleteBehavior.Restrict);

        b.Entity<Order>().HasOne(o => o.User).WithMany()
            .HasForeignKey(o => o.UserId).OnDelete(DeleteBehavior.Restrict);

        b.Entity<OrderItem>().HasOne(i => i.Order).WithMany(o => o.Items)
            .HasForeignKey(i => i.OrderId).OnDelete(DeleteBehavior.Cascade);

        b.Entity<OrderItem>().HasOne(i => i.Product).WithMany()
            .HasForeignKey(i => i.ProductId).OnDelete(DeleteBehavior.SetNull);

        b.Entity<Payment>().HasOne(p => p.Order).WithOne(o => o.Payment)
            .HasForeignKey<Payment>(p => p.OrderId).OnDelete(DeleteBehavior.Cascade);
        
        b.Entity<Payment>().HasIndex(p => p.GatewayOrderId).IsUnique();
    }
}