using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Mundus.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

// DATABASE_URL is a standard postgres:// URI (matches the platform's
// convention on void-server); Npgsql needs a keyword/value connection
// string, so translate it rather than hardcoding either format.
var databaseUrl = builder.Configuration["DATABASE_URL"];
if (!string.IsNullOrEmpty(databaseUrl))
{
    builder.Services.AddDbContext<MundusDbContext>(options =>
        options.UseNpgsql(ConnectionStringFromUrl(databaseUrl)));
}

var app = builder.Build();

app.MapOpenApi("/api/openapi/{documentName}.json");

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();

static string ConnectionStringFromUrl(string url)
{
    var uri = new Uri(url);
    var userInfo = uri.UserInfo.Split(':', 2);
    var builder = new Npgsql.NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Username = userInfo[0],
        Password = userInfo.Length > 1 ? userInfo[1] : string.Empty,
        Database = uri.AbsolutePath.TrimStart('/'),
    };
    return builder.ConnectionString;
}
