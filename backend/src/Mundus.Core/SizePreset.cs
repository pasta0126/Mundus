namespace Mundus.Core;

public enum SizePreset
{
    Small,
    Medium,
    Large,
    Huge,
}

/// <summary>
/// Fixed dimensions per preset - see specs/map-generation/spec.md
/// ("Fixed size presets"). Changing these values changes what an
/// existing seed generates - treat as a breaking change to
/// Map.SpecVersion.
/// </summary>
public static class SizePresetExtensions
{
    public static (int Width, int Height) Dimensions(this SizePreset preset) => preset switch
    {
        SizePreset.Small => (32, 32),
        SizePreset.Medium => (64, 64),
        SizePreset.Large => (128, 128),
        SizePreset.Huge => (256, 256),
        _ => throw new ArgumentOutOfRangeException(nameof(preset)),
    };

    /// <summary>Grain count range for the silhouette generator - see design.md.</summary>
    public static (int Min, int Max) GrainCountRange(this SizePreset preset) => preset switch
    {
        SizePreset.Small => (14, 20),
        SizePreset.Medium => (24, 34),
        SizePreset.Large => (40, 56),
        SizePreset.Huge => (64, 90),
        _ => throw new ArgumentOutOfRangeException(nameof(preset)),
    };
}
