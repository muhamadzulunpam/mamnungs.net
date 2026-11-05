using System.Security.Claims;

namespace Mamnungs.Api.Helpers;

public static class UserExtensions
{
    public static int Id(this ClaimsPrincipal user) => int.Parse(user.FindFirst("sub")!.Value);
}