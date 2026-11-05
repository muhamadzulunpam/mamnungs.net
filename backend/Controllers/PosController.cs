using System.ComponentModel.DataAnnotations;
using Mamnungs.Api.Data;
using Mamnungs.Api.Helpers;
using Mamnungs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/pos")]
[Authorize(Roles = "kasir,admin")]
public class PosController(AppDbContext db) : ControllerBase
{
    public class CheckoutItem
    {
        [Range(1, int.MaxValue, ErrorMessage = "Produk tidak valid.")]
        public int ProductId { get; set; }

        [Range(1, 99, ErrorMessage = "Jumlah harus antara 1 dan 99.")]
        public int Quantity { get; set; }
    }

    public class CheckoutRequest
    {
        [Required(ErrorMessage = "Keranjang masih kosong.")]
        [MinLength(1, ErrorMessage = "Keranjang masih kosong.")]
        public List<CheckoutItem> Items { get; set; } = [];

        [StringLength(500, ErrorMessage = "Catatan maksimal 500 karakter.")]
        public string? Notes { get; set; }

        [Required(ErrorMessage = "Isi uang yang diterima.")]
        [Range(0, 100_000_000, ErrorMessage = "Jumlah uang tidak valid.")]
        public int? AmountReceived { get; set; }
    }

    // Menu untuk halaman kasir: hanya produk yang tersedia
    [HttpGet("menu")]
    public async Task<IActionResult> Menu()
    {
        var categories = await db.Categories.AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new PosCategoryDto(c.Id, c.Name))
            .ToListAsync();

        var products = await db.Products.AsNoTracking()
            .Where(p => p.IsAvailable)
            .OrderBy(p => p.Name)
            .Select(p => new PosProductDto(p.Id, p.CategoryId, p.Name, p.Price, p.Image))
            .ToListAsync();

        return Ok(new { categories, products });
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout(CheckoutRequest req)
    {
        // Produk yang sama di dua baris digabung jadi satu
        var lines = req.Items
            .GroupBy(i => i.ProductId)
            .Select(g => new { ProductId = g.Key, Quantity = g.Sum(x => x.Quantity) })
            .ToList();

        if (lines.Any(l => l.Quantity > 99))
        {
            ModelState.AddModelError("Items", "Jumlah satu produk maksimal 99.");
            return ValidationProblem(ModelState);
        }

        // Harga SELALU diambil dari database, bukan dari browser
        var ids = lines.Select(l => l.ProductId).ToList();
        var products = await db.Products.AsNoTracking()
            .Where(p => ids.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id);

        foreach (var l in lines)
        {
            if (!products.TryGetValue(l.ProductId, out var p) || !p.IsAvailable)
            {
                ModelState.AddModelError("Items", "Ada produk yang sudah tidak tersedia. Muat ulang halaman.");
                return ValidationProblem(ModelState);
            }
        }

        var subtotal = lines.Sum(l => products[l.ProductId].Price * l.Quantity);
        var total = subtotal;
        var received = req.AmountReceived!.Value;

        if (received < total)
        {
            ModelState.AddModelError("AmountReceived", "Uang yang diterima kurang dari total.");
            return ValidationProblem(ModelState);
        }

        var userId = User.Id();
        var notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

        // Nomor invoice dijaga unique index. Kalau dua kasir bentrok, coba lagi dengan nomor berikutnya.
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            var now = DateTime.UtcNow;
            var invoice = await NextInvoiceNumber();

            var order = new Order
            {
                InvoiceNumber = invoice,
                UserId = userId,
                Subtotal = subtotal,
                Discount = 0,
                Total = total,
                PaymentMethod = "CASH",
                Status = "PAID",
                Notes = notes,
                CreatedAt = now,
                Items = lines.Select(l =>
                {
                    var p = products[l.ProductId];
                    return new OrderItem
                    {
                        ProductId = p.Id,
                        ProductName = p.Name,   // salinan nama saat transaksi
                        Price = p.Price,        // salinan harga saat transaksi
                        Quantity = l.Quantity,
                        Subtotal = p.Price * l.Quantity,
                    };
                }).ToList(),
                Payment = new Payment
                {
                    PaymentMethod = "CASH",
                    Provider = "CASH",
                    Amount = total,
                    AmountReceived = received,
                    ChangeAmount = received - total,
                    Status = "PAID",
                    PaidAt = now,
                },
            };

            db.Orders.Add(order);

            try
            {
                // SaveChanges berjalan dalam satu transaksi database:
                // order, item, dan pembayaran tersimpan semua atau tidak sama sekali
                await db.SaveChangesAsync();

                return Ok(new CheckoutResult(order.Id, order.InvoiceNumber, total, received, received - total, now));
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                db.ChangeTracker.Clear();
            }
        }

        return StatusCode(503, new { message = "Gagal membuat nomor invoice. Coba lagi." });
    }

    private async Task<string> NextInvoiceNumber()
    {
        var prefix = $"INV-{LocalNow():yyyyMMdd}-";

        var last = await db.Orders
            .Where(o => o.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(o => o.InvoiceNumber)
            .Select(o => o.InvoiceNumber)
            .FirstOrDefaultAsync();

        var next = last is null ? 1 : int.Parse(last[^4..]) + 1;

        return $"{prefix}{next:D4}";
    }

    // Tanggal invoice memakai waktu Jakarta, bukan UTC
    private static DateTime LocalNow()
    {
        TimeZoneInfo tz;
        try { tz = TimeZoneInfo.FindSystemTimeZoneById("Asia/Jakarta"); }
        catch (TimeZoneNotFoundException) { tz = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"); }

        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz);
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqliteException { SqliteErrorCode: 19 } e && e.Message.Contains("UNIQUE");
}