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
    public const int CurrentSpecVersion = 4;

    /// <summary>Below this elevation, a cell is Ocean. Also hardcoded on
    /// the frontend for contour extraction - see MapCanvas.tsx.</summary>
    private const double OceanThreshold = 0.3;

    private const Biome LandBiome = Biome.Grassland;

    /// <summary>Radius bands (as a fraction of grid width) for the big base grains that establish each landmass - roughly chickpea/lentil scale.</summary>
    private static readonly double[] BaseGrainRadiusFractions = [0.06, 0.10, 0.16];

    /// <summary>
    /// Radius bands for the fine detail grains scattered along each base
    /// grain's rim - true grain-of-rice-on-a-sheet-of-paper scale relative
    /// to the grid, an order of magnitude smaller than the base grains.
    /// Alone they'd be too small and sparse to ever merge into a
    /// landmass, but layered onto the base grains' edges they rough up an
    /// otherwise-smooth circle into the gulfs/capes/inlets a real
    /// coastline has - see design.md.
    /// </summary>
    private static readonly double[] DetailGrainRadiusFractions = [0.008, 0.014, 0.020];

    public static Map Generate(string seed, GridType gridType, SizePreset sizePreset)
    {
        var (width, height) = sizePreset.Dimensions();
        var rng = new Rng(seed);

        var (minBase, maxBase) = sizePreset.BaseGrainCountRange();
        var baseCount = rng.Child("base-grain-count").Int(minBase, maxBase);
        var baseGrains = PlaceBaseGrains(rng.Child("base-grains"), baseCount, width, height);

        var (minDetail, maxDetail) = sizePreset.DetailGrainCountRange();
        var detailCount = rng.Child("detail-grain-count").Int(minDetail, maxDetail);
        var detailGrains = PlaceDetailGrains(rng.Child("detail-grains"), detailCount, baseGrains, width);

        var grains = new List<Grain>(baseGrains.Count + detailGrains.Count);
        grains.AddRange(baseGrains);
        grains.AddRange(detailGrains);

        var elevation = new double[width * height];
        // Splat each grain only over its own bounding box rather than
        // scanning every cell against every grain - at hundreds of tiny
        // grains, a naive width*height*grainCount scan gets slow, while
        // this stays proportional to each grain's (small) footprint.
        foreach (var grain in grains)
        {
            var minX = Math.Max(0, (int)Math.Floor(grain.X - grain.Radius));
            var maxX = Math.Min(width - 1, (int)Math.Ceiling(grain.X + grain.Radius));
            var minY = Math.Max(0, (int)Math.Floor(grain.Y - grain.Radius));
            var maxY = Math.Min(height - 1, (int)Math.Ceiling(grain.Y + grain.Radius));

            for (var y = minY; y <= maxY; y++)
            {
                for (var x = minX; x <= maxX; x++)
                {
                    var dx = x - grain.X;
                    var dy = y - grain.Y;
                    var distance = Math.Sqrt((dx * dx) + (dy * dy));
                    var falloff = Math.Clamp(1 - (distance / grain.Radius), 0, 1);
                    var index = (y * width) + x;
                    if (falloff > elevation[index])
                    {
                        elevation[index] = falloff;
                    }
                }
            }
        }

        var cells = new List<Cell>(width * height);
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var e = elevation[(y * width) + x];
                var biome = e >= OceanThreshold ? LandBiome : Biome.Ocean;
                cells.Add(new Cell { X = x, Y = y, Biome = biome, Elevation = e });
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

    private static List<Grain> PlaceBaseGrains(Rng rng, int count, int width, int height)
    {
        var grains = new List<Grain>(count);
        for (var i = 0; i < count; i++)
        {
            var x = rng.Float() * width;
            var y = rng.Float() * height;
            var fraction = rng.Pick(BaseGrainRadiusFractions);
            var radius = fraction * width;
            grains.Add(new Grain(x, y, radius));
        }

        return grains;
    }

    /// <summary>
    /// Scatters each detail grain near the rim of a random base grain
    /// (0.5x-1.4x its radius out from the center), rather than uniformly
    /// across the whole grid, so the fine texture lands where a coastline
    /// actually is instead of producing unrelated confetti islands far
    /// from any landmass.
    /// </summary>
    private static List<Grain> PlaceDetailGrains(Rng rng, int count, List<Grain> baseGrains, int width)
    {
        var grains = new List<Grain>(count);
        for (var i = 0; i < count; i++)
        {
            var anchor = rng.Pick(baseGrains);
            var angle = rng.Float() * Math.Tau;
            var distance = anchor.Radius * (0.5 + (rng.Float() * 0.9));
            var x = anchor.X + (Math.Cos(angle) * distance);
            var y = anchor.Y + (Math.Sin(angle) * distance);
            var fraction = rng.Pick(DetailGrainRadiusFractions);
            var radius = fraction * width;
            grains.Add(new Grain(x, y, radius));
        }

        return grains;
    }
}
