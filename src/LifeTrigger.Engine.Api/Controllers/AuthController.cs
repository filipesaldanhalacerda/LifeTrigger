using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace LifeTrigger.Engine.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[AllowAnonymous] // Garante que este endpoint sempre seja público
public class AuthController : ControllerBase
{
    private readonly IConfiguration _configuration;

    public AuthController(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    /// <summary>
    /// Mock Endpoint (Apenas Desenvolvimento): Gera um JWT válido contendo o TenantId especificado.
    /// </summary>
    [HttpPost("mock-token")]
    public IActionResult GenerateMockToken([FromBody] MockTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TenantId))
        {
            return BadRequest(new { Error = "TenantId is required" });
        }

        var secret = _configuration["JwtConfig:Secret"];
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
        {
            return StatusCode(500, new { Error = "Server JWT Secret is missing or too short (needs 256 bits)." });
        }

        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        // Claims: tenantId, role (defaults to Broker for dev testing), and jti
        var claims = new[]
        {
            new Claim("tenantId", request.TenantId),
            new Claim("role", string.IsNullOrWhiteSpace(request.Role) ? "Broker" : request.Role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N")),
        };

        var token = new JwtSecurityToken(
            issuer: "LifeTrigger.LocalAuth",
            audience: "LifeTrigger.Engine",
            claims: claims,
            expires: DateTime.Now.AddHours(8),
            signingCredentials: credentials);

        return Ok(new
        {
            Token = new JwtSecurityTokenHandler().WriteToken(token),
            Expiration = token.ValidTo
        });
    }
}

public class MockTokenRequest
{
    public string TenantId { get; set; } = string.Empty;

    /// <summary>Role to embed in the token. Defaults to "Broker" if empty.</summary>
    public string? Role { get; set; }
}
