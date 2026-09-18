namespace Mundus.Core;

public sealed record RiverSegment
{
    public required int X1 { get; init; }
    public required int Y1 { get; init; }
    public required int X2 { get; init; }
    public required int Y2 { get; init; }
}

public sealed record RiverPaths
{
    public required string Seed { get; init; }
    public required int OriginX { get; init; }
    public required int OriginY { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required IReadOnlyList<RiverSegment> Segments { get; init; }
}

/// <summary>
/// Traces seed-deterministic rivers from Peak-band sources downhill to
/// Ocean or a lake, with a meandering path and tributary confluence. See
/// design.md "Rivers: deterministic lattice sources + downhill trace +
/// domain-warped meander" and
/// openspec/changes/add-map-overlays/specs/rivers/spec.md.
/// </summary>
public static class RiverGenerator
{
    /// <summary>
    /// World-unit size (at step=1) of one lattice block scattering
    /// candidate river sources. Small relative to the region/plate
    /// scales, since the Peak elevation band itself only covers a small
    /// fraction of any area - a coarser block would sample it too
    /// sparsely to find more than the rare accidental hit.
    /// </summary>
    private const int SourceBlockSize = 100;

    /// <summary>World-unit distance (at step=1) advanced per trace step.</summary>
    private const int StepLength = 20;

    /// <summary>
    /// Hard cap on trace steps - a river that hasn't reached water by
    /// then is discarded. 150 steps * StepLength = 3000 world units (at
    /// step=1) of maximum river length - this also sets how far beyond a
    /// requested window candidate sources get searched (see
    /// <see cref="GenerateRivers"/>), so it's kept modest: doubling it
    /// quadruples the search area's cost, for longer rivers that are
    /// rarer to actually reach water anyway.
    /// </summary>
    private const int MaxSteps = 150;

    /// <summary>Max degrees the meander can deviate from the steepest-descent direction, each step.</summary>
    private const double MeanderRangeDegrees = 55;

    /// <summary>Region scale of the noise field driving the meander angle - a few times <see cref="StepLength"/>, so the meander drifts smoothly over several steps (a real bend) rather than zig-zagging every step.</summary>
    private const int MeanderNoiseScale = 140;

    /// <summary>
    /// Two rivers "pass within one cell of each other" (see the spec) is
    /// interpreted as this world-unit distance, not literally 1 - trace
    /// points are <see cref="StepLength"/> apart, so a literal 1-unit
    /// tolerance would almost never fire. Kept close to StepLength so a
    /// confluence reads as the two paths visibly touching, not just
    /// passing distantly nearby.
    /// </summary>
    private const double ConfluenceThreshold = StepLength * 1.5;

    /// <summary>World-unit size (at step=1) of the lattice block scattering candidate lake basins - coarser than source blocks, since lakes should be sparse.</summary>
    private const int LakeBlockSize = 900;

    /// <summary>Radius (at step=1) of a lake basin, in world units.</summary>
    private const int LakeRadius = 60;

    /// <summary>Extra margin (at step=1) beyond <see cref="LakeRadius"/> checked (at 8 ring points) for any Ocean/Beach before a candidate lake is kept - keeps lakes away from the coast, as design.md requires.</summary>
    private const int LakeCoastBuffer = 40;

    /// <summary>Whether a coordinate falls within a lake basin - see design.md "Lakes": a small, deterministic feature independent of elevation noise, not itself rendered, only usable as a river terminus.</summary>
    public static bool IsLakeAt(string seed, int x, int y, int step = 1)
    {
        var lakeBlockSize = LakeBlockSize * step;
        var lakeRadius = LakeRadius * step;
        var (blockX, blockY) = BlockOf(x, y, lakeBlockSize);
        for (var dy = -1; dy <= 1; dy++)
        {
            for (var dx = -1; dx <= 1; dx++)
            {
                var (cx, cy) = LakeCandidate(seed, blockX + dx, blockY + dy, lakeBlockSize);
                if (!IsLakeCandidateEligible(seed, cx, cy, step))
                {
                    continue;
                }

                if (Distance(x, y, cx, cy) <= lakeRadius)
                {
                    return true;
                }
            }
        }

        return false;
    }

