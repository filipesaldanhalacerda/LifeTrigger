using System.Text;
using System.Threading.RateLimiting;
using LifeTrigger.Auth.Api.Middleware;
using LifeTrigger.Auth.Application;
using LifeTrigger.Auth.Infrastructure;
using LifeTrigger.Auth.Infrastructure.Data;
using LifeTrigger.Auth.Infrastructure.Seeding;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ─── JWT Authentication ───────────────────────────────────────────────────────
var jwtSecret = builder.Configuration["JwtConfig:Secret"]
    ?? throw new InvalidOperationException("JwtConfig:Secret not configured.");

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Disable default claim type remapping so "role" stays as "role" (not ClaimTypes.Role URL).
        // Required for RoleClaimType = "role" and policy RequireRole() to work correctly.
        options.MapInboundClaims = false;
        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer           = false,
            ValidateAudience         = false,
            ClockSkew                = TimeSpan.FromMinutes(1),
            RoleClaimType            = "role",
            NameClaimType            = "sub",
        };
    });

// ─── Authorization Policies ───────────────────────────────────────────────────
// Cumulative hierarchy: each policy includes all roles above it.
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SuperAdmin",  p => p.RequireRole("SuperAdmin"));
    options.AddPolicy("TenantOwner", p => p.RequireRole("SuperAdmin", "TenantOwner"));
    options.AddPolicy("Manager",     p => p.RequireRole("SuperAdmin", "TenantOwner", "Manager"));
    options.AddPolicy("Broker",      p => p.RequireRole("SuperAdmin", "TenantOwner", "Manager", "Broker"));
    options.AddPolicy("Viewer",      p => p.RequireAuthenticatedUser());
});

// ─── Rate Limiting ────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("login", o =>
    {
        o.Window               = TimeSpan.FromMinutes(1);
        o.PermitLimit          = 10;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit           = 0;
    });
    options.AddFixedWindowLimiter("api", o =>
    {
        o.Window               = TimeSpan.FromMinutes(1);
        o.PermitLimit          = 120;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit           = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// ─── Application & Infrastructure ────────────────────────────────────────────
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

// ─── Controllers & Swagger ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "LifeTrigger Auth API",
        Version     = "v1",
        Description = "Enterprise identity layer — user management, tenant control, JWT issuance",
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name         = "Authorization",
        In           = ParameterLocation.Header,
        Type         = SecuritySchemeType.Http,
        Scheme       = "bearer",
        BearerFormat = "JWT",
        Description  = "Insira: Bearer {token}",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        [new OpenApiSecurityScheme
        {
            Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
        }] = Array.Empty<string>()
    });
});

// ─── CORS ─────────────────────────────────────────────────────────────────────
builder.Services.AddCors(options =>
{
    var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
        ?? ["http://localhost:5173", "https://localhost:5173"];

    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// ─── Migrations & Seeding ─────────────────────────────────────────────────────
// Wrapped in try-catch so the API can start even if DB is temporarily unavailable.
// Migrations are skipped when already applied (idempotent); seeder uses ON CONFLICT guards.
if (!app.Environment.IsEnvironment("Testing"))
{
    using var scope = app.Services.CreateScope();
    var db          = scope.ServiceProvider.GetRequiredService<AuthDbContext>();
    var startLogger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    try
    {
        await db.Database.MigrateAsync();

        // Always seed demo users — this is a demo/showcase deployment
        await DemoDataSeeder.SeedAsync(db, startLogger);
    }
    catch (Exception ex)
    {
        startLogger.LogWarning(ex,
            "Could not connect to database on startup. " +
            "The API will still start — requests will fail until the DB is reachable. " +
            "Check ConnectionStrings:DefaultConnection in appsettings.");
    }
}

// ─── Middleware pipeline ──────────────────────────────────────────────────────
app.UseMiddleware<ExceptionHandlerMiddleware>();
app.UseCorrelationId();
app.UseCors();
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeTrigger Auth API v1"));
}

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapGet("/health", () => Results.Ok("healthy"));

app.Run();
