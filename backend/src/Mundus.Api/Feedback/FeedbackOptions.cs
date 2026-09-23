namespace Mundus.Api.Feedback;

/// <summary>
/// Bound from the "Feedback" configuration section (env vars
/// Feedback__DiscordWebhookUrl / Feedback__GitHubToken / Feedback__GitHubRepo).
/// A sink with a missing value is simply skipped, not an error.
/// </summary>
public sealed class FeedbackOptions
{
    public string? DiscordWebhookUrl { get; set; }

    public string? GitHubToken { get; set; }

    /// <summary>"owner/repo", e.g. "pasta0126/Mundus".</summary>
    public string? GitHubRepo { get; set; }
}
