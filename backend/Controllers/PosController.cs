using System.ComponentModel.DataAnnotations;
using Mamnungs.Api.Data;
using Mamnungs.Api.Helpers;
using Mamnungs.Api.Models;
using Mamnungs.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/pos")]
[Authorize(Roles = "kasir,admin")]
public class PosController(AppDbContext db, MidtransService midtrans) : ControllerBase
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

        [RegularExpression("^(CASH|QRIS)$", ErrorMessage = "Metode pembayaran tidak valid.")]
        public string PaymentMethod { get; set; } = "CASH";

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

        var method = req.PaymentMethod;
        var isCash = method == "CASH";
        var received = req.AmountReceived ?? 0;

        if (isCash)
        {
            if (req.AmountReceived is null)
            {
                ModelState.AddModelError("AmountReceived", "Isi uang yang diterima.");
                return ValidationProblem(ModelState);
            }

            if (received < total)
            {
                ModelState.AddModelError("AmountReceived", "Uang yang diterima kurang dari total.");
                return ValidationProblem(ModelState);
            }
        }

        var userId = User.Id();
        var notes = string.IsNullOrWhiteSpace(req.Notes) ? null : req.Notes.Trim();

        // Nomor invoice dijaga unique index. Kalau dua kasir bentrok, coba lagi dengan nomor berikutnya.
        Order? saved = null;

        for (var attempt = 1; attempt <= 5 && saved is null; attempt++)
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
                PaymentMethod = method,
                Status = isCash ? "PAID" : "PENDING",
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
                    PaymentMethod = method,
                    Provider = isCash ? "CASH" : "MIDTRANS",
                    Amount = total,
                    AmountReceived = isCash ? received : null,
                    ChangeAmount = isCash ? received - total : null,
                    Status = isCash ? "PAID" : "PENDING",
                    PaidAt = isCash ? now : null,
                    GatewayOrderId = isCash ? null : $"{invoice}-{Guid.NewGuid().ToString("N")[..6]}",
                },
            };

            db.Orders.Add(order);

            try
            {
                // Order, item, dan pembayaran tersimpan dalam satu transaksi database
                await db.SaveChangesAsync();
                saved = order;
            }
            catch (DbUpdateException ex) when (IsUniqueViolation(ex))
            {
                db.ChangeTracker.Clear();
            }
        }

        if (saved is null)
            return StatusCode(503, new { message = "Gagal membuat nomor invoice. Coba lagi." });

        if (isCash)
        {
            return Ok(new CheckoutResult(saved.Id, saved.InvoiceNumber, total, "CASH", "PAID",
                received, received - total, saved.CreatedAt));
        }

        return await ChargeQris(saved);
    }

    // Minta QR ke Midtrans. Kalau gagal, order dibatalkan agar tidak menggantung.
    private async Task<IActionResult> ChargeQris(Order order)
    {
        var items = order.Items.Select(i => new GatewayItem(
            (i.ProductId ?? i.Id).ToString(), i.Price, i.Quantity,
            i.ProductName.Length > 50 ? i.ProductName[..50] : i.ProductName)).ToList();

        try
        {
            var charge = await midtrans.ChargeQrisAsync(order.Payment!.GatewayOrderId!, order.Total, items);

            order.Payment.TransactionId = charge.TransactionId;
            order.Payment.QrUrl = charge.QrUrl;
            order.Payment.ExpiresAt = DateTime.UtcNow.AddMinutes(15);
            await db.SaveChangesAsync();
        }
        catch (Exception ex) when (ex is MidtransException or HttpRequestException or TaskCanceledException)
        {
            order.Status = "CANCELLED";
            order.Payment!.Status = "FAILED";
            await db.SaveChangesAsync();

            var message = ex is MidtransException ? ex.Message : "Tidak dapat terhubung ke Midtrans.";
            return StatusCode(502, new { message = $"Gagal membuat QRIS: {message}" });
        }

        return Ok(new CheckoutResult(order.Id, order.InvoiceNumber, order.Total, "QRIS", "PENDING",
            null, null, order.CreatedAt));
    }

    private async Task<string> NextInvoiceNumber()
    {
        var prefix = $"INV-{Clock.NowJakarta:yyyyMMdd}-";

        var last = await db.Orders
            .Where(o => o.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(o => o.InvoiceNumber)
            .Select(o => o.InvoiceNumber)
            .FirstOrDefaultAsync();

        var next = last is null ? 1 : int.Parse(last[^4..]) + 1;

        return $"{prefix}{next:D4}";
    }

    private static bool IsUniqueViolation(DbUpdateException ex) =>
        ex.InnerException is SqliteException { SqliteErrorCode: 19 } e && e.Message.Contains("UNIQUE");
}