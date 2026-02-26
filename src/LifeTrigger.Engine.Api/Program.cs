using System.IO;
using System.Reflection;
using System.Linq;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Http;
using System.Text.Json.Serialization;
using LifeTrigger.Engine.Application;
using LifeTrigger.Engine.Infrastructure;
using LifeTrigger.Engine.Api.Middleware;
using LifeTrigger.Engine.Infrastructure.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using System.Collections.Generic;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serialize enums as string
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

// Substituir o retorno padrão 400 (RFC 9110) do ASP.NET Core pela tipagem oficial da nossa API
builder.Services.Configure<ApiBehaviorOptions>(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var errors = context.ModelState
            .Where(e => e.Value != null && e.Value.Errors.Count > 0)
            .Select(e => new
            {
                field = e.Key,
                message = e.Value!.Errors.First().ErrorMessage
            })
            .ToArray();

        var result = new
        {
            error_code = "VALIDATION_ERROR",
            message = "Os dados fornecidos (tipos, enums ou formatos) não são válidos e foram rejeitados pela validação de entrada.",
            details = errors
        };

        return new BadRequestObjectResult(result);
    };
});

builder.Services.AddMemoryCache();
builder.Services.AddHealthChecks();

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .WithExposedHeaders("X-Evaluation-Id", "X-Correlation-ID");
    });
});

// Rate Limiting: fixed window 60 req/min por IP nos endpoints de avaliação
builder.Services.AddRateLimiter(options =>
{
    options.AddFixedWindowLimiter("evaluation", o =>
    {
        o.Window = System.TimeSpan.FromMinutes(1);
        o.PermitLimit = 60;
        o.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        o.QueueLimit = 0;
    });
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
});

// Custom Application Services
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddApplication();
builder.Services.AddInfrastructure(connectionString!);

// JWT Authentication Setup
var jwtSecret = builder.Configuration["JwtConfig:Secret"] ?? "SuperSecretKeyForLocalDevelopmentDoNotUseInProd1234!";
var key = Encoding.ASCII.GetBytes(jwtSecret);

builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false, // Simplified for Local Dev
        ValidateAudience = false
    };
});

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new()
    {
        Title = "LifeTrigger.Engine.Api",
        Version = "v1",
        Description = "API de Inteligência para o Motor LifeTrigger. Avaliação de Vida, Proteção e Gaps.",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "LifeTrigger API Suporte",
            Email = "suporte@lifetrigger.example.com"
        }
    });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. \r\n\r\n Enter 'Bearer' [space] and then your token in the text input below.\r\n\r\nExample: \"Bearer 12345abcdef\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement()
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                },
                Scheme = "oauth2",
                Name = "Bearer",
                In = ParameterLocation.Header,
            },
            new List<string>()
        }
    });

    // Injetar comentários XML da API
    var xmlFilename = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    c.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, xmlFilename));

    // Injetar comentários XML do Domain (onde estão os Requests/Responses)
    var domainXmlFilename = "LifeTrigger.Engine.Domain.xml";
    var domainXmlPath = Path.Combine(AppContext.BaseDirectory, domainXmlFilename);
    if (File.Exists(domainXmlPath))
    {
        c.IncludeXmlComments(domainXmlPath);
    }
});

var app = builder.Build();

app.UseCustomExceptionHandler();
app.UseCorrelationId();
app.UseCors();

// Apply EF Core Migrations automatically, but skip during Integration Tests
if (app.Environment.EnvironmentName != "Testing")
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<LifeTrigger.Engine.Infrastructure.Data.AppDbContext>();
        context.Database.Migrate();
    }
    catch (System.Exception ex)
    {
        var logger = services.GetRequiredService<Microsoft.Extensions.Logging.ILogger<Program>>();
        logger.LogError(ex, "An error occurred migrating the DB.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "LifeTrigger.Engine.Api v1"));

    // Auto-seed Demo tenants upon boot
    await DemoDataSeeder.SeedDemoTenantsAsync(app.Services);
}

app.UseHttpsRedirection();
app.UseRateLimiter();

app.UseAuthentication(); // Must be explicitly called before Authorization
app.UseAuthorization();

app.MapControllers();
app.MapHealthChecks("/health");

app.Run();

public partial class Program { }
