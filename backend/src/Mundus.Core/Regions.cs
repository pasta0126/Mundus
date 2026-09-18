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

    /// <summary>Boundary line half-width, as a fraction of <see cref="RegionScale"/> - a thin drawn line, not a mountain belt's uplifted width.</summary>
    private const double RegionEdgeWidthFraction = 0.01;

    /// <summary>
    /// Domain-warp scale for the boundary seam - finer than
    /// <see cref="RegionScale"/> and than <c>PlateWarpRegionScale</c>
    /// (mountain seams use ~256) so the line wobbles noticeably more
    /// than once along its length, reading as a hand-drawn/natural
    /// political border rather than a smoothed Voronoi edge. Finer still
    /// (paired with a higher amplitude below) collapses into chaotic
    /// self-crossing loops disconnected from the real seam - verified by
    /// eye, not just by proximity math.
    /// </summary>
    private const int RegionWarpRegionScale = 340;

    private const int RegionWarpOctaves = 4;

    /// <summary>
    /// Stronger than <c>PlateWarpAmplitudeFraction</c> (0.25) so the line
    /// reads noisier/hand-drawn, occasionally enough to displace a
    /// stretch across a neighboring region's own seam and produce a
    /// small enclave/exclave as a natural side effect - but well short of
    /// <see cref="RegionScale"/> itself, or the warp dominates the real
    /// seam entirely and produces scribbly noise unrelated to any actual
    /// boundary.
    /// </summary>
    private const double RegionWarpAmplitudeFraction = 0.35;

    private const double NoisePersistence = 0.55;

    /// <summary>A cell counts as "on the boundary" once proximity reaches this close to the seam - not exactly 1, or only the (vanishingly rare) integer coordinate exactly equidistant between two feature points would ever qualify.</summary>
    private const double BoundaryThreshold = 0.9;

    /// <summary>Which lattice region `(x, y)` falls in - a stable identity independent of any window it's looked up through.</summary>
    public static RegionId RegionIdAt(string seed, int x, int y, int step = 1)
    {
        var (cellX, cellY) = RegionField(seed, step).NearestCell(x, y);
        return new RegionId { CellX = cellX, CellY = cellY };
    }

    /// <summary>
    /// Every boundary point within the window that should be drawn - a
    /// thin, solid line, excluding any point that falls on water (a
    /// region border never crosses visibly through the ocean). Not a
    /// full per-cell grid, since only boundary cells matter for
    /// rendering.
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

        var points = new List<BoundaryPoint>();
        for (var j = 0; j < height; j++)
        {
            var y = originY + (j * step);
            for (var i = 0; i < width; i++)
            {
                var x = originX + (i * step);
                var (warpedX, warpedY) = MapGenerator.WarpedCoordinate(warpXNoise, warpYNoise, x, y, step, warpAmplitude);
                if (field.EdgeProximity(warpedX, warpedY, edgeWidth) < BoundaryThreshold)
                {
                    continue;
                }

                if (MapGenerator.IsOceanAt(seed, x, y, step))
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

    private static WorleyBoundaryField RegionField(string seed, int step) =>
        new($"{seed}:regions", RegionScale * step);

    private static InfiniteValueNoise2D RegionWarpNoise(string seed, int step, string axis) =>
        new($"{seed}:regions-warp-{axis}", RegionWarpRegionScale * step, RegionWarpOctaves, NoisePersistence);
}
