using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class MapGeneratorTests
{
    private static readonly SizePreset[] AllPresets =
        [SizePreset.Small, SizePreset.Medium, SizePreset.Large, SizePreset.Huge];

    [Fact]
    public void SameSeedAndParametersProduceIdenticalMaps()
    {
        var a = MapGenerator.Generate("middle-earth", GridType.Square, SizePreset.Small);
        var b = MapGenerator.Generate("middle-earth", GridType.Square, SizePreset.Small);
        Assert.Equal(a.Cells, b.Cells);
    }

    [Fact]
    public void DifferentSeedsProduceDifferentMaps()
    {
        var a = MapGenerator.Generate("seed-a", GridType.Square, SizePreset.Small);
        var b = MapGenerator.Generate("seed-b", GridType.Square, SizePreset.Small);
        Assert.NotEqual(a.Cells, b.Cells);
    }

    [Theory]
    [InlineData(SizePreset.Small, 32, 32)]
    [InlineData(SizePreset.Medium, 64, 64)]
    [InlineData(SizePreset.Large, 128, 128)]
    [InlineData(SizePreset.Huge, 256, 256)]
    public void SizePresetDeterminesDimensions(SizePreset preset, int width, int height)
    {
        var map = MapGenerator.Generate("dimensions", GridType.Square, preset);
        Assert.Equal(width, map.Width);
        Assert.Equal(height, map.Height);
        Assert.Equal(width * height, map.Cells.Count);
    }

    [Fact]
    public void EveryCellHasValidElevation()
    {
        var map = MapGenerator.Generate("elevation-bounds", GridType.Square, SizePreset.Medium);
        Assert.All(map.Cells, cell => Assert.InRange(cell.Elevation, 0.0, 1.0));
    }

    [Theory]
    [InlineData(GridType.Square)]
    [InlineData(GridType.Hex)]
    public void NeighboringCellsHaveCloserElevationsThanRandomCells(GridType gridType)
    {
        var map = MapGenerator.Generate($"coherence-{gridType}", gridType, SizePreset.Medium);
        var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y));
        var rng = new Rng("coherence-sampler");

        double neighborDeltaSum = 0;
        var neighborCount = 0;
        foreach (var cell in map.Cells)
        {
            foreach (var (nx, ny) in GridNeighborsForTest(gridType, cell.X, cell.Y, map.Width, map.Height))
            {
                neighborDeltaSum += Math.Abs(cell.Elevation - byCoord[(nx, ny)].Elevation);
                neighborCount++;
            }
        }

        double randomDeltaSum = 0;
        var cellsList = map.Cells.ToList();
        for (var i = 0; i < neighborCount; i++)
        {
            var a = cellsList[rng.Int(0, cellsList.Count - 1)];
            var b = cellsList[rng.Int(0, cellsList.Count - 1)];
            randomDeltaSum += Math.Abs(a.Elevation - b.Elevation);
        }

        var neighborAverage = neighborDeltaSum / neighborCount;
        var randomAverage = randomDeltaSum / neighborCount;
        Assert.True(neighborAverage < randomAverage, $"neighbor avg {neighborAverage} was not less than random avg {randomAverage}");
    }

    [Fact]
    public void EveryLandCellSharesTheSameBiome()
    {
        var map = MapGenerator.Generate("uniform-land-biome", GridType.Square, SizePreset.Large);
        var landBiomes = map.Cells.Where(c => c.Biome != Biome.Ocean).Select(c => c.Biome).Distinct().ToList();
        Assert.True(landBiomes.Count <= 1, $"expected at most one land biome, found: {string.Join(',', landBiomes)}");
    }

    [Fact]
    public void GeneratedMapsTypicallyContainBothLandAndOcean()
    {
        // Not a hard guarantee (see design.md Risks) - but with the
        // configured grain counts, a large sample of seeds should
        // overwhelmingly produce both land and ocean cells.
        var withLand = 0;
        var withOcean = 0;
        const int sampleSize = 20;
        for (var i = 0; i < sampleSize; i++)
        {
            var map = MapGenerator.Generate($"sample-{i}", GridType.Square, SizePreset.Medium);
            if (map.Cells.Any(c => c.Biome != Biome.Ocean)) withLand++;
            if (map.Cells.Any(c => c.Biome == Biome.Ocean)) withOcean++;
        }

        Assert.True(withLand >= sampleSize - 2, $"only {withLand}/{sampleSize} samples had land");
        Assert.True(withOcean >= sampleSize - 2, $"only {withOcean}/{sampleSize} samples had ocean");
    }

    [Theory]
    [InlineData(GridType.Square)]
    [InlineData(GridType.Hex)]
    public void PresetsProduceReasonableGrainCounts(GridType gridType)
    {
        // Sanity check that every preset is wired up (no exceptions,
        // valid dimensions) rather than pinning exact grain counts.
        foreach (var preset in AllPresets)
        {
            var map = MapGenerator.Generate($"grain-sanity-{gridType}-{preset}", gridType, preset);
            var (width, height) = preset.Dimensions();
            Assert.Equal(width * height, map.Cells.Count);
        }
    }

    private static IEnumerable<(int X, int Y)> GridNeighborsForTest(GridType gridType, int x, int y, int width, int height)
    {
        (int Dx, int Dy)[] offsets = gridType == GridType.Square
            ? [(1, 0), (-1, 0), (0, 1), (0, -1)]
            : y % 2 == 0
                ? [(1, 0), (0, -1), (-1, -1), (-1, 0), (-1, 1), (0, 1)]
                : [(1, 0), (1, -1), (0, -1), (-1, 0), (0, 1), (1, 1)];

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
}
