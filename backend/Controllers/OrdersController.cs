using Mamnungs.Api.Data;
using Mamnungs.Api.Helpers;
using Mamnungs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize(Roles = "kasir,admin")]
public class OrdersController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index(
        [FromQuery] string? date,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 15)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var day = DateOnly.TryParse(date, out var parsed) ? parsed : Clock.TodayJakarta;
        var (start, end) = Clock.DayRangeUtc(day);

        var query = db.Orders.AsNoTracking()
            .Where(o => o.CreatedAt >= start && o.CreatedAt < end);

        // Kasir hanya boleh melihat transaksinya sendiri
        if (!User.IsAdmin())
        {
            var me = User.Id();
            query = query.Where(o => o.UserId == me);
        }

        var total = await query.CountAsync();

        var paid = query.Where(o => o.Status == "PAID");
        var summary = new OrderSummaryDto(
            await paid.CountAsync(),
            await paid.SumAsync(o => (int?)o.Total) ?? 0);

        var rows = await query
            .OrderByDescending(o => o.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(o => new
            {
                o.Id, o.InvoiceNumber, o.CreatedAt, CashierName = o.User!.Name,
                o.PaymentMethod, o.Total, o.Status,
            })
            .ToListAsync();

        var items = rows
            .Select(o => new OrderListDto(o.Id, o.InvoiceNumber, Clock.AsUtc(o.CreatedAt),
                o.CashierName, o.PaymentMethod, o.Total, o.Status))
            .ToList();

        return Ok(new PagedOrders(items, total, page, pageSize,
            (int)Math.Ceiling(total / (double)pageSize), summary));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> Receipt(int id)
    {
        var order = await db.Orders.AsNoTracking()
            .Include(o => o.Items)
            .Include(o => o.Payment)
            .Include(o => o.User)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order is null)
            return NotFound(new { message = "Transaksi tidak ditemukan." });

        if (!User.IsAdmin() && order.UserId != User.Id())
            return StatusCode(403, new { message = "Anda tidak punya akses ke transaksi ini." });

        var store = new StoreDto(
            config["Store:Name"] ?? "Mamnungs",
            config["Store:Address"] ?? "");

        return Ok(new ReceiptDto(
            order.Id, order.InvoiceNumber, Clock.AsUtc(order.CreatedAt),
            order.User?.Name ?? "-", order.PaymentMethod, order.Status,
            order.Subtotal, order.Discount, order.Total,
            order.Payment?.AmountReceived, order.Payment?.ChangeAmount, order.Notes,
            order.Items.Select(i => new ReceiptItemDto(i.ProductName, i.Price, i.Quantity, i.Subtotal)).ToList(),
            store));
    }
}