using Mamnungs.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Services;

public class PaymentService(AppDbContext db, MidtransService midtrans)
{
    // Menanyakan status ke Midtrans lalu menyamakan order dan payment. Aman dipanggil berulang.
    public async Task<string> SyncAsync(int orderId)
    {
        var order = await db.Orders.AsNoTracking()
            .Include(o => o.Payment)
            .FirstOrDefaultAsync(o => o.Id == orderId);

        if (order is null) return "NOT_FOUND";
        if (order.Status != "PENDING" || order.Payment?.GatewayOrderId is null) return order.Status;

        MidtransStatus status;
        try
        {
            status = await midtrans.GetStatusAsync(order.Payment.GatewayOrderId);
        }
        catch (Exception ex) when (ex is MidtransException or HttpRequestException or TaskCanceledException)
        {
            return order.Status;   // dicoba lagi pada polling berikutnya
        }

        var (orderStatus, paymentStatus) = Map(status.TransactionStatus, status.FraudStatus);
        if (orderStatus is null || paymentStatus is null) return order.Status;   // masih pending

        await using var tx = await db.Database.BeginTransactionAsync();

        // Hanya order PENDING yang boleh berubah, jadi webhook ganda tidak menimbulkan efek ganda
        var changed = await db.Orders
            .Where(o => o.Id == orderId && o.Status == "PENDING")
            .ExecuteUpdateAsync(s => s.SetProperty(o => o.Status, orderStatus));

        if (changed > 0)
        {
            var paidAt = paymentStatus == "PAID" ? DateTime.UtcNow : (DateTime?)null;
            var txId = status.TransactionId;

            await db.Payments
                .Where(p => p.OrderId == orderId)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(p => p.Status, paymentStatus)
                    .SetProperty(p => p.PaidAt, paidAt)
                    .SetProperty(p => p.TransactionId, p => txId ?? p.TransactionId));
        }

        await tx.CommitAsync();

        return await db.Orders.AsNoTracking()
            .Where(o => o.Id == orderId)
            .Select(o => o.Status)
            .FirstAsync();
    }

    private static (string? Order, string? Payment) Map(string? status, string? fraud) => status switch
    {
        "settlement" => ("PAID", "PAID"),
        "capture" when fraud != "challenge" => ("PAID", "PAID"),
        "expire" => ("EXPIRED", "EXPIRED"),
        "cancel" or "deny" or "failure" => ("CANCELLED", "FAILED"),
        _ => (null, null),
    };
}