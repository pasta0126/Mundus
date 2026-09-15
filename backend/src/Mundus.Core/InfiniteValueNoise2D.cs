namespace Mundus.Core;

/// <summary>
/// Deterministic 2D value noise over an unbounded coordinate space: a
/// lattice of random values, smoothstep-interpolated so nearby points vary
/// smoothly. Unlike a precomputed lattice array (which would tie a point's
/// value to its position in some bounded request, the exact
/// location-dependence the per-cell terrain model must avoid - see
/// design.md), each lattice point's value is derived independently, in
/// O(1), by hashing the seed with that point's own coordinates. Sampling
/// cell (1_000_000, -1_000_000) costs exactly the same as sampling (0, 0).
/// </summary>
public sealed class InfiniteValueNoise2D
{
    private readonly string _seed;
    private readonly int _regionScale;

    /// <param name="regionScale">Cells per lattice unit - roughly how large a biome region reads as.</param>
    public InfiniteValueNoise2D(string seed, int regionScale)
    {
        if (regionScale < 1) throw new ArgumentOutOfRangeException(nameof(regionScale), "regionScale must be >= 1");
        _seed = seed;
        _regionScale = regionScale;
    }

    /// <summary>Sample the noise field at integer cell coordinates. Result is in [0, 1).</summary>
    public double Sample(int x, int y)
    {
        var (ix, tx) = LatticeIndexAndFraction(x);
        var (iy, ty) = LatticeIndexAndFraction(y);

        var v00 = LatticeValue(ix, iy);
        var v10 = LatticeValue(ix + 1, iy);
        var v01 = LatticeValue(ix, iy + 1);
        var v11 = LatticeValue(ix + 1, iy + 1);

        var sx = Smoothstep(tx);
        var sy = Smoothstep(ty);
        var top = Lerp(v00, v10, sx);
        var bottom = Lerp(v01, v11, sx);
        return Lerp(top, bottom, sy);
    }

    /// <summary>
    /// Splits a cell coordinate into its surrounding lattice index and the
    /// fractional offset within that lattice cell, using floor division (not
    /// C#'s truncating "/") so negative coordinates land in the correct
    /// lattice cell instead of all clustering toward zero.
    /// </summary>
    private (int index, double fraction) LatticeIndexAndFraction(int coordinate)
    {
        var index = (int)Math.Floor((double)coordinate / _regionScale);
        var fraction = (coordinate - (index * _regionScale)) / (double)_regionScale;
        return (index, fraction);
    }

    private double LatticeValue(int latticeX, int latticeY) =>
        new Rng($"{_seed}:lattice:{latticeX}:{latticeY}").Float();

    private static double Smoothstep(double t) => t * t * (3 - 2 * t);

    private static double Lerp(double a, double b, double t) => a + (b - a) * t;
}
