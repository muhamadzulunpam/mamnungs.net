using Mamnungs.Api.Models;

namespace Mamnungs.Api.Data;

public static class DbSeeder
{
    public static void Seed(AppDbContext db)
    {
        if (db.Users.Any()) return;

        db.Users.AddRange(
            new User { Name = "Admin", Email = "admin@mamnungs.test", Role = "admin",
                       PasswordHash = BCrypt.Net.BCrypt.HashPassword("password") },
            new User { Name = "Kasir", Email = "kasir@mamnungs.test", Role = "kasir",
                       PasswordHash = BCrypt.Net.BCrypt.HashPassword("password") });

        var menu = new Dictionary<string, (string Name, int Price)[]>
        {
            ["Es Teler"] = [("Es Teler Original", 15000), ("Es Teler Durian", 22000), ("Es Teler Spesial", 20000)],
            ["Es Campur"] = [("Es Campur", 14000), ("Es Cendol", 12000)],
            ["Minuman"] = [("Es Teh Manis", 5000), ("Es Jeruk", 8000)],
        };

        foreach (var (categoryName, products) in menu)
        {
            var category = new Category
            {
                Name = categoryName,
                Slug = categoryName.ToLower().Replace(' ', '-'),
            };

            foreach (var (name, price) in products)
                category.Products.Add(new Product { Name = name, Price = price });

            db.Categories.Add(category);
        }

        db.SaveChanges();
    }
}