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
    public const int CurrentSpecVersion = 15;

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
    /// Elevation value (of the base octave only - see
    /// <see cref="Generate"/>'s regional-elevation check) above which a
    /// cell is considered clearly inland, so a fine-detail dip below the
    /// Ocean/Beach threshold there is a stray artifact (a tiny pond
    /// hugging an otherwise-solid coastline) rather than a real part of
    /// the coast, and gets suppressed. Comfortably above Beach's own
    /// upper bound so real coastline unevenness (where the *regional*
    /// value is also near the boundary) is left alone.
    /// </summary>
    private const double InlandFloor = 0.48;

    /// <summary>
    /// Elevation-band boundaries (Ocean/Beach and every band above it) are
    /// threshold crossings of <see cref="ElevationNoise"/> alone - fBm adds
    /// fine detail, but with <see cref="NoisePersistence"/> the base octave
    /// still carries about half the sample's weight, so a long stretch of
    /// coastline can read as that octave's smooth bilinear shape wherever
    /// the finer octaves don't happen to cross the threshold. As with
    /// <see cref="PlateWarpRegionScale"/>, warping the coordinate before
    /// the elevation-band lookup bends that smooth shape into an organic
    /// edge; kept at roughly a third of <see cref="ElevationRegionScale"/>,
    /// the same ratio <see cref="PlateWarpRegionScale"/> has to
    /// <see cref="PlateRegionScale"/>, so one boundary stretch wobbles more
    /// than once along its length.
    /// </summary>
    private const int ElevationWarpRegionScale = 170;

    private const int ElevationWarpOctaves = 3;

    /// <summary>How far (as a fraction of <see cref="ElevationWarpRegionScale"/>) the warp can displace a coordinate before it's handed to the elevation field for band lookup.</summary>
    private const double ElevationWarpAmplitudeFraction = 0.25;

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

    /// <summary>
    /// Same organic-edge rationale as <see cref="ElevationWarpRegionScale"/>,
    /// applied to moisture-band boundaries (e.g. Forest's edge) instead of
    /// elevation-band ones - kept independent (own seed, own region scale
    /// derived from <see cref="MoistureRegionScale"/>) so coastline and
    /// biome-border raggedness don't visibly correlate.
    /// </summary>
    private const int MoistureWarpRegionScale = 110;

    private const int MoistureWarpOctaves = 3;

    /// <summary>How far (as a fraction of <see cref="MoistureWarpRegionScale"/>) the warp can displace a coordinate before it's handed to the moisture field for band lookup.</summary>
    private const double MoistureWarpAmplitudeFraction = 0.25;

    private const double NoisePersistence = 0.5;

    /// <summary>
    /// "Tectonic plate" scale: the average size of one Worley cell in
    /// <see cref="WorleyBoundaryField"/> - i.e. roughly how far apart
    /// mountain-range-bearing plate seams are. See design.md ("Mountain
    /// ranges as plate boundaries").
    /// </summary>
    private const int PlateRegionScale = 768;

    /// <summary>Mountain belt half-width, as a fraction of <see cref="PlateRegionScale"/>.</summary>
    private const double PlateEdgeWidthFraction = 0.05;

    /// <summary>
    /// A Voronoi/Worley diagram's own cell boundaries are mathematically
    /// straight line segments - fine for abstract cellular texture, but a
    /// "mountain range" made of dead-straight edges reads as an obvious
    /// geometric artifact, not terrain. Domain warping - looking up the
    /// plate field at a noise-displaced coordinate instead of the cell's
    /// own - bends those straight seams into organic, winding curves;
    /// this is the region scale of the warp noise itself (independent of
    /// <see cref="PlateRegionScale"/>, deliberately a few times finer so
    /// a single plate edge visibly wobbles more than once along its
    /// length rather than just leaning at a slightly different angle).
    /// </summary>
    private const int PlateWarpRegionScale = 256;

    private const int PlateWarpOctaves = 3;

    /// <summary>How far (as a fraction of <see cref="PlateRegionScale"/>) the warp can displace a coordinate before it's handed to the plate field.</summary>
    private const double PlateWarpAmplitudeFraction = 0.25;

    /// <summary>
    /// Elevation floor below which a cell can never become Peak even
    /// sitting exactly on a plate seam - keeps mountain ranges confined
    /// to already-elevated terrain instead of clawing into Lowland.
    /// </summary>
    private const double PlateUpliftElevationFloor = 0.76;

    /// <summary>
    /// Coast-type field's base region scale - deliberately coarser than
    /// the coastline's own detail, so one stretch of coast (a bay, a
    /// peninsula) commits to one style rather than flickering between
    /// styles cell to cell. See <see cref="CoastBiomeAt"/>.
    /// </summary>
    private const int CoastRegionScale = 100;

    private const int CoastOctaves = 3;

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

        // Scaling every field's region scale by `step` (not just spacing
        // sampled points further apart) is what actually makes continents
        // and oceans still read as large at a wide zoom-out instead of
        // many small ones packed side by side: without it, a fixed
        // regionScale covers a shrinking fraction of the (much larger)
        // visible world as step grows, so the same absolute feature size
        // reads as "a little of everything everywhere" once the viewport
        // spans many of them. Scaling keeps the same "N regions visible
        // across the viewport" ratio at every step - real-map-style
        // generalization, not just sparser sampling of the same detail.
        // It also happens to keep every octave's scale comfortably above
        // the sampling gap (scale is always `step` times the step=1
        // value), so this alone prevents the aliasing a naive fixed-scale
        // stride would have - see InfiniteValueNoise2D.Sample's
        // `minRegionScale` guard, kept as a defensive backstop.
        var elevationNoise = ElevationNoise(seed, step);
        var moistureNoise = MoistureNoise(seed, step);
        var plateField = PlateField(seed, step);
        var warpXNoise = PlateWarpNoise(seed, step, axis: "x");
        var warpYNoise = PlateWarpNoise(seed, step, axis: "y");
        var elevationWarpXNoise = ElevationWarpNoise(seed, step, axis: "x");
        var elevationWarpYNoise = ElevationWarpNoise(seed, step, axis: "y");
        var moistureWarpXNoise = MoistureWarpNoise(seed, step, axis: "x");
        var moistureWarpYNoise = MoistureWarpNoise(seed, step, axis: "y");
        var coastNoise = CoastNoise(seed, step);
        var plateEdgeWidth = PlateRegionScale * step * PlateEdgeWidthFraction;
        var plateWarpAmplitude = PlateRegionScale * step * PlateWarpAmplitudeFraction;
        var elevationWarpAmplitude = ElevationWarpRegionScale * step * ElevationWarpAmplitudeFraction;
        var moistureWarpAmplitude = MoistureWarpRegionScale * step * MoistureWarpAmplitudeFraction;
        var cells = new List<Cell>(width * height);
        for (var j = 0; j < height; j++)
        {
            var y = originY + (j * step);
            for (var i = 0; i < width; i++)
            {
                var x = originX + (i * step);

                // Warp the coordinate before the elevation-band lookup
                // (see ElevationWarpRegionScale) so a long coastline/band
                // boundary winds organically instead of tracing the
                // smooth shape of the noise field's own base octave. The
                // InlandFloor check below deliberately samples the
                // *unwarped* (x, y) - the warp only affects which band a
                // cell falls into, not what "clearly inland" means.
                var (warpedElevationX, warpedElevationY) = WarpedCoordinate(elevationWarpXNoise, elevationWarpYNoise, x, y, step, elevationWarpAmplitude);
                var elevation = elevationNoise.Sample(warpedElevationX, warpedElevationY, step);

                // Suppress tiny fine-detail dips below the Ocean/Beach
                // threshold when the *regional* (base-octave-only)
                // elevation is clearly inland - a stray pond artifact
                // hugging an otherwise-solid coastline, not a real part
                // of it. Real coastline unevenness leaves the regional
                // value near the boundary too, so it's untouched. Only
                // worth checking at all when the detailed sample is
                // already below the floor - elsewhere there's nothing to
                // suppress, and skipping it avoids a second noise sample
                // for the large majority of cells that aren't near a
                // coast.
                if (elevation < InlandFloor)
                {
                    var regionalElevation = elevationNoise.Sample(x, y, minRegionScale: ElevationRegionScale * step);
                    if (regionalElevation >= InlandFloor)
                    {
                        elevation = InlandFloor;
                    }
                }

                var elevationBand = BandOf(elevation, ElevationBands);
                Biome biome;
                if (elevationBand == "Ocean")
                {
                    biome = Biome.Ocean;
                }
                else if (elevationBand == "Beach")
                {
                    // Coast style only needs sampling for the actual
                    // coastline cells, not the whole map.
                    var coast = coastNoise.Sample(x, y, step);
                    var (warpedCoastMoistureX, warpedCoastMoistureY) = WarpedCoordinate(moistureWarpXNoise, moistureWarpYNoise, x, y, step, moistureWarpAmplitude);
                    var moisture = moistureNoise.Sample(warpedCoastMoistureX, warpedCoastMoistureY, step);
                    biome = CoastBiomeAt(coast, moisture);
                }
                else
                {
                    // Warp the coordinate before the moisture-band lookup
                    // for the same reason as elevation above - organic
                    // Forest/Desert/Grassland edges instead of the noise
                    // field's own smooth base-octave shape.
                    var (warpedMoistureX, warpedMoistureY) = WarpedCoordinate(moistureWarpXNoise, moistureWarpYNoise, x, y, step, moistureWarpAmplitude);
                    var moisture = moistureNoise.Sample(warpedMoistureX, warpedMoistureY, step);
                    if (elevationBand is "Highland" or "Peak")
                    {
                        // Plate-boundary proximity only matters for
                        // deciding whether elevated ground becomes a
                        // mountain range - skip it for Lowland. Warp the
                        // coordinate before querying the plate field (see
                        // PlateWarpRegionScale) so the seam it traces
                        // winds organically instead of following the
                        // dead-straight edges a raw Voronoi diagram has.
                        var (warpedPlateX, warpedPlateY) = WarpedCoordinate(warpXNoise, warpYNoise, x, y, step, plateWarpAmplitude);
                        var plateEdge = plateField.EdgeProximity(warpedPlateX, warpedPlateY, plateEdgeWidth);
                        elevationBand = UpliftedBand(elevationBand, elevation, plateEdge);
                    }

                    biome = LandBiomeAt(elevationBand, moisture);
                }

                cells.Add(new Cell { X = x, Y = y, Biome = biome });
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

    /// <summary>
    /// Sample the [0, 1) elevation value at a coordinate, including the
    /// same elevation-band domain warp <see cref="Generate"/> applies -
    /// exposed for testing neighbor smoothness and boundary raggedness.
    /// </summary>
    public static double ElevationAt(string seed, int x, int y, int step = 1)
    {
        var amplitude = ElevationWarpRegionScale * step * ElevationWarpAmplitudeFraction;
        var (warpedX, warpedY) = WarpedCoordinate(ElevationWarpNoise(seed, step, axis: "x"), ElevationWarpNoise(seed, step, axis: "y"), x, y, step, amplitude);
        return ElevationNoise(seed, step).Sample(warpedX, warpedY, step);
    }

    /// <summary>
    /// Sample the [0, 1) moisture value at a coordinate, including the
    /// same moisture-band domain warp <see cref="Generate"/> applies -
    /// exposed for testing neighbor smoothness and boundary raggedness.
    /// </summary>
    public static double MoistureAt(string seed, int x, int y, int step = 1)
    {
        var amplitude = MoistureWarpRegionScale * step * MoistureWarpAmplitudeFraction;
        var (warpedX, warpedY) = WarpedCoordinate(MoistureWarpNoise(seed, step, axis: "x"), MoistureWarpNoise(seed, step, axis: "y"), x, y, step, amplitude);
        return MoistureNoise(seed, step).Sample(warpedX, warpedY, step);
    }

    /// <summary>
    /// Sample the [0, 1] plate-boundary edge proximity at a coordinate,
    /// including the same domain warp <see cref="Generate"/> applies -
    /// exposed for testing.
    /// </summary>
    public static double PlateEdgeAt(string seed, int x, int y, int step = 1)
    {
        var plateWarpAmplitude = PlateRegionScale * step * PlateWarpAmplitudeFraction;
        var warpedX = x + (int)Math.Round((PlateWarpNoise(seed, step, axis: "x").Sample(x, y, step) - 0.5) * 2 * plateWarpAmplitude);
        var warpedY = y + (int)Math.Round((PlateWarpNoise(seed, step, axis: "y").Sample(x, y, step) - 0.5) * 2 * plateWarpAmplitude);
        return PlateField(seed, step).EdgeProximity(warpedX, warpedY, PlateRegionScale * step * PlateEdgeWidthFraction);
    }

    /// <summary>
    /// Displaces a coordinate by a pair of independent noise fields before
    /// it's handed to a threshold/lookup field - bends that field's own
    /// smooth or straight-edged shape into an organic one. Shared by the
    /// plate, elevation-band, and moisture-band warps.
    /// </summary>
    private static (int X, int Y) WarpedCoordinate(InfiniteValueNoise2D warpXNoise, InfiniteValueNoise2D warpYNoise, int x, int y, int step, double amplitude)
    {
        var warpedX = x + (int)Math.Round((warpXNoise.Sample(x, y, step) - 0.5) * 2 * amplitude);
        var warpedY = y + (int)Math.Round((warpYNoise.Sample(x, y, step) - 0.5) * 2 * amplitude);
        return (warpedX, warpedY);
    }

    private static InfiniteValueNoise2D ElevationNoise(string seed, int step) =>
        new(seed, ElevationRegionScale * step, ElevationOctaves, NoisePersistence);

    // Suffixing the parent seed (rather than an unrelated string) keeps
    // each field anchored to the same seed while guaranteeing
    // independence from the others - a different seed string produces
    // entirely different lattice hashes, so fields never correlate.
    private static InfiniteValueNoise2D MoistureNoise(string seed, int step) =>
        new($"{seed}:moisture", MoistureRegionScale * step, MoistureOctaves, NoisePersistence);

    private static InfiniteValueNoise2D ElevationWarpNoise(string seed, int step, string axis) =>
        new($"{seed}:elevation-warp-{axis}", ElevationWarpRegionScale * step, ElevationWarpOctaves, NoisePersistence);

    private static InfiniteValueNoise2D MoistureWarpNoise(string seed, int step, string axis) =>
        new($"{seed}:moisture-warp-{axis}", MoistureWarpRegionScale * step, MoistureWarpOctaves, NoisePersistence);

    private static WorleyBoundaryField PlateField(string seed, int step) =>
        new($"{seed}:plate", PlateRegionScale * step);

    private static InfiniteValueNoise2D PlateWarpNoise(string seed, int step, string axis) =>
        new($"{seed}:plate-warp-{axis}", PlateWarpRegionScale * step, PlateWarpOctaves, NoisePersistence);

    private static InfiniteValueNoise2D CoastNoise(string seed, int step) =>
        new($"{seed}:coast", CoastRegionScale * step, CoastOctaves, NoisePersistence);

    /// <summary>
    /// Promotes an elevated cell's band to "Peak" if it sits on a plate
    /// seam (thrust up into a mountain range), or demotes an already-Peak
    /// cell away from one back to "Highland" (a plateau, not a jagged
    /// mountain) - see "Mountain ranges as plate boundaries" in
    /// design.md. Only ever called for "Highland"/"Peak" bands.
    /// </summary>
    private static string UpliftedBand(string elevationBand, double elevation, double plateEdge)
    {
        var onPlateSeam = plateEdge > 0;
        if (elevationBand == "Peak" && !onPlateSeam)
        {
            return "Highland";
        }

        if (elevationBand == "Highland" && elevation >= PlateUpliftElevationFloor && onPlateSeam)
        {
            return "Peak";
        }

        return elevationBand;
    }

    /// <summary>Biome for a non-Ocean, non-Beach elevation band, by moisture.</summary>
    private static Biome LandBiomeAt(string elevationBand, double moisture)
    {
        var moistureBand = BandOf(moisture, MoistureBands);
        return elevationBand switch
        {
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

    /// <summary>
    /// Not every coastline is a sandy beach: most of one is (`coast`
    /// below 0.55), but a stretch can instead be wild land meeting the
    /// water directly - reusing the Lowland moisture table, so a forest
    /// or grassland runs right down to the shore (`coast` 0.55-0.8) - or
    /// a cliff, where Mountains plunges straight into the ocean with no
    /// beach at all (`coast` above 0.8).
    /// </summary>
    private static Biome CoastBiomeAt(double coast, double moisture)
    {
        if (coast < 0.55)
        {
            return Biome.Beach;
        }

        if (coast < 0.8)
        {
            var moistureBand = BandOf(moisture, MoistureBands);
            return moistureBand switch
            {
                "Dry" => Biome.Desert,
                "Medium" => Biome.Grassland,
                _ => Biome.Swamp,
            };
        }

        return Biome.Mountains;
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
