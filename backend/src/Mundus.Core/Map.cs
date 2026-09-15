namespace Mundus.Core;

public sealed record Cell
{
    public required int X { get; init; }
    public required int Y { get; init; }
    public required Biome Biome { get; init; }
    public required double Elevation { get; init; }
}

public sealed record Map
{
    public required int SpecVersion { get; init; }
    public required string Seed { get; init; }
    public required GridType GridType { get; init; }
    public required SizePreset SizePreset { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required IReadOnlyList<Cell> Cells { get; init; }
}

/// <summary>
/// Generates a deterministic <see cref="Map"/> silhouette using the
/// classic "scatter grains on paper, trace around them" worldbuilding
/// technique: a handful of circular "grains" of varying size (evoking
/// rice/lentils/chickpeas) are scattered across the grid; a cell is land
/// if it falls within any grain's radius, so overlapping grains merge
/// into one landmass "for free". See specs/map-generation/spec.md and
/// this change's design.md. Biome variety, elevation texture, and shape
/// archetypes are deliberately not part of this generator yet - see
/// design.md Non-Goals.
/// </summary>
public static class MapGenerator
{
    public const int CurrentSpecVersion = 3;

    /// <summary>Below this elevation, a cell is Ocean. Also hardcoded on
    /// the frontend for contour extraction - see MapCanvas.tsx.</summary>
    private const double OceanThreshold = 0.3;

    private const Biome LandBiome = Biome.Grassland;

    /// <summary>Grain radius bands as a fraction of grid width, roughly evoking rice/lentil/chickpea.</summary>
    private static readonly double[] GrainRadiusFractions = [0.06, 0.10, 0.16];

    public static Map Generate(string seed, GridType gridType, SizePreset sizePreset)
    {
        var (width, height) = sizePreset.Dimensions();
        var rng = new Rng(seed);

        var (minGrains, maxGrains) = sizePreset.GrainCountRange();
        var grainCount = rng.Child("grain-count").Int(minGrains, maxGrains);
        var grains = PlaceGrains(rng.Child("grains"), grainCount, width, height);

        var cells = new List<Cell>(width * height);
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var elevation = ElevationAt(x, y, grains);
                var biome = elevation >= OceanThreshold ? LandBiome : Biome.Ocean;
                cells.Add(new Cell { X = x, Y = y, Biome = biome, Elevation = elevation });
            }
        }

        return new Map
        {
            SpecVersion = CurrentSpecVersion,
            Seed = seed,
            GridType = gridType,
            SizePreset = sizePreset,
            Width = width,
            Height = height,
            Cells = cells,
        };
    }

    private readonly record struct Grain(double X, double Y, double Radius);

    private static List<Grain> PlaceGrains(Rng rng, int count, int width, int height)
    {
        var grains = new List<Grain>(count);
        for (var i = 0; i < count; i++)
        {
            var x = rng.Float() * width;
            var y = rng.Float() * height;
            var fraction = rng.Pick(GrainRadiusFractions);
            var radius = fraction * width;
            grains.Add(new Grain(x, y, radius));
        }

        return grains;
    }

    /// <summary>
    /// "Metaball"-style union: the max, over all grains, of a radial
    /// falloff from that grain's center. Overlapping grains merge into
    /// one landmass; the result is a smooth field suitable for both
    /// hillshading and the frontend's marching-squares contour
    /// extraction, not just a hard land/ocean boolean.
    /// </summary>
    private static double ElevationAt(int x, int y, List<Grain> grains)
    {
        var max = 0.0;
        foreach (var grain in grains)
        {
            var dx = x - grain.X;
            var dy = y - grain.Y;
            var distance = Math.Sqrt((dx * dx) + (dy * dy));
            var falloff = Math.Clamp(1 - (distance / grain.Radius), 0, 1);
            if (falloff > max)
            {
                max = falloff;
            }
        }

        return max;
    }
}
