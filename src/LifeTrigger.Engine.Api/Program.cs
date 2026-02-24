using System.Text.Json.Serialization;
using LifeTrigger.Engine.Application;
using LifeTrigger.Engine.Infrastructure;
using LifeTrigger.Engine.Api.Middleware;
using LifeTrigger.Engine.Infrastructure.Seeding;

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
builder.Services.AddApplication();
builder.Services.AddInfrastructure();

// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "LifeTrigger.Engine.Api", Version = "v1" });
});

var app = builder.Build();

app.UseCustomExceptionHandler();

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
