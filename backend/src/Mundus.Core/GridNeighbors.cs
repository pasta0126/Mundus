namespace Mundus.Core;

/// <summary>
/// Neighbor adjacency for both grid types, clipped to map bounds. Hex
/// uses an "offset" row layout (even rows shifted relative to odd rows),
/// which is why the neighbor offsets differ by row parity.
/// </summary>
internal static class GridNeighbors
{
    private static readonly (int Dx, int Dy)[] Square = [(1, 0), (-1, 0), (0, 1), (0, -1)];

    private static readonly (int Dx, int Dy)[] HexEvenRow =
        [(1, 0), (0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1)];

    private static readonly (int Dx, int Dy)[] HexOddRow =
        [(1, 0), (1, -1), (0, -1), (-1, 0), (0, 1), (1, 1)];

    public static IEnumerable<(int X, int Y)> Get(GridType gridType, int x, int y, int width, int height)
    {
        var offsets = gridType == GridType.Square
            ? Square
            : y % 2 == 0 ? HexEvenRow : HexOddRow;

        foreach (var (dx, dy) in offsets)
        {
            var nx = x + dx;
            var ny = y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height)
            {
                yield return (nx, ny);
            }
        }
    }

    /// <summary>
    /// Approximate planar position for distance comparisons (nearest-seed
    /// assignment). For Hex, staggers alternating rows so the metric
    /// reflects the offset layout instead of treating it as a plain grid.
    /// </summary>
    public static (double X, double Y) ToPlane(GridType gridType, int x, int y)
    {
        if (gridType != GridType.Hex)
        {
            return (x, y);
        }

        var offsetX = x + (y % 2 == 0 ? 0.0 : 0.5);
        return (offsetX, y * 0.8660254037844387); // sqrt(3)/2
    }
}
