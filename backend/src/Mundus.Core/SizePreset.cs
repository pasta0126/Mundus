namespace Mundus.Core;

public enum SizePreset
{
    Small,
    Medium,
    Large,
    Huge,
}

/// <summary>
/// Fixed dimensions and biome-region-count ranges per preset - see
/// specs/map-generation/spec.md ("Fixed size presets", "Biome regions,
/// not per-cell biome"). Changing these values changes what an existing
/// seed generates - treat as a breaking change to Map.SpecVersion.
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

    public static (int Min, int Max) RegionCountRange(this SizePreset preset) => preset switch
    {
        SizePreset.Small => (1, 3),
        SizePreset.Medium => (3, 6),
        SizePreset.Large => (6, 12),
        SizePreset.Huge => (10, 20),
        _ => throw new ArgumentOutOfRangeException(nameof(preset)),
    };
}
