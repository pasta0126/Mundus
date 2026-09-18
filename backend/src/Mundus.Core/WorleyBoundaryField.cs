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
    public double EdgeProximity(int x, int y, double edgeWidth)
    {
        var cellX = (int)Math.Floor(x / _cellSize);
        var cellY = (int)Math.Floor(y / _cellSize);

        var nearest = double.MaxValue;
        var secondNearest = double.MaxValue;
        for (var dy = -1; dy <= 1; dy++)
        {
            for (var dx = -1; dx <= 1; dx++)
            {
                var (px, py) = FeaturePoint(cellX + dx, cellY + dy);
                var ddx = x - px;
                var ddy = y - py;
                var distance = Math.Sqrt((ddx * ddx) + (ddy * ddy));
                if (distance < nearest)
                {
                    secondNearest = nearest;
                    nearest = distance;
                }
                else if (distance < secondNearest)
                {
                    secondNearest = distance;
                }
            }
        }

        var gap = secondNearest - nearest;
        return Math.Clamp(1 - (gap / edgeWidth), 0, 1);
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
