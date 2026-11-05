using System.ComponentModel.DataAnnotations;
using Mamnungs.Api.Data;
using Mamnungs.Api.Helpers;
using Mamnungs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/categories")]
[Authorize]
public class CategoriesController(AppDbContext db) : ControllerBase
{
    public class CategoryRequest
    {
        [Required(ErrorMessage = "Nama kategori wajib diisi.")]
        [StringLength(100, ErrorMessage = "Nama kategori maksimal 100 karakter.")]
        public string Name { get; set; } = "";
    }

    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var data = await db.Categories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new CategoryDto(c.Id, c.Name, c.Products.Count(p => !p.IsDeleted)))
            .ToListAsync();

        return Ok(data);
    }

    [HttpPost, Authorize(Roles = "admin")]
    public async Task<IActionResult> Create(CategoryRequest req)
    {
        var name = req.Name.Trim();

        if (await db.Categories.AnyAsync(c => c.Name.ToLower() == name.ToLower()))
        {
            ModelState.AddModelError(nameof(req.Name), "Nama kategori sudah dipakai.");
            return ValidationProblem(ModelState);
        }

        var category = new Category { Name = name, Slug = Slug.From(name) };
        db.Categories.Add(category);
        await db.SaveChangesAsync();

        return Ok(new CategoryDto(category.Id, category.Name, 0));
    }

    [HttpPut("{id:int}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Update(int id, CategoryRequest req)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound(new { message = "Kategori tidak ditemukan." });

        var name = req.Name.Trim();

        if (await db.Categories.AnyAsync(c => c.Id != id && c.Name.ToLower() == name.ToLower()))
        {
            ModelState.AddModelError(nameof(req.Name), "Nama kategori sudah dipakai.");
            return ValidationProblem(ModelState);
        }

        category.Name = name;
        category.Slug = Slug.From(name);
        await db.SaveChangesAsync();

        return Ok(new CategoryDto(category.Id, category.Name, 0));
    }

    [HttpDelete("{id:int}"), Authorize(Roles = "admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var category = await db.Categories.FindAsync(id);
        if (category is null) return NotFound(new { message = "Kategori tidak ditemukan." });

        // IgnoreQueryFilters: produk yang sudah "dihapus" tetap menahan kategori (foreign key)
        if (await db.Products.IgnoreQueryFilters().AnyAsync(p => p.CategoryId == id))
            return Conflict(new { message = "Kategori tidak bisa dihapus karena masih dipakai produk." });

        db.Categories.Remove(category);
        await db.SaveChangesAsync();

        return NoContent();
    }
}