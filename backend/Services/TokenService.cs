using System.Security.Claims;
using System.Text;
using Mamnungs.Api.Models;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Mamnungs.Api.Services;

public class TokenService(IConfiguration config)
{
    public (string Token, DateTime ExpiresAt) Create(User user)
    {
        var jwt = config.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
        var expires = DateTime.UtcNow.AddMinutes(int.Parse(jwt["ExpireMinutes"] ?? "480"));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(
            [
                new Claim("sub", user.Id.ToString()),
                new Claim("name", user.Name),
                new Claim("role", user.Role),
            ]),
            Expires = expires,
            Issuer = jwt["Issuer"],
            Audience = jwt["Audience"],
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256),
        };

        return (new JsonWebTokenHandler().CreateToken(descriptor), expires);
    }
}