using Mamnungs.Api.Data;
using Mamnungs.Api.Helpers;
using Mamnungs.Api.Models;
using Mamnungs.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize(Roles = "kasir,admin")]
public class PaymentsController(
    AppDbContext db, PaymentService payments, MidtransService midtrans, IOptions<MidtransOptions> options)
    : ControllerBase
{
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Show(int id)
    {
        var (order, error) = await Find(id);
        if (error is not null) return error;

        return Ok(new PaymentInfoDto(
            order!.Id, order.InvoiceNumber, order.Total, order.Status,
            order.Payment!.QrUrl,
            order.Payment.ExpiresAt is { } e ? Clock.AsUtc(e) : null,
            !options.Value.IsProduction));
    }

    [HttpGet("{id:int}/status")]
    public async Task<IActionResult> Status(int id)
    {
        var (_, error) = await Find(id);
        if (error is not null) return error;

        return Ok(new { status = await payments.SyncAsync(id) });
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<IActionResult> Cancel(int id)
    {
        var (order, error) = await Find(id);
        if (error is not null) return error;

        if (order!.Status != "PENDING") return Ok(new { status = order.Status });

        // Batalkan di Midtrans dulu, lalu cek hasil akhirnya. Jangan batalkan lokal
        // kalau Midtrans masih menganggap pembayaran aktif (pelanggan masih bisa membayar).
        await midtrans.CancelAsync(order.Payment!.GatewayOrderId!);
        var status = await payments.SyncAsync(id);

        return status switch
        {
            "PENDING" => Conflict(new { message = "Pembayaran belum bisa dibatalkan. Coba lagi beberapa saat." }),
            "PAID" => Conflict(new { message = "Pembayaran ternyata sudah berhasil, transaksi tidak dibatalkan." }),
            _ => Ok(new { status }),
        };
    }

    private async Task<(Order? Order, IActionResult? Error)> Find(int id)
    {
        var order = await db.Orders.AsNoTracking()
            .Include(o => o.Payment)
            .FirstOrDefaultAsync(o => o.Id == id);

        if (order?.Payment is null || order.PaymentMethod != "QRIS")
            return (null, NotFound(new { message = "Pembayaran QRIS tidak ditemukan." }));

        if (!User.IsAdmin() && order.UserId != User.Id())
            return (null, StatusCode(403, new { message = "Anda tidak punya akses ke transaksi ini." }));

        return (order, null);
    }
}