namespace Mundus.Core;

public sealed record Compass
{
    public required string Seed { get; init; }
    public required double BearingDegrees { get; init; }
}

/// <summary>
/// Derives the fixed north bearing for a seed: a single value, not a
/// spatial field, so it never depends on which window/coordinate/step is
/// being viewed - only on the seed itself. See
/// openspec/changes/add-map-overlays/specs/compass-rose/spec.md.
/// </summary>
public static class CompassGenerator
{
    public static Compass Generate(string seed)
    {
        var bearing = new Rng(seed).Child("north-bearing").Float() * 360;
        return new Compass { Seed = seed, BearingDegrees = bearing };
    }
}
