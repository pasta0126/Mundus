using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Mundus.Api.Feedback;

namespace Mundus.Api.Controllers;

/// <summary>
/// Relays visitor comments to Discord and bugs/feature requests to GitHub Issues. Nothing submitted
/// here is ever persisted server-side - see the `feedback` spec.
/// </summary>
[ApiController]
[Route("api/[controller]")]
public sealed class FeedbackController : ControllerBase
{
    private const int MaxMessageLength = 4000;

    private readonly IHttpClientFactory _httpClientFactory;
    private readonly FeedbackOptions _options;
    private readonly ILogger<FeedbackController> _logger;

    public FeedbackController(IHttpClientFactory httpClientFactory, IOptions<FeedbackOptions> options, ILogger<FeedbackController> logger)
    {
        _httpClientFactory = httpClientFactory;
        _options = options.Value;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Post([FromBody] FeedbackRequest request, CancellationToken cancellationToken)
    {
        var message = request.Message.Trim();
        if (string.IsNullOrEmpty(message) || message.Length > MaxMessageLength)
        {
            return BadRequest($"message is required and must be at most {MaxMessageLength} characters.");
        }

        var name = string.IsNullOrWhiteSpace(request.Name) ? null : request.Name.Trim();

        // Conversation goes to Discord; bugs and feature requests are tracked as GitHub Issues.
        var relayed = request.Kind == FeedbackKind.Comment
            ? await TryPostToDiscordAsync(request.Kind, message, name, cancellationToken)
            : await TryCreateGitHubIssueAsync(request.Kind, message, name, cancellationToken);

        if (!relayed)
        {
            return StatusCode(StatusCodes.Status502BadGateway, "Failed to relay feedback.");
        }

        return Ok();
    }

    private async Task<bool> TryPostToDiscordAsync(FeedbackKind kind, string message, string? name, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(_options.DiscordWebhookUrl))
        {
            return false;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            var content = $"**{kind}**{(name is null ? "" : $" from {name}")}\n{message}";
            var response = await client.PostAsJsonAsync(_options.DiscordWebhookUrl, new { content }, cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Failed to post feedback to Discord.");
            return false;
        }
    }

    private async Task<bool> TryCreateGitHubIssueAsync(FeedbackKind kind, string message, string? name, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(_options.GitHubToken) || string.IsNullOrEmpty(_options.GitHubRepo))
        {
            return false;
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.UserAgent.ParseAdd("Mundus-Feedback");
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", _options.GitHubToken);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));

            var titleBody = message.Length > 60 ? message[..60] + "…" : message;
            var title = $"[{kind}] {titleBody}";
            var body = name is null ? message : $"{message}\n\n— submitted by {name}";
            var labels = kind switch
            {
                FeedbackKind.Bug => new[] { "bug" },
                FeedbackKind.Feature => new[] { "enhancement" },
                _ => Array.Empty<string>(),
            };

            var response = await client.PostAsJsonAsync(
                $"https://api.github.com/repos/{_options.GitHubRepo}/issues",
                new { title, body, labels },
                cancellationToken);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException)
        {
            _logger.LogWarning(ex, "Failed to create GitHub issue for feedback.");
            return false;
        }
    }
}
