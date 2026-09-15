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
    [InlineData(257, 10)]
    [InlineData(10, 257)]
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
        var allowed = new[] { Biome.Ocean, Biome.Beach, Biome.Grassland, Biome.Forest, Biome.Tundra, Biome.Snow };
        Assert.All(map.Cells, c => Assert.Contains(c.Biome, allowed));
    }

    [Fact]
    public void NeighboringCellsHaveCloserTerrainValuesThanRandomCells()
    {
        const string seed = "coherence";
        const int width = 64;
        const int height = 64;
        var rng = new Rng("coherence-sampler");

        double neighborDeltaSum = 0;
        var neighborCount = 0;
        var coords = new List<(int X, int Y)>();
        for (var x = 0; x < width; x++)
        {
            for (var y = 0; y < height; y++)
            {
                coords.Add((x, y));
                var value = MapGenerator.TerrainValueAt(seed, x, y);
                foreach (var (dx, dy) in new[] { (1, 0), (0, 1) })
                {
                    var (nx, ny) = (x + dx, y + dy);
                    if (nx >= width || ny >= height) continue;
                    var neighborValue = MapGenerator.TerrainValueAt(seed, nx, ny);
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
            randomDeltaSum += Math.Abs(MapGenerator.TerrainValueAt(seed, a.X, a.Y) - MapGenerator.TerrainValueAt(seed, b.X, b.Y));
        }

        var neighborAverage = neighborDeltaSum / neighborCount;
        var randomAverage = randomDeltaSum / neighborCount;
        Assert.True(neighborAverage < randomAverage, $"neighbor avg {neighborAverage} was not less than random avg {randomAverage}");
    }
}
