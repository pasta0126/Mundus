using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class MapGeneratorTests
{
    [Fact]
    public void SameSeedAndWindowProduceIdenticalMaps()
    {
        var a = MapGenerator.Generate("middle-earth", 0, 0, 32, 32);
        var b = MapGenerator.Generate("middle-earth", 0, 0, 32, 32);
        Assert.Equal(a.Cells, b.Cells);
    }

    [Fact]
    public void DifferentSeedsProduceDifferentMaps()
    {
        var a = MapGenerator.Generate("seed-a", 0, 0, 32, 32);
        var b = MapGenerator.Generate("seed-b", 0, 0, 32, 32);
        Assert.NotEqual(a.Cells, b.Cells);
    }

    [Fact]
    public void AWindowReturnsExactlyItsRequestedCells()
    {
        const int originX = 10;
        const int originY = -20;
        const int width = 8;
        const int height = 5;
        var map = MapGenerator.Generate("window-shape", originX, originY, width, height);

        Assert.Equal(width * height, map.Cells.Count);
        var coords = map.Cells.Select(c => (c.X, c.Y)).ToHashSet();
        for (var x = originX; x < originX + width; x++)
        {
            for (var y = originY; y < originY + height; y++)
            {
                Assert.Contains((x, y), coords);
            }
        }
    }

    [Fact]
    public void NegativeOriginIsValid()
    {
        var map = MapGenerator.Generate("negative-origin", -50, -50, 4, 4);
        Assert.Equal(-50, map.OriginX);
        Assert.Equal(-50, map.OriginY);
        Assert.All(map.Cells, c => Assert.InRange(c.X, -50, -47));
        Assert.All(map.Cells, c => Assert.InRange(c.Y, -50, -47));
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(1, 0)]
    [InlineData(513, 10)]
    [InlineData(10, 513)]
    public void OutOfRangeWindowDimensionsAreRejected(int width, int height)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => MapGenerator.Generate("bad-window", 0, 0, width, height));
    }

    [Fact]
    public void ACellsBiomeIsIndependentOfWhichWindowRequestedIt()
    {
        // A cell far from the origin, requested with no prior request for
        // this seed, must match the same cell as seen inside a larger
        // window that contains it - see map-generation spec,
        // "Location-independent generation".
        const string seed = "location-independence";
        var farWindow = MapGenerator.Generate(seed, 10_000, -10_000, 16, 16);
        var containingWindow = MapGenerator.Generate(seed, 9_990, -10_010, 40, 40);

        var containingByCoord = containingWindow.Cells.ToDictionary(c => (c.X, c.Y));
        foreach (var cell in farWindow.Cells)
        {
            Assert.Equal(cell.Biome, containingByCoord[(cell.X, cell.Y)].Biome);
        }
    }

    [Fact]
    public void OverlappingWindowsAgreeOnTheirOverlap()
    {
        const string seed = "overlap-agreement";
        var a = MapGenerator.Generate(seed, 0, 0, 20, 20);
        var b = MapGenerator.Generate(seed, 10, 10, 20, 20);

        var aByCoord = a.Cells.ToDictionary(c => (c.X, c.Y));
        var overlapping = b.Cells.Where(c => c.X < 20 && c.Y < 20);
        foreach (var cell in overlapping)
        {
            Assert.Equal(cell.Biome, aByCoord[(cell.X, cell.Y)].Biome);
        }
    }

    [Fact]
    public void EveryCellHasABiomeFromTheDocumentedSet()
    {
        var map = MapGenerator.Generate("biome-set", 0, 0, 64, 64);
        var allowed = new[]
        {
            Biome.Ocean, Biome.Beach, Biome.Desert, Biome.Grassland, Biome.Swamp,
            Biome.Tundra, Biome.Forest, Biome.Rainforest, Biome.Mountains, Biome.Snow,
        };
        Assert.All(map.Cells, c => Assert.Contains(c.Biome, allowed));
    }

    [Theory]
    [InlineData(true)] // elevation
    [InlineData(false)] // moisture
    public void NeighboringCellsHaveCloserValuesThanRandomCells(bool elevation)
    {
        const string seed = "coherence";
        const int width = 64;
        const int height = 64;
        var rng = new Rng("coherence-sampler");
        Func<string, int, int, double> sample = elevation
            ? (s, x, y) => MapGenerator.ElevationAt(s, x, y)
            : (s, x, y) => MapGenerator.MoistureAt(s, x, y);

        double neighborDeltaSum = 0;
        var neighborCount = 0;
        var coords = new List<(int X, int Y)>();
        for (var x = 0; x < width; x++)
        {
            for (var y = 0; y < height; y++)
            {
                coords.Add((x, y));
                var value = sample(seed, x, y);
                foreach (var (dx, dy) in new[] { (1, 0), (0, 1) })
                {
                    var (nx, ny) = (x + dx, y + dy);
                    if (nx >= width || ny >= height) continue;
                    var neighborValue = sample(seed, nx, ny);
                    neighborDeltaSum += Math.Abs(value - neighborValue);
                    neighborCount++;
                }
            }
        }

        double randomDeltaSum = 0;
        for (var i = 0; i < neighborCount; i++)
        {
            var a = coords[rng.Int(0, coords.Count - 1)];
            var b = coords[rng.Int(0, coords.Count - 1)];
            randomDeltaSum += Math.Abs(sample(seed, a.X, a.Y) - sample(seed, b.X, b.Y));
        }

        var neighborAverage = neighborDeltaSum / neighborCount;
        var randomAverage = randomDeltaSum / neighborCount;
        Assert.True(neighborAverage < randomAverage, $"neighbor avg {neighborAverage} was not less than random avg {randomAverage}");
    }

    [Fact]
    public void WaterBodiesCanSpanALargeArea()
    {
        // Find a seed whose (0,0) cell is Ocean, then confirm the
        // connected Ocean region around it covers a large fraction of a
        // big window - continent-scale, not a lake - via flood fill.
        string? oceanSeed = null;
        for (var i = 0; i < 50; i++)
        {
            var candidate = $"ocean-search-{i}";
            if (MapGenerator.Generate(candidate, -2, -2, 4, 4).Cells.First(c => c is { X: 0, Y: 0 }).Biome == Biome.Ocean)
            {
                oceanSeed = candidate;
                break;
            }
        }

        Assert.NotNull(oceanSeed);

        const int size = 200;
        var map = MapGenerator.Generate(oceanSeed!, -size / 2, -size / 2, size, size);
        var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y), c => c.Biome);

        var visited = new HashSet<(int, int)>();
        var queue = new Queue<(int, int)>();
        queue.Enqueue((0, 0));
        visited.Add((0, 0));
        while (queue.Count > 0)
        {
            var (x, y) = queue.Dequeue();
            foreach (var (dx, dy) in new[] { (1, 0), (-1, 0), (0, 1), (0, -1) })
            {
                var next = (x + dx, y + dy);
                if (visited.Contains(next)) continue;
                if (!byCoord.TryGetValue(next, out var biome) || biome != Biome.Ocean) continue;
                visited.Add(next);
                queue.Enqueue(next);
            }
        }

        // A lake-scale body (the old regionScale=32 behavior) would top
        // out around a few hundred cells; a continent-scale ocean at the
        // current regionScale=512 should comfortably exceed that within
        // a 200x200 window.
        Assert.True(visited.Count > 1000, $"connected Ocean region was only {visited.Count} cells");
    }

    [Fact]
    public void SameSeedWindowAndStepProduceIdenticalMaps()
    {
        var a = MapGenerator.Generate("stride-determinism", 0, 0, 16, 16, step: 4);
        var b = MapGenerator.Generate("stride-determinism", 0, 0, 16, 16, step: 4);
        Assert.Equal(a.Cells, b.Cells);
    }

    [Fact]
    public void StepSpacesReturnedCellsByWorldCoordinate()
    {
        const int originX = 100;
        const int originY = -40;
        const int step = 8;
        var map = MapGenerator.Generate("stride-shape", originX, originY, 5, 3, step);

        var coords = map.Cells.Select(c => (c.X, c.Y)).ToHashSet();
        for (var i = 0; i < 5; i++)
        {
            for (var j = 0; j < 3; j++)
            {
                Assert.Contains((originX + (i * step), originY + (j * step)), coords);
            }
        }
    }

    [Fact]
    public void StepOneMatchesDefaultBehavior()
    {
        var withDefault = MapGenerator.Generate("stride-default", 5, -5, 10, 10);
        var withExplicitStepOne = MapGenerator.Generate("stride-default", 5, -5, 10, 10, step: 1);
        Assert.Equal(withDefault.Cells, withExplicitStepOne.Cells);
    }

    [Fact]
    public void OverlappingSteppedWindowsAgreeOnSharedWorldCoordinates()
    {
        // Two windows at the same step, offset so their sampled world
        // coordinates partially coincide, must agree at every coordinate
        // they share - the same location-independence guarantee as
        // step=1, just over a sparser grid of world coordinates.
        const int step = 4;
        var a = MapGenerator.Generate("stride-overlap", 0, 0, 10, 10, step);
        var b = MapGenerator.Generate("stride-overlap", 20, 20, 10, 10, step);

        var aByCoord = a.Cells.ToDictionary(c => (c.X, c.Y), c => c.Biome);
        var sharedCount = 0;
        foreach (var cell in b.Cells)
        {
            if (aByCoord.TryGetValue((cell.X, cell.Y), out var biome))
            {
                Assert.Equal(biome, cell.Biome);
                sharedCount++;
            }
        }

        Assert.True(sharedCount > 0, "expected the two windows to share at least one sampled coordinate");
    }

    [Fact]
    public void HigherStepStillProducesEveryDocumentedBiome()
    {
        // Filtering out fine octaves at high strides (to avoid aliasing -
        // see InfiniteValueNoise2D.Sample) must not collapse the biome
        // variety down to just the coarsest bands.
        HashSet<Biome> seen = [];
        for (var i = 0; i < 60 && seen.Count < 10; i++)
        {
            var map = MapGenerator.Generate($"stride-variety-{i}", -256, -256, 512, 512, step: 8);
            foreach (var cell in map.Cells) seen.Add(cell.Biome);
        }

        Assert.Equal(10, seen.Count);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(257)]
    public void OutOfRangeStepIsRejected(int step)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => MapGenerator.Generate("bad-step", 0, 0, 4, 4, step));
    }

    [Fact]
    public void CoastlinesAreNotAlwaysBeach()
    {
        // Not every Beach-band cell should render as sand - some
        // stretches are wild land meeting the water directly, or a cliff
        // (Mountains) - see design.md "Coast styles: not every shore is
        // a beach".
        HashSet<Biome> seenAtCoastElevation = [];
        for (var i = 0; i < 30 && seenAtCoastElevation.Count < 2; i++)
        {
            var map = MapGenerator.Generate($"coast-variety-{i}", -256, -256, 512, 512);
            foreach (var cell in map.Cells)
            {
                var elevation = MapGenerator.ElevationAt(map.Seed, cell.X, cell.Y);
                if (elevation is >= 0.42 and < 0.46)
                {
                    seenAtCoastElevation.Add(cell.Biome);
                }
            }
        }

        Assert.True(seenAtCoastElevation.Count > 1, $"expected more than one biome at coast elevation, saw: {string.Join(", ", seenAtCoastElevation)}");
    }

    [Fact]
    public void MountainsOnlyAppearNearAPlateBoundary()
    {
        // Every Mountains/Snow cell in a window must sit on (or right
        // next to) a plate seam - see "Mountain ranges as plate
        // boundaries" in design.md - not scattered wherever elevation
        // happens to be high.
        var map = MapGenerator.Generate("plate-gate-check", -256, -256, 512, 512);
        var sawAny = false;
        foreach (var cell in map.Cells)
        {
            if (cell.Biome is not (Biome.Mountains or Biome.Snow)) continue;
            sawAny = true;
            var edge = MapGenerator.PlateEdgeAt(map.Seed, cell.X, cell.Y);
            Assert.True(edge > 0, $"({cell.X}, {cell.Y}) was {cell.Biome} but had no plate-edge proximity");
        }

        Assert.True(sawAny, "expected at least one Mountains/Snow cell in this window to make the check meaningful");
    }

    [Fact]
    public void WarpedElevationAndMoistureLookupsAreDeterministic()
    {
        // ElevationAt/MoistureAt now warp the lookup coordinate (see
        // organic-terrain-edges) - confirm that stays a pure function of
        // (seed, x, y) across repeated calls, same as before the warp.
        const string seed = "warp-determinism";
        for (var i = 0; i < 20; i++)
        {
            var x = i * 37;
            var y = -i * 19;
            Assert.Equal(MapGenerator.ElevationAt(seed, x, y), MapGenerator.ElevationAt(seed, x, y));
            Assert.Equal(MapGenerator.MoistureAt(seed, x, y), MapGenerator.MoistureAt(seed, x, y));
        }
    }

    /// <summary>
    /// Scans rows `yMin..yMax` at each `x` in `xMin..xMax`, and for each
    /// row where `sample` crosses `threshold`, returns the interpolated
    /// x position of that crossing - a discretized boundary line.
    /// </summary>
    private static List<(int Y, double X)> FindBoundaryCrossings(Func<int, int, double> sample, double threshold, int xMin, int xMax, int yMin, int yMax)
    {
        var crossings = new List<(int Y, double X)>();
        for (var y = yMin; y <= yMax; y++)
        {
            double? previousValue = null;
            for (var x = xMin; x <= xMax; x++)
            {
                var value = sample(x, y);
                if (previousValue is { } prev && (prev < threshold) != (value < threshold))
                {
                    var t = (threshold - prev) / (value - prev);
                    crossings.Add((y, x - 1 + t));
                    break;
                }

                previousValue = value;
            }
        }

        return crossings;
    }

    /// <summary>
    /// Mean absolute deviation of each boundary point from a moving
    /// average of its neighbors - near zero for a smooth curve, larger
    /// for a ragged one.
    /// </summary>
    private static double BoundaryRaggedness(List<(int Y, double X)> crossings, int smoothWindow)
    {
        var half = smoothWindow / 2;
        double deviationSum = 0;
        var count = 0;
        for (var i = half; i < crossings.Count - half; i++)
        {
            var windowAverage = crossings.Skip(i - half).Take(smoothWindow).Average(c => c.X);
            deviationSum += Math.Abs(crossings[i].X - windowAverage);
            count++;
        }

        return count == 0 ? 0 : deviationSum / count;
    }

    [Fact]
    public void CoastlineBoundaryIsNotASmoothCurve()
    {
        // A dead-smooth coastline (the reported artifact) would have a
        // near-zero mean deviation from a locally smoothed version of
        // itself. 0.75 cells is comfortably below the several-cell
        // deviation the warp is designed to produce, while still clearly
        // above what a smooth bilinear-interpolated arc would show.
        const double minRaggedness = 0.75;
        const int minCrossings = 40;

        for (var i = 0; i < 30; i++)
        {
            var seed = $"coastline-raggedness-{i}";
            var crossings = FindBoundaryCrossings((x, y) => MapGenerator.ElevationAt(seed, x, y), threshold: 0.42, xMin: -150, xMax: 150, yMin: 0, yMax: 199);
            if (crossings.Count < minCrossings) continue;

            var raggedness = BoundaryRaggedness(crossings, smoothWindow: 7);
            Assert.True(raggedness > minRaggedness, $"seed {seed}: coastline raggedness {raggedness} was not above {minRaggedness}");
            return;
        }

        Assert.Fail("no seed in range produced a long enough coastline stretch to test");
    }

    [Fact]
    public void MoistureBoundaryIsNotASmoothCurve()
    {
        const double minRaggedness = 0.75;
        const int minCrossings = 40;

        for (var i = 0; i < 30; i++)
        {
            var seed = $"moisture-raggedness-{i}";
            var crossings = FindBoundaryCrossings((x, y) => MapGenerator.MoistureAt(seed, x, y), threshold: 0.35, xMin: -150, xMax: 150, yMin: 0, yMax: 199);
            if (crossings.Count < minCrossings) continue;

            var raggedness = BoundaryRaggedness(crossings, smoothWindow: 7);
            Assert.True(raggedness > minRaggedness, $"seed {seed}: moisture boundary raggedness {raggedness} was not above {minRaggedness}");
            return;
        }

        Assert.Fail("no seed in range produced a long enough moisture-boundary stretch to test");
    }

    [Fact]
    public void CoastlinesDoNotProduceIsolatedSingleCellPonds()
    {
        // Regression for the InlandFloor stray-pond suppression (Map.cs)
        // staying intact now that elevation-band lookups are warped: a
        // fine-detail dip deep inland must still be suppressed rather
        // than reading as an isolated one-cell pond.
        for (var i = 0; i < 20; i++)
        {
            var seed = $"stray-pond-check-{i}";
            var map = MapGenerator.Generate(seed, -128, -128, 256, 256);
            var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y), c => c.Biome);
            foreach (var cell in map.Cells)
            {
                if (cell.Biome != Biome.Ocean) continue;
                var hasWaterNeighbor = new[] { (1, 0), (-1, 0), (0, 1), (0, -1) }
                    .Any(d => byCoord.TryGetValue((cell.X + d.Item1, cell.Y + d.Item2), out var n) && n is Biome.Ocean or Biome.Beach);
                Assert.True(hasWaterNeighbor, $"({cell.X},{cell.Y}) in seed {seed} is an isolated single-cell Ocean pond");
            }
        }
    }

    [Fact]
    public void BandProportionsStayWithinSaneBoundsAcrossSeeds()
    {
        // Warping bends band boundaries but must not systematically
        // distort how much of the map each band covers - e.g. Ocean
        // collapsing to near-0% or near-100% across many independent
        // seeds/windows would signal the warp is dominating the
        // elevation signal rather than just roughening its edges. A
        // single window's Ocean fraction varies naturally (some windows
        // are all-land), so this checks the aggregate across many.
        var oceanCells = 0;
        var totalCells = 0;
        for (var i = 0; i < 20; i++)
        {
            var seed = $"band-proportions-{i}";
            var map = MapGenerator.Generate(seed, -128, -128, 256, 256);
            oceanCells += map.Cells.Count(c => c.Biome == Biome.Ocean);
            totalCells += map.Cells.Count;
        }

        var oceanFraction = oceanCells / (double)totalCells;
        Assert.InRange(oceanFraction, 0.05, 0.95);
    }
}
