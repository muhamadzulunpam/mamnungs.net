namespace Mamnungs.Api.Models;

public record CategoryDto(int Id, string Name, int ProductsCount);

public record ProductDto(
    int Id, int CategoryId, string CategoryName, string Name,
    string? Description, int Price, string? Image, bool IsAvailable);

public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize, int TotalPages);

public record PosCategoryDto(int Id, string Name);

public record PosProductDto(int Id, int CategoryId, string Name, int Price, string? Image);

public record CheckoutResult(
    int OrderId, string InvoiceNumber, int Total, string PaymentMethod, string Status,
    int? AmountReceived, int? Change, DateTime CreatedAt);

public record PaymentInfoDto(
    int OrderId, string InvoiceNumber, int Total, string Status,
    string? QrUrl, DateTime? ExpiresAt, bool IsSandbox);
    
public record OrderListDto(
    int Id, string InvoiceNumber, DateTime CreatedAt, string CashierName,
    string PaymentMethod, int Total, string Status);

public record OrderSummaryDto(int Count, int Total);

public record PagedOrders(
    List<OrderListDto> Items, int Total, int Page, int PageSize, int TotalPages, OrderSummaryDto Summary);

public record StoreDto(string Name, string Address);

public record ReceiptItemDto(string Name, int Price, int Quantity, int Subtotal);

public record ReceiptDto(
    int Id, string InvoiceNumber, DateTime CreatedAt, string CashierName,
    string PaymentMethod, string Status, int Subtotal, int Discount, int Total,
    int? AmountReceived, int? ChangeAmount, string? Notes,
    List<ReceiptItemDto> Items, StoreDto Store);

public record DashboardStats(
    int Revenue, double? RevenueChange, int Orders, double? OrdersChange,
    int TodayRevenue, int TodayOrders, int Products);

public record DailySalesDto(string Date, int Value);

public record TopProductDto(string Name, int Sold, int Revenue);

public record RecentOrderDto(
    int Id, string Invoice, string Cashier, string Items, int Total, string Status, DateTime CreatedAt);

public record DashboardDto(
    DashboardStats Stats, List<DailySalesDto> Weekly,
    List<TopProductDto> TopProducts, List<RecentOrderDto> RecentOrders);

public record ReportSummary(int Total, int Count, int Average);

public record MethodSalesDto(string Method, int Count, int Total);

public record DailyReportDto(string Date, int Count, int Total);

public record ReportDto(
    string From, string To, ReportSummary Summary, List<MethodSalesDto> ByMethod,
    List<DailyReportDto> Daily, List<TopProductDto> TopProducts);