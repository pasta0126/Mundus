using System.Text;
using System.Text.RegularExpressions;

namespace Mundus.Core;

/// <summary>
/// Turns the text a person typed into the canonical seed every planet and
/// system is generated from, so "Kepler 4", "  kepler   4 " and "KEPLER 4"
/// are the same seed. The steps and their order are part of the frozen
/// contract: changing them changes what existing seeds mean. See
/// openspec/changes/add-planets-and-systems/specs/planet-generation/spec.md.
/// </summary>
public static partial class SeedNormalizer
{
    /// <summary>Longest accepted seed, counted after normalization.</summary>
    public const int MaxLength = 64;

    [GeneratedRegex(@"\s+")]
    private static partial Regex Whitespace();

    /// <summary>
    /// Trims, collapses inner whitespace to one space, lower-cases with the
    /// invariant culture, then applies Unicode form C. Returns false for a
    /// seed that is empty afterwards or longer than <see cref="MaxLength"/>.
    /// </summary>
    public static bool TryNormalize(string? raw, out string normalized)
    {
        normalized = string.Empty;
        if (raw is null) return false;

        var result = Whitespace().Replace(raw.Trim(), " ")
            .ToLowerInvariant()
            .Normalize(NormalizationForm.FormC);

        if (result.Length == 0 || result.Length > MaxLength) return false;

        normalized = result;
        return true;
    }

    public static string Normalize(string? raw) =>
        TryNormalize(raw, out var normalized)
            ? normalized
            : throw new ArgumentException(
                $"seed must be 1-{MaxLength} characters after trimming", nameof(raw));

    /// <summary>
    /// The seed as the person wrote it, minus stray whitespace: what a
    /// planet displays as its name. Never used to generate anything.
    /// </summary>
    public static string DisplayName(string raw) =>
        Whitespace().Replace(raw.Trim(), " ").Normalize(NormalizationForm.FormC);
}
