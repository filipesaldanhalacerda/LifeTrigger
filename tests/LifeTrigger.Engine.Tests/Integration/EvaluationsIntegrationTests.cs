using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace LifeTrigger.Engine.Tests.Integration;

public class EvaluationsIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public EvaluationsIntegrationTests(WebApplicationFactory<Program> factory)
    {
        var factoryWithInMemory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseEnvironment("Testing");
            builder.ConfigureServices(services =>
            {
                var descriptors = services.Where(d => 
                    d.ServiceType.Name.Contains("DbContextOptions") || 
                    d.ServiceType.Name.Contains("DbConnection") ||
                    d.ServiceType == typeof(LifeTrigger.Engine.Infrastructure.Data.AppDbContext)
                ).ToList();
                
                foreach (var descriptor in descriptors)
                {
                    services.Remove(descriptor);
                }

                services.AddDbContext<LifeTrigger.Engine.Infrastructure.Data.AppDbContext>(options => 
                    options.UseInMemoryDatabase("IntegrationTestDb"));
            });
        });

        _client = factoryWithInMemory.CreateClient();

        // Generate and inject a valid Mock JWT Token for all requests in this test class
        var token = GenerateTestToken("A1A1A1A1-A1A1-A1A1-A1A1-A1A1A1A1A1A1");
        _client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var scope = factoryWithInMemory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<LifeTrigger.Engine.Infrastructure.Data.AppDbContext>();
        db.Database.EnsureCreated();
    }

    private string GenerateTestToken(string tenantId)
    {
        // Must match the fallback in Program.cs since WebApplicationFactory reads it early
        var securityKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("SuperSecretKeyForLocalDevelopmentDoNotUseInProd1234!"));
        var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

        var claims = new[] { new Claim("tenantId", tenantId) };

        var token = new System.IdentityModel.Tokens.Jwt.JwtSecurityToken(
            issuer: "LifeTrigger.LocalAuth",
            audience: "LifeTrigger.Engine",
            claims: claims,
            expires: DateTime.Now.AddHours(1),
            signingCredentials: credentials);

        return new System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler().WriteToken(token);
    }

    [Fact]
    public async Task PostEvaluation_WithoutConsent_Returns422UnprocessableEntity_WithConsentRequiredCode()
    {
        // Assemble
        var payload = new
        {
            personalContext = new { age = 30, maritalStatus = "SOLTEIRO", riskLevel = "BAIXO", isSmoker = false },
            familyContext = new { dependentsCount = 0, dependentsAges = Array.Empty<int>() },
            financialContext = new { monthlyIncome = new { exactValue = 10000 }, debts = new { totalAmount = 0, remainingTermMonths = 0 } },
            operationalData = new { lastReviewDate = (DateTimeOffset?)null, originChannel = "APP", hasExplicitActiveConsent = false, consentId = "consent-123" }
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/v1/evaluations", payload);
        var content = await response.Content.ReadAsStringAsync();

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        content.Should().Contain("CONSENT_REQUIRED");
    }

    [Fact]
    public async Task PostEvaluation_WithIdempotencyKey_ReturnsSameResponseMultipleTimes()
    {
        // Assemble
        var payload = new
        {
            personalContext = new { age = 30, maritalStatus = "SOLTEIRO", riskLevel = "BAIXO", isSmoker = false },
            familyContext = new { dependentsCount = 0, dependentsAges = Array.Empty<int>() },
            financialContext = new { monthlyIncome = new { exactValue = 10000 }, debts = new { totalAmount = 0, remainingTermMonths = 0 } },
            operationalData = new { lastReviewDate = (DateTimeOffset?)null, originChannel = "APP", hasExplicitActiveConsent = true, consentId = "consent-123" }
        };

        var request1 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/evaluations");
        request1.Content = JsonContent.Create(payload);
        request1.Headers.Add("Idempotency-Key", "test-idem-123");

        var request2 = new HttpRequestMessage(HttpMethod.Post, "/api/v1/evaluations");
        request2.Content = JsonContent.Create(payload);
        request2.Headers.Add("Idempotency-Key", "test-idem-123");

        // Act
        var response1 = await _client.SendAsync(request1);
        var response2 = await _client.SendAsync(request2);

        // Assert
        response1.StatusCode.Should().Be(HttpStatusCode.OK);
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        var content1 = await response1.Content.ReadAsStringAsync();
        var content2 = await response2.Content.ReadAsStringAsync();

        content1.Should().Be(content2, "Idempotency mandates exact same JSON response for repeated keys.");
    }
}
