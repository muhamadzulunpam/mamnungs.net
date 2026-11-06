namespace Mamnungs.Api.Services;

public class MidtransOptions
{
    public string ServerKey { get; set; } = "";
    public string ClientKey { get; set; } = "";
    public bool IsProduction { get; set; }

    public string BaseUrl => IsProduction
        ? "https://api.midtrans.com"
        : "https://api.sandbox.midtrans.com";
}