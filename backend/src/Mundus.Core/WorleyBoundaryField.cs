namespace Mundus.Core;

/// <summary>
/// Deterministic cellular ("Worley"/Voronoi) noise: scatters one
/// randomly-jittered feature point per cell of a regular lattice, and
/// reports how close a coordinate is to the seam between two
/// neighboring cells' feature points (the classic Worley "F2 - F1"
/// distance-difference trick). Used to place mountain ranges along the
/// boundary between "tectonic plates" - long, winding, mostly-
/// continuous lines, the way real mountain ranges trace where two
/// plates meet - rather than the branching, blob-centered shape a
/// folded fBm ("ridge noise") field gives. See design.md ("Mountain
/// ranges as plate boundaries").
///
/// Each feature point is derived independently, in O(1), by hashing the
/// seed with its own lattice cell coordinates - same location-
/// independence guarantee as <see cref="InfiniteValueNoise2D"/>.
/// </summary>
public sealed class WorleyBoundaryField
{
    private readonly string _seed;
    private readonly double _cellSize;
    private readonly Dictionary<(int X, int Y), (double X, double Y)> _pointCache = [];

    public WorleyBoundaryField(string seed, double cellSize)
    {
        if (cellSize < 1) throw new ArgumentOutOfRangeException(nameof(cellSize), "cellSize must be >= 1");
        _seed = seed;
        _cellSize = cellSize;
    }

    /// <summary>
    /// Edge proximity in [0, 1]: 1 exactly on the seam between two
    /// plates, falling to 0 at `edgeWidth` world units away (toward
    /// either plate's own interior). `edgeWidth` controls the eventual
    /// mountain belt's width.
    /// </summary>
    public double EdgeProximity(int x, int y, double edgeWidth) => Sample(x, y, edgeWidth).Proximity;

    /// <summary>
    /// `Proximity`: see <see cref="EdgeProximity"/>. `TangentX`/`TangentY`
    /// is the unit direction of the seam itself (perpendicular to the
    /// line joining the two nearest feature points) - lets a caller walk
    /// or dash along the boundary rather than just knowing it's nearby.
    /// `SeamCoordinate` is `(x, y)`'s signed position projected onto that
    /// tangent, relative to the seam's local midpoint - a 1-D coordinate
    /// along the boundary, suitable for a periodic dash-pattern test,
    /// that agrees for any two points sampled near the same seam
    /// regardless of which window either was requested through.
    /// </summary>
    public readonly record struct EdgeSample(double Proximity, double TangentX, double TangentY, double SeamCoordinate);

    public EdgeSample Sample(int x, int y, double edgeWidth)
    {
        var cellX = (int)Math.Floor(x / _cellSize);
        var cellY = (int)Math.Floor(y / _cellSize);

        var nearest = double.MaxValue;
        var secondNearest = double.MaxValue;
        (double X, double Y) nearestPoint = default;
        (double X, double Y) secondNearestPoint = default;
        for (var dy = -1; dy <= 1; dy++)
        {
            for (var dx = -1; dx <= 1; dx++)
            {
                var point = FeaturePoint(cellX + dx, cellY + dy);
                var ddx = x - point.X;
                var ddy = y - point.Y;
                var distance = Math.Sqrt((ddx * ddx) + (ddy * ddy));
                if (distance < nearest)
                {
                    secondNearest = nearest;
                    secondNearestPoint = nearestPoint;
                    nearest = distance;
                    nearestPoint = point;
                }
                else if (distance < secondNearest)
                {
                    secondNearest = distance;
                    secondNearestPoint = point;
                }
            }
        }

        var gap = secondNearest - nearest;
        var proximity = Math.Clamp(1 - (gap / edgeWidth), 0, 1);

        // Order the pair canonically (not "nearest, then second-nearest")
        // before deriving the tangent: which of the two is actually
        // closer flips right as (x, y) crosses the seam between them -
        // exactly the region a boundary threshold cares about - and
        // that flip would otherwise negate the tangent (and so
        // SeamCoordinate) at the one place continuity matters most.
        // Sorting by the points' own coordinates keeps the tangent's
        // sign fixed for a given pair regardless of which side of the
        // seam (x, y) falls on.
        var (p1, p2) = (nearestPoint.X, nearestPoint.Y).CompareTo((secondNearestPoint.X, secondNearestPoint.Y)) <= 0
            ? (nearestPoint, secondNearestPoint)
            : (secondNearestPoint, nearestPoint);
        var seamDx = p2.X - p1.X;
        var seamDy = p2.Y - p1.Y;
        var seamLength = Math.Sqrt((seamDx * seamDx) + (seamDy * seamDy));
        var tangentX = seamLength > 0 ? -seamDy / seamLength : 0;
        var tangentY = seamLength > 0 ? seamDx / seamLength : 0;
        var midX = (p1.X + p2.X) / 2;
        var midY = (p1.Y + p2.Y) / 2;
        var seamCoordinate = ((x - midX) * tangentX) + ((y - midY) * tangentY);

        return new EdgeSample(proximity, tangentX, tangentY, seamCoordinate);
    }

    /// <summary>
    /// Which lattice cell's feature point `(x, y)` is closest to - a
    /// stable identity for "the Voronoi region this point falls in",
    /// independent of any window it's later looked up through.
    /// </summary>
    public (int CellX, int CellY) NearestCell(int x, int y)
    {
        var cellX = (int)Math.Floor(x / _cellSize);
        var cellY = (int)Math.Floor(y / _cellSize);

        var nearest = double.MaxValue;
        var nearestCellX = cellX;
        var nearestCellY = cellY;
        for (var dy = -1; dy <= 1; dy++)
        {
            for (var dx = -1; dx <= 1; dx++)
            {
                var point = FeaturePoint(cellX + dx, cellY + dy);
                var ddx = x - point.X;
                var ddy = y - point.Y;
                var distance = Math.Sqrt((ddx * ddx) + (ddy * ddy));
                if (distance < nearest)
                {
                    nearest = distance;
                    nearestCellX = cellX + dx;
                    nearestCellY = cellY + dy;
                }
            }
        }

        return (nearestCellX, nearestCellY);
    }

    private (double X, double Y) FeaturePoint(int cellX, int cellY)
    {
        var key = (cellX, cellY);
        if (_pointCache.TryGetValue(key, out var cached))
        {
            return cached;
        }

        var rng = new Rng($"{_seed}:plate:{cellX}:{cellY}");
        var jitterX = rng.Float();
        var jitterY = rng.Float();
        var point = ((cellX + jitterX) * _cellSize, (cellY + jitterY) * _cellSize);
        _pointCache[key] = point;
        return point;
    }
}
