namespace Mamnungs.Api.Models;

public record CategoryDto(int Id, string Name, int ProductsCount);

public record ProductDto(
    int Id, int CategoryId, string CategoryName, string Name,
    string? Description, int Price, string? Image, bool IsAvailable);

public record PagedResult<T>(List<T> Items, int Total, int Page, int PageSize, int TotalPages);