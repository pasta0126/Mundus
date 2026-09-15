namespace Mundus.Core;

/// <summary>
/// Deterministic 2D value noise: a coarse lattice of random values drawn
/// from a seeded <see cref="Rng"/>, smoothly interpolated (smoothstep
/// easing, not linear, to avoid visible grid creases) so nearby points
/// have similar values. No external noise library - this generation
/// logic is a core product capability, not incidental plumbing.
/// </summary>
internal sealed class ValueNoise2D
{
    private readonly double[,] _lattice;
    private readonly int _cellSize;

    public ValueNoise2D(Rng rng, int width, int height, int cellSize)
    {
        _cellSize = Math.Max(1, cellSize);
        var latticeWidth = width / _cellSize + 2;
        var latticeHeight = height / _cellSize + 2;
        _lattice = new double[latticeWidth, latticeHeight];
        for (var y = 0; y < latticeHeight; y++)
        {
            for (var x = 0; x < latticeWidth; x++)
            {
                _lattice[x, y] = rng.Float();
            }
        }
    }

    /// <summary>Sample the noise field at integer cell coordinates. Result is in [0, 1).</summary>
    public double Sample(int x, int y)
    {
        var fx = (double)x / _cellSize;
        var fy = (double)y / _cellSize;
        var ix = (int)fx;
        var iy = (int)fy;
        var tx = Smoothstep(fx - ix);
        var ty = Smoothstep(fy - iy);

        var v00 = _lattice[ix, iy];
        var v10 = _lattice[ix + 1, iy];
        var v01 = _lattice[ix, iy + 1];
        var v11 = _lattice[ix + 1, iy + 1];

        var top = Lerp(v00, v10, tx);
        var bottom = Lerp(v01, v11, tx);
        return Lerp(top, bottom, ty);
    }

    private static double Smoothstep(double t) => t * t * (3 - 2 * t);

    private static double Lerp(double a, double b, double t) => a + (b - a) * t;
}
