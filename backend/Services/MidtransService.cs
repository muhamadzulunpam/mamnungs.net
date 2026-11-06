using System.Text;
using System.Text.Json;

namespace Mamnungs.Api.Services;

public record GatewayItem(string Id, int Price, int Quantity, string Name);
public record QrisCharge(string TransactionId, string? QrUrl);
public record MidtransStatus(string? StatusCode, string? TransactionStatus, string? FraudStatus, string? TransactionId);

public class MidtransException(string message) : Exception(message);

public class MidtransService(HttpClient http)
{
    public async Task<QrisCharge> ChargeQrisAsync(
        string orderId, int amount, IEnumerable<GatewayItem> items, int expiryMinutes = 15)
    {
        var payload = new
        {
            payment_type = "qris",
            transaction_details = new { order_id = orderId, gross_amount = amount },
            item_details = items.Select(i => new { id = i.Id, price = i.Price, quantity = i.Quantity, name = i.Name }),
            qris = new { acquirer = "gopay" },
            custom_expiry = new { expiry_duration = expiryMinutes, unit = "minute" },
        };

        var json = await SendAsync(HttpMethod.Post, "/v2/charge", payload);

        var code = Str(json, "status_code");
        if (code is not ("200" or "201"))
            throw new MidtransException(Str(json, "status_message") ?? "Midtrans menolak permintaan.");

        string? v2 = null, v1 = null;

        if (json.TryGetProperty("actions", out var actions) && actions.ValueKind == JsonValueKind.Array)
        {
            foreach (var a in actions.EnumerateArray())
            {
                var name = Str(a, "name");
                if (name == "generate-qr-code-v2") v2 = Str(a, "url");
                else if (name == "generate-qr-code") v1 = Str(a, "url");
            }
        }

        return new QrisCharge(Str(json, "transaction_id") ?? "", v2 ?? v1);
    }

    public async Task<MidtransStatus> GetStatusAsync(string orderId)
    {
        var json = await SendAsync(HttpMethod.Get, $"/v2/{Uri.EscapeDataString(orderId)}/status");

        return new MidtransStatus(
            Str(json, "status_code"), Str(json, "transaction_status"),
            Str(json, "fraud_status"), Str(json, "transaction_id"));
    }

    // Dibuat "best effort": kegagalan tidak dilempar, hasil akhirnya dicek lewat GetStatusAsync
    public async Task CancelAsync(string orderId)
    {
        try { await SendAsync(HttpMethod.Post, $"/v2/{Uri.EscapeDataString(orderId)}/cancel", new { }); }
        catch (Exception ex) when (ex is MidtransException or HttpRequestException or TaskCanceledException) { }
    }

    private async Task<JsonElement> SendAsync(HttpMethod method, string path, object? body = null)
    {
        using var req = new HttpRequestMessage(method, path);

        if (body is not null)
            req.Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

        using var res = await http.SendAsync(req);
        var text = await res.Content.ReadAsStringAsync();

        try
        {
            using var doc = JsonDocument.Parse(text);
            return doc.RootElement.Clone();
        }
        catch (JsonException)
        {
            throw new MidtransException($"Respons Midtrans tidak valid (HTTP {(int)res.StatusCode}).");
        }
    }

    // Membaca nilai teks atau angka dari JSON sebagai string (Midtrans mengirim gross_amount sebagai teks)
    public static string? Str(JsonElement e, string name)
    {
        if (e.ValueKind != JsonValueKind.Object || !e.TryGetProperty(name, out var v)) return null;

        return v.ValueKind switch
        {
            JsonValueKind.String => v.GetString(),
            JsonValueKind.Number => v.GetRawText(),
            _ => null,
        };
    }
}