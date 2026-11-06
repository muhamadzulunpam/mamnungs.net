namespace Mamnungs.Api.Models;

public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "kasir";   // admin | kasir
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Category
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Slug { get; set; } = "";
    public List<Product> Products { get; set; } = [];
}

public class Product
{
    public int Id { get; set; }
    public int CategoryId { get; set; }
    public Category? Category { get; set; }
    public string Name { get; set; } = "";
    public string? Description { get; set; }
    public int Price { get; set; }                 // rupiah, tanpa desimal
    public string? Image { get; set; }
    public bool IsAvailable { get; set; } = true;
    public bool IsDeleted { get; set; }            // soft delete
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Order
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = "";
    public int UserId { get; set; }
    public User? User { get; set; }
    public int Subtotal { get; set; }
    public int Discount { get; set; }
    public int Total { get; set; }
    public string PaymentMethod { get; set; } = "CASH";   // CASH | QRIS
    public string Status { get; set; } = "PENDING";       // PENDING | PAID | CANCELLED | EXPIRED
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<OrderItem> Items { get; set; } = [];
    public Payment? Payment { get; set; }
}

public class OrderItem
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    public int? ProductId { get; set; }
    public Product? Product { get; set; }
    public string ProductName { get; set; } = "";   // salinan nama saat transaksi
    public int Price { get; set; }                  // salinan harga saat transaksi
    public int Quantity { get; set; }
    public int Subtotal { get; set; }
}

public class Payment
{
    public int Id { get; set; }
    public int OrderId { get; set; }
    public Order? Order { get; set; }
    public string PaymentMethod { get; set; } = "CASH";
    public string Provider { get; set; } = "CASH";
    public string? TransactionId { get; set; }
    public int Amount { get; set; }
    public int? AmountReceived { get; set; }
    public int? ChangeAmount { get; set; }
    public string Status { get; set; } = "PENDING";
    public DateTime? PaidAt { get; set; }
    public string? GatewayOrderId { get; set; }
    public string? QrUrl { get; set; }
    public DateTime? ExpiresAt { get; set; }
}