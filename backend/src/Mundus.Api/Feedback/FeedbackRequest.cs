namespace Mundus.Api.Feedback;

public sealed record FeedbackRequest(FeedbackKind Kind, string Message, string? Name);