    /// <summary>
    /// Every river whose source lies in `[minX, maxX) x [minY, maxY)`,
    /// fully traced (including any tributary merges with other sources
    /// in that same area) - independent of any smaller window a caller
    /// later filters to, so two overlapping windows agree on a shared
    /// stretch. Each returned path is ordered source-to-terminus.
    /// </summary>
    public static IReadOnlyList<IReadOnlyList<(int X, int Y)>> TraceRivers(string seed, int minX, int minY, int maxX, int maxY, int step = 1)
    {
        var paths = new List<IReadOnlyList<(int X, int Y)>>();
        foreach (var (blockX, blockY, x, y) in SourceCandidates(seed, minX, minY, maxX, maxY, step))
        {
            if (!MapGenerator.IsPeakAt(seed, x, y, step))
            {
                continue;
            }

            var path = Trace(seed, x, y, step);
            if (path is not null)
            {
                paths.Add(path);
            }
        }

        return MergeConfluences(seed, paths, step);
    }

    /// <summary>
    /// Every river segment that touches the requested window, mirroring
    /// <see cref="MapsController"/>'s seed/window/step contract. Traces
    /// every candidate source within <see cref="MaxSteps"/>*<see cref="StepLength"/>
    /// of the window's bounds (not just sources inside it), then returns
    /// only the segments that touch the window - the same "a distant
    /// window generates as if it were the only request" invariant
    /// map-generation's own fields already guarantee.
    /// </summary>
    public static RiverPaths GenerateRivers(string seed, int originX, int originY, int width, int height, int step = 1)
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

        var maxRiverLength = MaxSteps * StepLength * step;
        var minX = originX - maxRiverLength;
        var minY = originY - maxRiverLength;
        var maxX = originX + (width * step) + maxRiverLength;
        var maxY = originY + (height * step) + maxRiverLength;

        var windowMaxX = originX + (width * step);
        var windowMaxY = originY + (height * step);

        var segments = new List<RiverSegment>();
        foreach (var path in TraceRivers(seed, minX, minY, maxX, maxY, step))
        {
            for (var i = 0; i < path.Count - 1; i++)
            {
                var (x1, y1) = path[i];
                var (x2, y2) = path[i + 1];
                var touchesWindow =
                    (x1 >= originX && x1 < windowMaxX && y1 >= originY && y1 < windowMaxY) ||
                    (x2 >= originX && x2 < windowMaxX && y2 >= originY && y2 < windowMaxY);
                if (touchesWindow)
                {
                    segments.Add(new RiverSegment { X1 = x1, Y1 = y1, X2 = x2, Y2 = y2 });
                }
            }
        }

        return new RiverPaths
        {
            Seed = seed,
            OriginX = originX,
            OriginY = originY,
            Width = width,
            Height = height,
            Segments = segments,
        };
    }

