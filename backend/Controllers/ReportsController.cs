using System.Text;
using Mamnungs.Api.Data;
using Mamnungs.Api.Helpers;
using Mamnungs.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize(Roles = "admin")]
public class ReportsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Index([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var (f, t, error) = ResolveRange(from, to);
        if (error is not null) return error;

        var (start, end) = Clock.RangeUtc(f, t);

        var rows = await db.Orders.AsNoTracking()
            .Where(o => o.Status == "PAID" && o.CreatedAt >= start && o.CreatedAt < end)
            .Select(o => new { o.CreatedAt, o.Total, o.PaymentMethod })
            .ToListAsync();

        var total = rows.Sum(r => r.Total);
        var count = rows.Count;

        var byMethod = rows
            .GroupBy(r => r.PaymentMethod)
            .Select(g => new MethodSalesDto(g.Key, g.Count(), g.Sum(x => x.Total)))
            .OrderByDescending(m => m.Total)
            .ToList();

        var daily = rows
            .GroupBy(r => Clock.ToJakartaDate(r.CreatedAt))
            .OrderBy(g => g.Key)
            .Select(g => new DailyReportDto(g.Key.ToString("yyyy-MM-dd"), g.Count(), g.Sum(x => x.Total)))
            .ToList();

        var topRows = await db.OrderItems.AsNoTracking()
            .Where(i => i.Order!.Status == "PAID" && i.Order.CreatedAt >= start && i.Order.CreatedAt < end)
            .GroupBy(i => i.ProductName)
            .Select(g => new { Name = g.Key, Sold = g.Sum(x => x.Quantity), Revenue = g.Sum(x => x.Subtotal) })
            .OrderByDescending(p => p.Sold)
            .Take(10)
            .ToListAsync();

        var topProducts = topRows
            .Select(p => new TopProductDto(p.Name, p.Sold, p.Revenue))
            .ToList();

        var summary = new ReportSummary(total, count, count > 0 ? (int)Math.Round((double)total / count) : 0);

        return Ok(new ReportDto(f.ToString("yyyy-MM-dd"), t.ToString("yyyy-MM-dd"),
            summary, byMethod, daily, topProducts));
    }

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] DateOnly? from, [FromQuery] DateOnly? to)
    {
        var (f, t, error) = ResolveRange(from, to);
        if (error is not null) return error;

        var (start, end) = Clock.RangeUtc(f, t);

        var rows = await db.Orders.AsNoTracking()
            .Where(o => o.Status == "PAID" && o.CreatedAt >= start && o.CreatedAt < end)
            .OrderBy(o => o.CreatedAt)
            .Select(o => new
            {
                o.InvoiceNumber, o.CreatedAt, Cashier = o.User!.Name,
                o.PaymentMethod, o.Subtotal, o.Discount, o.Total,
            })
            .ToListAsync();

        var sb = new StringBuilder();
        sb.AppendLine("Invoice,Tanggal,Kasir,Metode,Subtotal,Diskon,Total");

        foreach (var r in rows)
        {
            sb.AppendLine(string.Join(",",
                Csv(r.InvoiceNumber),
                Csv(Clock.ToJakarta(r.CreatedAt).ToString("yyyy-MM-dd HH:mm")),
                Csv(r.Cashier),
                Csv(r.PaymentMethod),
                r.Subtotal, r.Discount, r.Total));
        }

        // BOM di depan supaya Excel membaca UTF-8 dengan benar
        var bytes = new UTF8Encoding(true).GetPreamble()
            .Concat(Encoding.UTF8.GetBytes(sb.ToString())).ToArray();

        return File(bytes, "text/csv; charset=utf-8", $"laporan-{f:yyyy-MM-dd}-sd-{t:yyyy-MM-dd}.csv");
    }

    // Default: awal bulan sampai hari ini
    private (DateOnly From, DateOnly To, IActionResult? Error) ResolveRange(DateOnly? from, DateOnly? to)
    {
        var today = Clock.TodayJakarta;
        var f = from ?? new DateOnly(today.Year, today.Month, 1);
        var t = to ?? today;

        if (t < f)
        {
            ModelState.AddModelError("to", "Tanggal akhir tidak boleh sebelum tanggal awal.");
            return (f, t, ValidationProblem(ModelState));
        }

        if (t.DayNumber - f.DayNumber > 366)
        {
            ModelState.AddModelError("to", "Rentang tanggal maksimal 1 tahun.");
            return (f, t, ValidationProblem(ModelState));
        }

        return (f, t, null);
    }

    // Mengamankan nilai CSV: tanda kutip, koma, dan awalan rumus (=, +, -, @) yang dieksekusi Excel
    private static string Csv(string? value)
    {
        value ??= "";

        if (value.Length > 0 && "=+-@".Contains(value[0]))
            value = "'" + value;

        return value.IndexOfAny([',', '"', '\n', '\r']) >= 0
            ? $"\"{value.Replace("\"", "\"\"")}\""
            : value;
    }
}