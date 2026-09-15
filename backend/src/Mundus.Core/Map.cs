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
    public const int CurrentSpecVersion = 8;

    /// <summary>Per-request window bound (each axis), matching the old "Huge" preset's proven-fast cost.</summary>
    public const int MaxWindowDimension = 512;

    /// <summary>
    /// Elevation's base region scale (cells per lattice unit at its
    /// broadest octave) - large enough that, even zoomed all the way out
    /// (1px/cell, the whole viewport spanning thousands of cells), water
    /// and land read as ocean/continent/archipelago-scale masses instead
    /// of lakes and ponds. See design.md.
    /// </summary>
    private const int ElevationRegionScale = 512;

    /// <summary>
    /// One octave per halving down to region scale 8, matching the
    /// original (pre-continent-scale) finest octave - so raising the
    /// base scale for bigger continents doesn't also erase the
    /// small-scale coastline/island raggedness that scale gave.
    /// </summary>
    private const int ElevationOctaves = 7;

    /// <summary>Moisture's base region scale - broad climate zones, independent of elevation's.</summary>
    private const int MoistureRegionScale = 96;

    private const int MoistureOctaves = 4;

    private const double NoisePersistence = 0.5;

    /// <summary>Ascending elevation thresholds. A value below a band's threshold falls in the band before it (the lowest, Ocean, has no lower bound).</summary>
    private static readonly (string Band, double UpperBound)[] ElevationBands =
    [
        ("Ocean", 0.42),
        ("Beach", 0.46),
        ("Lowland", 0.68),
        ("Highland", 0.85),
        ("Peak", double.PositiveInfinity),
    ];

    /// <summary>Ascending moisture thresholds: dry, medium, wet.</summary>
    private static readonly (string Band, double UpperBound)[] MoistureBands =
    [
        ("Dry", 0.35),
        ("Medium", 0.65),
        ("Wet", double.PositiveInfinity),
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

        var elevationNoise = ElevationNoise(seed);
        var moistureNoise = MoistureNoise(seed);
        var cells = new List<Cell>(width * height);
        for (var y = originY; y < originY + height; y++)
        {
            for (var x = originX; x < originX + width; x++)
            {
                var elevation = elevationNoise.Sample(x, y);
                var moisture = moistureNoise.Sample(x, y);
                cells.Add(new Cell { X = x, Y = y, Biome = BiomeAt(elevation, moisture) });
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

    /// <summary>Sample the raw [0, 1) elevation value at a coordinate, independent of any window - exposed for testing neighbor smoothness.</summary>
    public static double ElevationAt(string seed, int x, int y) => ElevationNoise(seed).Sample(x, y);

    /// <summary>Sample the raw [0, 1) moisture value at a coordinate, independent of any window - exposed for testing neighbor smoothness.</summary>
    public static double MoistureAt(string seed, int x, int y) => MoistureNoise(seed).Sample(x, y);

    private static InfiniteValueNoise2D ElevationNoise(string seed) =>
        new(seed, ElevationRegionScale, ElevationOctaves, NoisePersistence);

    // Suffixing the parent seed (rather than an unrelated string) keeps
    // moisture anchored to the same seed while guaranteeing independence
    // from elevation - a different seed string produces entirely
    // different lattice hashes, so the two fields never correlate.
    private static InfiniteValueNoise2D MoistureNoise(string seed) =>
        new($"{seed}:moisture", MoistureRegionScale, MoistureOctaves, NoisePersistence);

    private static Biome BiomeAt(double elevation, double moisture)
    {
        var elevationBand = BandOf(elevation, ElevationBands);
        var moistureBand = BandOf(moisture, MoistureBands);

        return elevationBand switch
        {
            "Ocean" => Biome.Ocean,
            "Beach" => Biome.Beach,
            "Peak" => moistureBand == "Wet" ? Biome.Snow : Biome.Mountains,
            "Lowland" => moistureBand switch
            {
                "Dry" => Biome.Desert,
                "Medium" => Biome.Grassland,
                _ => Biome.Swamp,
            },
            // "Highland"
            _ => moistureBand switch
            {
                "Dry" => Biome.Tundra,
                "Medium" => Biome.Forest,
                _ => Biome.Rainforest,
            },
        };
    }

    private static string BandOf(double value, (string Band, double UpperBound)[] bands)
    {
        foreach (var (band, upperBound) in bands)
        {
            if (value < upperBound)
            {
                return band;
            }
        }

        return bands[^1].Band;
    }
}
