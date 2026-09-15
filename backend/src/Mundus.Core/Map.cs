namespace Mundus.Core;

public sealed record Cell
{
    public required int X { get; init; }
    public required int Y { get; init; }
    public required Biome Biome { get; init; }
}

public sealed record Map
{
    public required int SpecVersion { get; init; }
    public required string Seed { get; init; }
    public required int OriginX { get; init; }
    public required int OriginY { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required IReadOnlyList<Cell> Cells { get; init; }
}

/// <summary>
/// Generates terrain for an unbounded, explorable world: a cell's biome
/// at any coordinate depends only on the seed and that cell's own
/// `(x, y)` - never on which other cells were requested before it, or
/// where it sits within the requested window - so panning into
/// unexplored territory never changes previously-seen terrain, and a
/// window far from the origin generates exactly as if it were the only
/// request ever made. See openspec/specs/map-generation/spec.md.
/// </summary>
public static class MapGenerator
{
    public const int CurrentSpecVersion = 5;

    /// <summary>Per-request window bound (each axis), matching the old "Huge" preset's proven-fast cost.</summary>
    public const int MaxWindowDimension = 256;

    /// <summary>Cells per lattice unit for the terrain noise - roughly how large a biome region reads as.</summary>
    private const int RegionScale = 32;

    /// <summary>
    /// Ascending thresholds mapping a [0, 1) terrain value to a
    /// <see cref="Biome"/> band, in <see cref="Biome"/>'s declared order.
    /// A value below a band's threshold falls in the band before it (the
    /// first band, Ocean, has no lower bound).
    /// </summary>
    private static readonly (Biome Biome, double UpperBound)[] BiomeBands =
    [
        (Biome.Ocean, 0.35),
        (Biome.Beach, 0.40),
        (Biome.Grassland, 0.62),
        (Biome.Forest, 0.78),
        (Biome.Tundra, 0.90),
        (Biome.Snow, double.PositiveInfinity),
    ];

    public static Map Generate(string seed, int originX, int originY, int width, int height)
    {
        if (width < 1 || width > MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(width), $"width must be between 1 and {MaxWindowDimension}");
        }

        if (height < 1 || height > MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(height), $"height must be between 1 and {MaxWindowDimension}");
        }

        var noise = new InfiniteValueNoise2D(seed, RegionScale);
        var cells = new List<Cell>(width * height);
        for (var y = originY; y < originY + height; y++)
        {
            for (var x = originX; x < originX + width; x++)
            {
                var value = noise.Sample(x, y);
                cells.Add(new Cell { X = x, Y = y, Biome = BiomeAt(value) });
            }
        }

        return new Map
        {
            SpecVersion = CurrentSpecVersion,
            Seed = seed,
            OriginX = originX,
            OriginY = originY,
            Width = width,
            Height = height,
            Cells = cells,
        };
    }

    /// <summary>Sample the raw [0, 1) terrain value at a coordinate, independent of any window - exposed for testing neighbor smoothness.</summary>
    public static double TerrainValueAt(string seed, int x, int y) => new InfiniteValueNoise2D(seed, RegionScale).Sample(x, y);

    private static Biome BiomeAt(double value)
    {
        foreach (var (biome, upperBound) in BiomeBands)
        {
            if (value < upperBound)
            {
                return biome;
            }
        }

        return BiomeBands[^1].Biome;
    }
}
