namespace Mundus.Core;

public sealed record RegionId
{
    public required int CellX { get; init; }
    public required int CellY { get; init; }
}

public sealed record BoundaryPoint
{
    public required int X { get; init; }
    public required int Y { get; init; }
}

public sealed record RegionBoundaries
{
    public required string Seed { get; init; }
    public required int OriginX { get; init; }
    public required int OriginY { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required IReadOnlyList<BoundaryPoint> Points { get; init; }
}

/// <summary>
/// Partitions the world into a second, coarser Worley/plate-style
/// tessellation than the elevation field's own mountain-range plates
/// (see <see cref="MapGenerator"/>'s `PlateField`) - a distinct,
/// non-mountain-aligned region layout. See design.md "Regions: a
/// second, coarser Worley/plate-style partition" and
/// openspec/changes/add-map-overlays/specs/region-borders/spec.md.
/// </summary>
public static class RegionGenerator
{
    /// <summary>
    /// Coarser than <c>PlateRegionScale</c> (768) so regions read as a
    /// handful of large territories, not a fine patchwork tracing the
    /// mountain plates.
    /// </summary>
    private const int RegionScale = 1536;

    /// <summary>Boundary line half-width, as a fraction of <see cref="RegionScale"/> - much thinner than a mountain belt, since this is a drawn line, not uplifted terrain.</summary>
    private const double RegionEdgeWidthFraction = 0.015;

    /// <summary>Domain-warp scale for the boundary seam, a few times finer than <see cref="RegionScale"/> so a long stretch wobbles more than once along its length - same technique as <c>PlateWarpRegionScale</c>.</summary>
    private const int RegionWarpRegionScale = 512;

    private const int RegionWarpOctaves = 3;

    private const double RegionWarpAmplitudeFraction = 0.25;
    private const double NoisePersistence = 0.5;

    /// <summary>Length, in world units, of one visible dash along a boundary.</summary>
    private const double DashLength = 24;

    /// <summary>Dash-plus-gap period, in world units, along a boundary - see <see cref="WorleyBoundaryField.EdgeSample.SeamCoordinate"/>.</summary>
    private const double DashPeriod = 48;

    /// <summary>A cell counts as "on the boundary" once <see cref="WorleyBoundaryField.EdgeSample.Proximity"/> reaches this close to the seam - not exactly 1, or only the (vanishingly rare) integer coordinate exactly equidistant between two feature points would ever qualify.</summary>
    private const double BoundaryThreshold = 0.9;

    /// <summary>Which lattice region `(x, y)` falls in - a stable identity independent of any window it's looked up through.</summary>
    public static RegionId RegionIdAt(string seed, int x, int y, int step = 1)
    {
        var (cellX, cellY) = RegionField(seed, step).NearestCell(x, y);
        return new RegionId { CellX = cellX, CellY = cellY };
    }

    /// <summary>
    /// Every dash-visible boundary point within the window - not a full
    /// per-cell grid, since only boundary cells matter for rendering.
    /// Dashing is a deterministic function of position along the seam
    /// (<see cref="WorleyBoundaryField.EdgeSample.SeamCoordinate"/>), so
    /// the same stretch of boundary dashes identically no matter which
    /// window it's requested through.
    /// </summary>
    public static RegionBoundaries GenerateBoundaries(string seed, int originX, int originY, int width, int height, int step = 1)
    {
        if (width < 1 || width > MapGenerator.MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(width), $"width must be between 1 and {MapGenerator.MaxWindowDimension}");
        }

        if (height < 1 || height > MapGenerator.MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(height), $"height must be between 1 and {MapGenerator.MaxWindowDimension}");
        }

        if (step < 1 || step > MapGenerator.MaxStep)
        {
            throw new ArgumentOutOfRangeException(nameof(step), $"step must be between 1 and {MapGenerator.MaxStep}");
        }

        var field = RegionField(seed, step);
        var warpXNoise = RegionWarpNoise(seed, step, axis: "x");
        var warpYNoise = RegionWarpNoise(seed, step, axis: "y");
        var edgeWidth = RegionScale * step * RegionEdgeWidthFraction;
        var warpAmplitude = RegionScale * step * RegionWarpAmplitudeFraction;
        var dashLength = DashLength * step;
        var dashPeriod = DashPeriod * step;

        var points = new List<BoundaryPoint>();
        for (var j = 0; j < height; j++)
        {
            var y = originY + (j * step);
            for (var i = 0; i < width; i++)
            {
                var x = originX + (i * step);
                var (warpedX, warpedY) = MapGenerator.WarpedCoordinate(warpXNoise, warpYNoise, x, y, step, warpAmplitude);
                var sample = field.Sample(warpedX, warpedY, edgeWidth);
                if (sample.Proximity < BoundaryThreshold)
                {
                    continue;
                }

                var seamPosition = Mod(sample.SeamCoordinate, dashPeriod);
                if (seamPosition >= dashLength)
                {
                    continue;
                }

                points.Add(new BoundaryPoint { X = x, Y = y });
            }
        }

        return new RegionBoundaries
        {
            Seed = seed,
            OriginX = originX,
            OriginY = originY,
            Width = width,
            Height = height,
            Points = points,
        };
    }

    /// <summary>Floored modulo (always non-negative), unlike C#'s `%` - needed since `SeamCoordinate` is signed.</summary>
    private static double Mod(double value, double modulus)
    {
        var result = value % modulus;
        return result < 0 ? result + modulus : result;
    }

    private static WorleyBoundaryField RegionField(string seed, int step) =>
        new($"{seed}:regions", RegionScale * step);

    private static InfiniteValueNoise2D RegionWarpNoise(string seed, int step, string axis) =>
        new($"{seed}:regions-warp-{axis}", RegionWarpRegionScale * step, RegionWarpOctaves, NoisePersistence);
}
