using System.ComponentModel.DataAnnotations;
using Mamnungs.Api.Data;
using Mamnungs.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Mamnungs.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, TokenService tokens) : ControllerBase
{
    public class LoginRequest
    {
        [Required, EmailAddress] public string Email { get; set; } = "";
        [Required] public string Password { get; set; } = "";
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest req)
    {
        var email = req.Email.Trim().ToLower();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == email);

        if (user is null || !user.IsActive || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { message = "Email atau password salah, atau akun dinonaktifkan." });

        var (token, expiresAt) = tokens.Create(user);

        return Ok(new
        {
            token,
            expiresAt,
            user = new { user.Id, user.Name, user.Email, user.Role },
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var id = int.Parse(User.FindFirst("sub")!.Value);
        var user = await db.Users.FindAsync(id);

        return user is null
            ? Unauthorized()
            : Ok(new { user.Id, user.Name, user.Email, user.Role });
    }
}