using System.IO;
using System.Reflection;
using System.Text.Json.Serialization;
using LifeTrigger.Engine.Application;
using LifeTrigger.Engine.Infrastructure;
using LifeTrigger.Engine.Api.Middleware;
using LifeTrigger.Engine.Infrastructure.Seeding;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Serialize enums as string
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });
    
builder.Services.AddMemoryCache();

// Custom Application Services
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddApplication();
builder.Services.AddInfrastructure(connectionString!);

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
    DemoDataSeeder.SeedDemoTenants(app.Services);
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();

public partial class Program { }
