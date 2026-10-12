using System.Text.Json.Serialization;
using Mundus.Api.Feedback;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddHttpClient();
builder.Services.Configure<FeedbackOptions>(builder.Configuration.GetSection("Feedback"));
// The OpenAPI document generator reads Http.Json.JsonOptions, a separate
// options type from Mvc.JsonOptions above - without this, the generated
// schema (and any client generated from it) says enums are numbers even
// though the actual response bodies serialize them as strings.
builder.Services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(
    options => options.SerializerOptions.Converters.Add(new JsonStringEnumConverter()));
builder.Services.AddOpenApi();

var app = builder.Build();

app.MapOpenApi("/api/openapi/{documentName}.json");

// No UseHttpsRedirection(): Traefik terminates TLS at the edge and this
// container only ever receives plain HTTP from nginx's internal /api/
// proxy - redirecting here would just break that internal call.
app.UseAuthorization();
app.MapControllers();

app.Run();