    /// <summary>
    /// Traces one river from a Peak-band source, meandering downhill.
    /// Returns null if it fails to reach Ocean or a lake within
    /// <see cref="MaxSteps"/>, or gets stuck at a local minimum that
    /// isn't water - both are "discard the candidate", per the spec.
    /// </summary>
    private static List<(int X, int Y)>? Trace(string seed, int sourceX, int sourceY, int step)
    {
        var meanderNoise = MeanderNoise(seed, step);
        var path = new List<(int X, int Y)> { (sourceX, sourceY) };
        var x = sourceX;
        var y = sourceY;
        var elevation = MapGenerator.ElevationAt(seed, x, y, step);

        for (var i = 0; i < MaxSteps; i++)
        {
            if (MapGenerator.IsOceanAt(seed, x, y, step) || IsLakeAt(seed, x, y, step))
            {
                return path;
            }

            // Excluded from candidate selection below: on a flat/tied
            // patch (two neighboring points sampling to exactly the same
            // warped elevation - possible since the elevation-band warp
            // rounds to integer coordinates), the "steepest descent"
            // search could otherwise pick the point just left, and the
            // one after that pick this one right back, oscillating in
            // place indefinitely instead of continuing downstream.
            var previous = path.Count >= 2 ? path[^2] : ((int X, int Y)?)null;

            var stepLength = StepLength * step;
            var bestElevation = elevation;
            var bestX = x;
            var bestY = y;
            var bestAngle = 0.0;
            var foundDownhill = false;
            for (var dir = 0; dir < 8; dir++)
            {
                var angle = dir * Math.PI / 4;
                var candidateX = x + (int)Math.Round(Math.Cos(angle) * stepLength);
                var candidateY = y + (int)Math.Round(Math.Sin(angle) * stepLength);
                if (previous is { } p && candidateX == p.X && candidateY == p.Y)
                {
                    continue;
                }

                var candidateElevation = MapGenerator.ElevationAt(seed, candidateX, candidateY, step);
                if (candidateElevation < bestElevation)
                {
                    bestElevation = candidateElevation;
                    bestX = candidateX;
                    bestY = candidateY;
                    bestAngle = angle;
                    foundDownhill = true;
                }
            }

            if (!foundDownhill)
            {
                return null; // stuck at a local minimum that isn't water
            }

            // Meander: perturb the steepest-descent angle by a smoothly
            // drifting noise value, but only take it if it's still
            // downhill (or flat) - guarantees the "never uphill"
            // invariant regardless of how the meander perturbs direction.
            var meanderNoiseValue = meanderNoise.Sample(x, y, step);
            var meanderAngle = bestAngle + ((meanderNoiseValue - 0.5) * 2 * MeanderRangeDegrees * Math.PI / 180);
            var meanderX = x + (int)Math.Round(Math.Cos(meanderAngle) * stepLength);
            var meanderY = y + (int)Math.Round(Math.Sin(meanderAngle) * stepLength);
            var meanderIsPrevious = previous is { } prev && meanderX == prev.X && meanderY == prev.Y;
            var meanderElevation = meanderIsPrevious ? double.PositiveInfinity : MapGenerator.ElevationAt(seed, meanderX, meanderY, step);

            if (!meanderIsPrevious && meanderElevation <= elevation)
            {
                x = meanderX;
                y = meanderY;
                elevation = meanderElevation;
            }
            else
            {
                x = bestX;
                y = bestY;
                elevation = bestElevation;
            }

            path.Add((x, y));
        }

        return null; // never reached water within MaxSteps
    }

    /// <summary>
    /// Merges tributaries: whenever two paths pass within
    /// <see cref="ConfluenceThreshold"/> of each other, one is truncated
    /// at that point and redirected to continue along the other's
    /// downstream suffix - so downstream of the confluence, both render
    /// as one shared path. Which side is truncated is decided by
    /// elevation, not path length: only the direction that doesn't
    /// require an uphill jump at the splice is valid, preserving the
    /// "never uphill" invariant across the merged seam too. Repeats to a
    /// fixed point (a redirected path can itself confluence with a
    /// third), bounded to avoid any pathological infinite loop.
    /// </summary>
    private static List<IReadOnlyList<(int X, int Y)>> MergeConfluences(string seed, List<IReadOnlyList<(int X, int Y)>> paths, int step)
    {
        var confluenceThreshold = ConfluenceThreshold * step;
        var result = paths.ToList();
        for (var pass = 0; pass < result.Count + 1; pass++)
        {
            var mergedAny = false;
            for (var i = 0; i < result.Count && !mergedAny; i++)
            {
                for (var j = i + 1; j < result.Count && !mergedAny; j++)
                {
                    if (!TryFindConfluence(seed, step, result[i], result[j], confluenceThreshold, out var aIsTruncated, out var indexA, out var indexB))
                    {
                        continue;
                    }

                    var (truncatedPos, truncateIndex, keptPos, spliceIndex) = aIsTruncated ? (i, indexA, j, indexB) : (j, indexB, i, indexA);
                    var merged = result[truncatedPos].Take(truncateIndex + 1).Concat(result[keptPos].Skip(spliceIndex)).ToList();
                    result[truncatedPos] = merged;
                    mergedAny = true;
                }
            }

            if (!mergedAny)
            {
                break;
            }
        }

        return result;
    }

