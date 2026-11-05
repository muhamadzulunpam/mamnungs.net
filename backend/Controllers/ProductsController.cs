using System.ComponentModel.DataAnnotations;
using Mamnungs.Api.Data;
using Mamnungs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/products")]
[Authorize]
public class ProductsController(AppDbContext db, IWebHostEnvironment env) : ControllerBase
{
    private static readonly string[] AllowedExt = [".jpg", ".jpeg", ".png", ".webp"];
    private const long MaxImageBytes = 2 * 1024 * 1024;

    public class ProductForm
    {
        [Required(ErrorMessage = "Pilih kategori.")]
        public int? CategoryId { get; set; }

        [Required(ErrorMessage = "Nama produk wajib diisi.")]
        [StringLength(150, ErrorMessage = "Nama produk maksimal 150 karakter.")]
        public string Name { get; set; } = "";

        [StringLength(1000, ErrorMessage = "Deskripsi maksimal 1000 karakter.")]
        public string? Description { get; set; }

        [Required(ErrorMessage = "Harga wajib diisi.")]
        [Range(0, 10_000_000, ErrorMessage = "Harga harus antara 0 dan 10.000.000.")]
        public int? Price { get; set; }

        public bool IsAvailable { get; set; } = true;

        public IFormFile? Image { get; set; }
    }

    private static ProductDto ToDto(Product p, string categoryName) =>
        new(p.Id, p.CategoryId, categoryName, p.Name, p.Description, p.Price, p.Image, p.IsAvailable);

    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] string? search,
        [FromQuery] int? categoryId,
        [FromQuery] bool? available,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = db.Products.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(p => p.Name.ToLower().Contains(s));
        }

        if (categoryId.HasValue) query = query.Where(p => p.CategoryId == categoryId);
        if (available.HasValue) query = query.Where(p => p.IsAvailable == available);

        var total = await query.CountAsync();

        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new ProductDto(p.Id, p.CategoryId, p.Category!.Name, p.Name,
                p.Description, p.Price, p.Image, p.IsAvailable))
            .ToListAsync();

        return Ok(new PagedResult<ProductDto>(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize)));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Show(int id)
    {
        var p = await db.Products.AsNoTracking().Include(x => x.Category)
            .FirstOrDefaultAsync(x => x.Id == id);

        return p is null
            ? NotFound(new { message = "Produk tidak ditemukan." })
            : Ok(ToDto(p, p.Category!.Name));
    }

    [HttpPost, Authorize(Roles = "admin")]
    public async Task<IActionResult> Create([FromForm] ProductForm form)
    {
        var category = await db.Categories.FindAsync(form.CategoryId);
        if (category is null)
        {
            ModelState.AddModelError(nameof(form.CategoryId), "Kategori tidak valid.");
            return ValidationProblem(ModelState);
        }

        var (url, error) = await SaveImage(form.Image);
        if (error is not null)
        {
            ModelState.AddModelError(nameof(form.Image), error);
            return ValidationProblem(ModelState);
        }

        var product = new Product
        {
            CategoryId = category.Id,
            Name = form.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(form.Description) ? null : form.Description.Trim(),
            Price = form.Price!.Value,
            IsAvailable = form.IsAvailable,
            Image = url,
        };

        db.Products.Add(product);
        await db.SaveChangesAsync();

        return Ok(ToDto(product, category.Name));
    }

    [HttpPut("{id:int}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, [FromForm] ProductForm form)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound(new { message = "Produk tidak ditemukan." });

        var category = await db.Categories.FindAsync(form.CategoryId);
        if (category is null)
        {
            ModelState.AddModelError(nameof(form.CategoryId), "Kategori tidak valid.");
            return ValidationProblem(ModelState);
        }

        var (url, error) = await SaveImage(form.Image);
        if (error is not null)
        {
            ModelState.AddModelError(nameof(form.Image), error);
            return ValidationProblem(ModelState);
        }

        if (url is not null)
        {
            DeleteImage(product.Image);   // foto lama dihapus saat diganti
            product.Image = url;
        }

        product.CategoryId = category.Id;
        product.Name = form.Name.Trim();
        product.Description = string.IsNullOrWhiteSpace(form.Description) ? null : form.Description.Trim();
        product.Price = form.Price!.Value;
        product.IsAvailable = form.IsAvailable;

        await db.SaveChangesAsync();

        return Ok(ToDto(product, category.Name));
    }

    [HttpPatch("{id:int}/toggle"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Toggle(int id)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound(new { message = "Produk tidak ditemukan." });

        product.IsAvailable = !product.IsAvailable;
        await db.SaveChangesAsync();

        return Ok(new { product.Id, product.IsAvailable });
    }

    [HttpDelete("{id:int}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var product = await db.Products.FirstOrDefaultAsync(p => p.Id == id);
        if (product is null) return NotFound(new { message = "Produk tidak ditemukan." });

        // Soft delete: hilang dari daftar, tapi riwayat order tetap aman
        product.IsDeleted = true;
        await db.SaveChangesAsync();

        return NoContent();
    }

    private async Task<(string? Url, string? Error)> SaveImage(IFormFile? file)
    {
        if (file is null || file.Length == 0) return (null, null);
        if (file.Length > MaxImageBytes) return (null, "Ukuran foto maksimal 2 MB.");

        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!AllowedExt.Contains(ext)) return (null, "Foto harus berformat JPG, PNG, atau WebP.");

        var dir = Path.Combine(env.WebRootPath, "uploads", "products");
        Directory.CreateDirectory(dir);

        var name = $"{Guid.NewGuid():N}{ext}";   // nama acak, nama asli pengguna tidak dipakai
        await using var stream = System.IO.File.Create(Path.Combine(dir, name));
        await file.CopyToAsync(stream);

        return ($"uploads/products/{name}", null);
    }

    private void DeleteImage(string? relative)
    {
        if (string.IsNullOrEmpty(relative)) return;

        var full = Path.Combine(env.WebRootPath, relative.Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(full)) System.IO.File.Delete(full);
    }
}