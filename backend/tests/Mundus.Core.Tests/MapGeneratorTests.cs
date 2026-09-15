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
        for (var i = 0; i < 50 && seen.Count < 10; i++)
        {
            var map = MapGenerator.Generate($"stride-variety-{i}", -256, -256, 512, 512, step: 16);
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
}
