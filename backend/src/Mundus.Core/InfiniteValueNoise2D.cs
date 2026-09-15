namespace Mundus.Core;

/// <summary>
/// Deterministic 2D fractal (fBm) value noise over an unbounded
/// coordinate space: several octaves of the same lattice-noise
/// technique, each at half the previous octave's region scale (double
/// the frequency) and half its amplitude, summed and normalized. A
/// single octave alone reads as smooth, same-sized blobs everywhere
/// (every region roughly `regionScale` cells across, no matter where you
/// look); layering finer octaves on top adds the local wiggle real
/// terrain has - small lakes inside a landmass, small islands offshore,
/// ragged coastlines - without disturbing the large-scale shape the base
/// octave already established. See design.md ("organic terrain").
///
/// Each lattice point's value is derived independently, in O(1), by
/// hashing the seed (plus an octave tag, so octaves don't correlate)
/// with that point's own coordinates - never precomputed into an array,
/// which would tie a value to its position in some bounded request (the
/// location-dependence the per-cell terrain model must avoid). Sampling
/// cell (1_000_000, -1_000_000) costs exactly the same as sampling
/// (0, 0).
/// </summary>
public sealed class InfiniteValueNoise2D
{
    private readonly string _seed;
    private readonly int _regionScale;
    private readonly int _octaves;
    private readonly double _persistence;

    // Neighboring cells - and every cell within the same lattice square -
    // share the same 4 surrounding lattice points, so a whole window's
    // worth of cells re-hits a tiny number of distinct (octave, x, y)
    // triples. Caching per-instance turns a window request from
    // O(cells * octaves) lattice hashes into O(lattice points actually
    // touched * octaves), which is what makes windows in the hundreds of
    // thousands of cells fast: this cache is scoped to one
    // InfiniteValueNoise2D instance (one field, for one Map.Generate
    // call), never shared across requests, so it can't leak
    // location-dependence between them.
    private readonly Dictionary<(int Octave, int X, int Y), double> _latticeCache = [];

    /// <param name="regionScale">Cells per lattice unit at the base (largest, first) octave - roughly how large the broadest terrain features read as.</param>
    /// <param name="octaves">How many layers to sum, each halving both region scale (doubling frequency) and amplitude versus the last.</param>
    /// <param name="persistence">Amplitude multiplier per octave (0, 1) - higher means finer octaves contribute more local detail relative to the base shape.</param>
    public InfiniteValueNoise2D(string seed, int regionScale, int octaves = 1, double persistence = 0.5)
    {
        if (regionScale < 1) throw new ArgumentOutOfRangeException(nameof(regionScale), "regionScale must be >= 1");
        if (octaves < 1) throw new ArgumentOutOfRangeException(nameof(octaves), "octaves must be >= 1");
        _seed = seed;
        _regionScale = regionScale;
        _octaves = octaves;
        _persistence = persistence;
    }

    /// <summary>
    /// Sample the noise field at integer cell coordinates. Result is in
    /// [0, 1).
    /// </summary>
    /// <param name="minRegionScale">
    /// Skip any octave whose region scale is smaller than this (default 1
    /// = include every octave). Set this to the caller's sampling stride
    /// (see <see cref="Map.MapGenerator"/>'s `step`) to avoid aliasing: an
    /// octave whose features are smaller than the gap between sampled
    /// points doesn't get smoothly captured - each sample lands at an
    /// effectively uncorrelated point of that octave, which reads as
    /// speckled noise instead of the smooth zoomed-out shape the coarser
    /// octaves already establish. Skipping those octaves (and
    /// renormalizing by only the amplitudes actually included) keeps a
    /// wide-stride sample smooth.
    /// </param>
    public double Sample(int x, int y, int minRegionScale = 1)
    {
        var total = 0.0;
        var amplitude = 1.0;
        var maxAmplitude = 0.0;
        var scale = _regionScale;
        for (var octave = 0; octave < _octaves; octave++)
        {
            // The base octave (0) always counts, even past minRegionScale,
            // so an extreme stride still gets a shape instead of NaN from
            // an empty sum.
            if (scale >= minRegionScale || octave == 0)
            {
                total += amplitude * SampleOctave(x, y, scale, octave);
                maxAmplitude += amplitude;
            }

            amplitude *= _persistence;
            scale = Math.Max(1, scale / 2);
        }

        return total / maxAmplitude;
    }

    private double SampleOctave(int x, int y, int regionScale, int octave)
    {
        var (ix, tx) = LatticeIndexAndFraction(x, regionScale);
        var (iy, ty) = LatticeIndexAndFraction(y, regionScale);

        var v00 = LatticeValue(ix, iy, octave);
        var v10 = LatticeValue(ix + 1, iy, octave);
        var v01 = LatticeValue(ix, iy + 1, octave);
        var v11 = LatticeValue(ix + 1, iy + 1, octave);

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
    private static (int index, double fraction) LatticeIndexAndFraction(int coordinate, int regionScale)
    {
        var index = (int)Math.Floor((double)coordinate / regionScale);
        var fraction = (coordinate - (index * regionScale)) / (double)regionScale;
        return (index, fraction);
    }

    private double LatticeValue(int latticeX, int latticeY, int octave)
    {
        var key = (octave, latticeX, latticeY);
        if (_latticeCache.TryGetValue(key, out var cached))
        {
            return cached;
        }

        var value = new Rng($"{_seed}:lattice:{octave}:{latticeX}:{latticeY}").Float();
        _latticeCache[key] = value;
        return value;
    }

    private static double Smoothstep(double t) => t * t * (3 - 2 * t);

    private static double Lerp(double a, double b, double t) => a + (b - a) * t;
}