    /// <summary>
    /// Finds the first (by `a`'s own order, then `b`'s) point pair within
    /// `confluenceThreshold` of each other where continuing from one
    /// path onto the other doesn't require an uphill step - i.e. the
    /// kept path's elevation at the splice point is no higher than the
    /// truncated path's elevation at the truncation point. A pair that's
    /// merely close in space but has no elevation-safe direction (a
    /// coincidental crossing, not a real tributary joining) is skipped
    /// rather than merged.
    /// </summary>
    private static bool TryFindConfluence(string seed, int step, IReadOnlyList<(int X, int Y)> a, IReadOnlyList<(int X, int Y)> b, double confluenceThreshold, out bool aIsTruncated, out int indexA, out int indexB)
    {
        for (var i = 0; i < a.Count; i++)
        {
            for (var j = 0; j < b.Count; j++)
            {
                if (Distance(a[i].X, a[i].Y, b[j].X, b[j].Y) > confluenceThreshold)
                {
                    continue;
                }

                var elevationA = MapGenerator.ElevationAt(seed, a[i].X, a[i].Y, step);
                var elevationB = MapGenerator.ElevationAt(seed, b[j].X, b[j].Y, step);
                if (elevationB <= elevationA)
                {
                    // Truncate a at i, continue along b from j.
                    aIsTruncated = true;
                    indexA = i;
                    indexB = j;
                    return true;
                }

                if (elevationA <= elevationB)
                {
                    // Truncate b at j, continue along a from i.
                    aIsTruncated = false;
                    indexA = i;
                    indexB = j;
                    return true;
                }
            }
        }

        aIsTruncated = false;
        indexA = -1;
        indexB = -1;
        return false;
    }

    private static double Distance(int x1, int y1, int x2, int y2)
    {
        var dx = x1 - x2;
        var dy = y1 - y2;
        return Math.Sqrt((dx * dx) + (dy * dy));
    }

    private static IEnumerable<(int BlockX, int BlockY, int X, int Y)> SourceCandidates(string seed, int minX, int minY, int maxX, int maxY, int step)
    {
        var sourceBlockSize = SourceBlockSize * step;
        var (minBlockX, minBlockY) = BlockOf(minX, minY, sourceBlockSize);
        var (maxBlockX, maxBlockY) = BlockOf(maxX, maxY, sourceBlockSize);
        for (var blockY = minBlockY; blockY <= maxBlockY; blockY++)
        {
            for (var blockX = minBlockX; blockX <= maxBlockX; blockX++)
            {
                var rng = new Rng($"{seed}:river-sources:{blockX}:{blockY}");
                var x = (int)((blockX + rng.Float()) * sourceBlockSize);
                var y = (int)((blockY + rng.Float()) * sourceBlockSize);
                yield return (blockX, blockY, x, y);
            }
        }
    }

    private static bool IsLakeCandidateEligible(string seed, int x, int y, int step)
    {
        if (MapGenerator.ElevationBandAt(seed, x, y, step) != "Lowland")
        {
            return false;
        }

        var footprintRadius = (LakeRadius + LakeCoastBuffer) * step;
        for (var dir = 0; dir < 8; dir++)
        {
            var angle = dir * Math.PI / 4;
            var ringX = x + (int)Math.Round(Math.Cos(angle) * footprintRadius);
            var ringY = y + (int)Math.Round(Math.Sin(angle) * footprintRadius);
            var band = MapGenerator.ElevationBandAt(seed, ringX, ringY, step);
            if (band is "Ocean" or "Beach")
            {
                return false;
            }
        }

        return true;
    }

    private static (int X, int Y) LakeCandidate(string seed, int blockX, int blockY, int lakeBlockSize)
    {
        var rng = new Rng($"{seed}:lakes:{blockX}:{blockY}");
        var x = (int)((blockX + rng.Float()) * lakeBlockSize);
        var y = (int)((blockY + rng.Float()) * lakeBlockSize);
        return (x, y);
    }

    private static (int BlockX, int BlockY) BlockOf(int x, int y, int blockSize) =>
        ((int)Math.Floor((double)x / blockSize), (int)Math.Floor((double)y / blockSize));

    private static InfiniteValueNoise2D MeanderNoise(string seed, int step) =>
        new($"{seed}:river-meander", MeanderNoiseScale * step, octaves: 1);
}
