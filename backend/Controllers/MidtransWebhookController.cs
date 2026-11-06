using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Mamnungs.Api.Data;
using Mamnungs.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/midtrans")]
[AllowAnonymous]   // dipanggil server Midtrans, diamankan lewat signature
public class MidtransWebhookController(
    AppDbContext db, PaymentService payments, IOptions<MidtransOptions> options) : ControllerBase
{
    [HttpPost("notification")]
    public async Task<IActionResult> Notification([FromBody] JsonElement body)
    {
        var orderId = MidtransService.Str(body, "order_id") ?? "";
        var statusCode = MidtransService.Str(body, "status_code") ?? "";
        var gross = MidtransService.Str(body, "gross_amount") ?? "";
        var signature = MidtransService.Str(body, "signature_key") ?? "";

        // Pastikan kiriman benar-benar dari Midtrans: SHA512(order_id + status_code + gross_amount + server_key)
        var raw = Encoding.UTF8.GetBytes(orderId + statusCode + gross + options.Value.ServerKey);
        var expected = Convert.ToHexString(SHA512.HashData(raw)).ToLowerInvariant();

        if (!CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected), Encoding.UTF8.GetBytes(signature.ToLowerInvariant())))
            return StatusCode(403, new { message = "Signature tidak valid." });

        var payment = await db.Payments.AsNoTracking().FirstOrDefaultAsync(p => p.GatewayOrderId == orderId);

        // Status sebenarnya ditanyakan ulang ke Midtrans, isi body notifikasi tidak dipercaya mentah-mentah
        if (payment is not null)
            await payments.SyncAsync(payment.OrderId);

        return Ok(new { ok = true });
    }
}