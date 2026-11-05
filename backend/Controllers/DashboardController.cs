using Mamnungs.Api.Data;
using Mamnungs.Api.Helpers;
using Mamnungs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "admin")]
public class DashboardController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index()
    {
        var today = Clock.TodayJakarta;
        var monthStart = new DateOnly(today.Year, today.Month, 1);

        var (curStart, curEnd) = Clock.RangeUtc(monthStart, today);
        var (lastStart, lastEnd) = Clock.RangeUtc(monthStart.AddMonths(-1), monthStart.AddDays(-1));
        var (todayStart, todayEnd) = Clock.DayRangeUtc(today);
        var (weekStart, weekEnd) = Clock.RangeUtc(today.AddDays(-6), today);

        // Hanya transaksi lunas yang dihitung sebagai penjualan
        var paid = db.Orders.AsNoTracking().Where(o => o.Status == "PAID");

        var thisMonth = paid.Where(o => o.CreatedAt >= curStart && o.CreatedAt < curEnd);
        var lastMonth = paid.Where(o => o.CreatedAt >= lastStart && o.CreatedAt < lastEnd);
        var todayOrders = paid.Where(o => o.CreatedAt >= todayStart && o.CreatedAt < todayEnd);

        var revenue = await thisMonth.SumAsync(o => (int?)o.Total) ?? 0;
        var revenueLast = await lastMonth.SumAsync(o => (int?)o.Total) ?? 0;
        var orders = await thisMonth.CountAsync();
        var ordersLast = await lastMonth.CountAsync();

        var stats = new DashboardStats(
            revenue, Change(revenue, revenueLast),
            orders, Change(orders, ordersLast),
            await todayOrders.SumAsync(o => (int?)o.Total) ?? 0,
            await todayOrders.CountAsync(),
            await db.Products.CountAsync(p => p.IsAvailable));

        // Penjualan 7 hari terakhir (hari tanpa transaksi diisi 0)
        var weekRows = await paid
            .Where(o => o.CreatedAt >= weekStart && o.CreatedAt < weekEnd)
            .Select(o => new { o.CreatedAt, o.Total })
            .ToListAsync();

        var byDay = weekRows
            .GroupBy(r => Clock.ToJakartaDate(r.CreatedAt))
            .ToDictionary(g => g.Key, g => g.Sum(x => x.Total));

        var weekly = Enumerable.Range(0, 7)
            .Select(i => today.AddDays(i - 6))
            .Select(d => new DailySalesDto(d.ToString("yyyy-MM-dd"), byDay.GetValueOrDefault(d)))
            .ToList();

        // Menu terlaris bulan ini (memakai salinan nama di order_items)
        var topRows = await db.OrderItems.AsNoTracking()
            .Where(i => i.Order!.Status == "PAID" && i.Order.CreatedAt >= curStart && i.Order.CreatedAt < curEnd)
            .GroupBy(i => i.ProductName)
            .Select(g => new { Name = g.Key, Sold = g.Sum(x => x.Quantity), Revenue = g.Sum(x => x.Subtotal) })
            .OrderByDescending(p => p.Sold)
            .Take(5)
            .ToListAsync();

        var topProducts = topRows
            .Select(p => new TopProductDto(p.Name, p.Sold, p.Revenue))
            .ToList();

        var recentRows = await db.Orders.AsNoTracking()
            .OrderByDescending(o => o.Id)
            .Take(5)
            .Select(o => new
            {
                o.Id, o.InvoiceNumber, Cashier = o.User!.Name,
                Items = o.Items.Select(i => new { i.ProductName, i.Quantity }).ToList(),
                o.Total, o.Status, o.CreatedAt,
            })
            .ToListAsync();

        var recent = recentRows.Select(r => new RecentOrderDto(
            r.Id, r.InvoiceNumber, r.Cashier,
            string.Join(", ", r.Items.Select(i => i.Quantity > 1 ? $"{i.ProductName} x{i.Quantity}" : i.ProductName)),
            r.Total, r.Status, Clock.AsUtc(r.CreatedAt))).ToList();

        return Ok(new DashboardDto(stats, weekly, topProducts, recent));
    }

    // Persentase perubahan; null kalau bulan lalu 0 (tidak bisa dibandingkan)
    private static double? Change(int now, int before) =>
        before > 0 ? Math.Round((now - before) * 100.0 / before, 1) : null;
}