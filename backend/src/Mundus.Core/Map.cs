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
    public const int CurrentSpecVersion = 11;

    /// <summary>Per-request window bound (each axis), matching the old "Huge" preset's proven-fast cost.</summary>
    public const int MaxWindowDimension = 512;

    /// <summary>
    /// Largest allowed sampling stride (see `step` on <see cref="Generate"/>)
    /// - far more than any real zoom-out step needs, just a safety bound.
    /// </summary>
    public const int MaxStep = 256;

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

    /// <summary>
    /// Moisture's base region scale - broad climate zones, independent of
    /// elevation's own field. Kept close to elevation's scale (though not
    /// identical, so climate zones don't just trace elevation's own
    /// contours) so that within one elevation band (e.g. Lowland),
    /// moisture carves out large, coherent Desert/Grassland/Swamp regions
    /// instead of a fine patchwork of small ones - a small moisture scale
    /// relative to elevation was fragmenting what should read as one
    /// grassland or one forest into many disconnected slivers.
    /// </summary>
    private const int MoistureRegionScale = 320;

    /// <summary>
    /// One octave per halving down to region scale 10, close to
    /// elevation's own finest octave (8) so moisture-driven biome borders
    /// (e.g. Forest's edge) still get comparable fine detail/raggedness,
    /// not a smoother or coarser edge than the coastline.
    /// </summary>
    private const int MoistureOctaves = 6;

    private const double NoisePersistence = 0.5;

    /// <summary>
    /// Ridge field's base region scale - independent of elevation, used
    /// only to decide where Highland extends into Peak (mountains). A
    /// plain elevation threshold makes mountains form round blobs around
    /// local maxima; folding in a ridged transform of a second field
    /// (see <see cref="InfiniteValueNoise2D.SampleRidged"/>) makes the Peak/Highland boundary
    /// trace branching, roughly linear seams instead, so mountains read
    /// as ranges/massifs rather than isolated lumps.
    /// </summary>
    private const int RidgeRegionScale = 192;

    private const int RidgeOctaves = 5;

    /// <summary>
    /// Elevation floor below which a cell can never become Peak via a
    /// ridge, even if the ridge value is high - keeps mountain ranges
    /// confined to already-elevated terrain instead of clawing into
    /// Lowland.
    /// </summary>
    private const double RidgeElevationFloor = 0.76;

    /// <summary>Minimum ridge value (of `[0, 1]`) for a Highland cell above <see cref="RidgeElevationFloor"/> to count as Peak.</summary>
    private const double RidgeThreshold = 0.58;

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

    /// <param name="step">
    /// World-coordinate spacing between sampled cells (default 1 = every
    /// cell). A returned cell at index `(i, j)` within the window carries
    /// the biome for world coordinate `(originX + i*step, originY +
    /// j*step)` - i.e. `step > 1` sparsely samples a much larger world
    /// area using the same number of cells/requests, for zoom levels
    /// beyond the finest 1-world-cell-per-screen-pixel step (see
    /// design.md "Sampling stride for zoom levels past 1px/cell"). Same
    /// O(1)-per-cell cost as `step=1`; only which world coordinates get
    /// sampled changes.
    /// </param>
    public static Map Generate(string seed, int originX, int originY, int width, int height, int step = 1)
    {
        if (width < 1 || width > MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(width), $"width must be between 1 and {MaxWindowDimension}");
        }

        if (height < 1 || height > MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(height), $"height must be between 1 and {MaxWindowDimension}");
        }

        if (step < 1 || step > MaxStep)
        {
            throw new ArgumentOutOfRangeException(nameof(step), $"step must be between 1 and {MaxStep}");
        }

        var elevationNoise = ElevationNoise(seed);
        var moistureNoise = MoistureNoise(seed);
        var ridgeNoise = RidgeNoise(seed);
        var cells = new List<Cell>(width * height);
        for (var j = 0; j < height; j++)
        {
            var y = originY + (j * step);
            for (var i = 0; i < width; i++)
            {
                var x = originX + (i * step);
                // minRegionScale: step keeps each field from folding in
                // octaves finer than the gap between sampled points - see
                // InfiniteValueNoise2D.Sample's docs. Avoids the wide
                // strides used for far zoom-out levels reading as speckled
                // noise instead of the same smooth continents/mountains
                // visible at step=1.
                var elevation = elevationNoise.Sample(x, y, step);
                var moisture = moistureNoise.Sample(x, y, step);
                var ridge = ridgeNoise.SampleRidged(x, y, step);
                cells.Add(new Cell { X = x, Y = y, Biome = BiomeAt(elevation, moisture, ridge) });
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

    /// <summary>Sample the ridged-multifractal `[0, 1]` ridge value at a coordinate - exposed for testing.</summary>
    public static double RidgeAt(string seed, int x, int y) => RidgeNoise(seed).SampleRidged(x, y);

    private static InfiniteValueNoise2D ElevationNoise(string seed) =>
        new(seed, ElevationRegionScale, ElevationOctaves, NoisePersistence);

    // Suffixing the parent seed (rather than an unrelated string) keeps
    // moisture anchored to the same seed while guaranteeing independence
    // from elevation - a different seed string produces entirely
    // different lattice hashes, so the two fields never correlate.
    private static InfiniteValueNoise2D MoistureNoise(string seed) =>
        new($"{seed}:moisture", MoistureRegionScale, MoistureOctaves, NoisePersistence);

    private static InfiniteValueNoise2D RidgeNoise(string seed) =>
        new($"{seed}:ridge", RidgeRegionScale, RidgeOctaves, NoisePersistence);

    private static Biome BiomeAt(double elevation, double moisture, double ridge)
    {
        var elevationBand = BandOf(elevation, ElevationBands);
        if (elevationBand == "Highland" && elevation >= RidgeElevationFloor && ridge >= RidgeThreshold)
        {
            // Extend Peak down into Highland along ridge lines, so
            // mountains read as ranges reaching out from the highest
            // points rather than a single round summit blob.
            elevationBand = "Peak";
        }

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
