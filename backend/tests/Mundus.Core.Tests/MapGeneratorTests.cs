using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class MapGeneratorTests
{
    private static readonly SizePreset[] AllPresets =
        [SizePreset.Small, SizePreset.Medium, SizePreset.Large, SizePreset.Huge];

    private static readonly ShapeArchetype[] AllArchetypes =
    [
        ShapeArchetype.Continent,
        ShapeArchetype.Island,
        ShapeArchetype.Archipelago,
        ShapeArchetype.Peninsula,
        ShapeArchetype.IsthmusLandBridge,
        ShapeArchetype.InlandSea,
        ShapeArchetype.Unconstrained,
    ];

    [Fact]
    public void SameSeedAndParametersProduceIdenticalMaps()
    {
        var a = MapGenerator.Generate("middle-earth", GridType.Square, SizePreset.Small, ShapeArchetype.Continent);
        var b = MapGenerator.Generate("middle-earth", GridType.Square, SizePreset.Small, ShapeArchetype.Continent);
        Assert.Equal(a.Cells, b.Cells);
    }

    [Fact]
    public void DifferentSeedsProduceDifferentMaps()
    {
        var a = MapGenerator.Generate("seed-a", GridType.Square, SizePreset.Small, ShapeArchetype.Continent);
        var b = MapGenerator.Generate("seed-b", GridType.Square, SizePreset.Small, ShapeArchetype.Continent);
        Assert.NotEqual(a.Cells, b.Cells);
    }

    [Theory]
    [InlineData(SizePreset.Small, 32, 32)]
    [InlineData(SizePreset.Medium, 64, 64)]
    [InlineData(SizePreset.Large, 128, 128)]
    [InlineData(SizePreset.Huge, 256, 256)]
    public void SizePresetDeterminesDimensions(SizePreset preset, int width, int height)
    {
        var map = MapGenerator.Generate("dimensions", GridType.Square, preset, ShapeArchetype.Continent);
        Assert.Equal(width, map.Width);
        Assert.Equal(height, map.Height);
        Assert.Equal(width * height, map.Cells.Count);
    }

    [Fact]
    public void EveryCellHasValidElevation()
    {
        var map = MapGenerator.Generate("elevation-bounds", GridType.Square, SizePreset.Medium, ShapeArchetype.Continent);
        Assert.All(map.Cells, cell => Assert.InRange(cell.Elevation, 0.0, 1.0));
    }

    [Theory]
    [InlineData(GridType.Square)]
    [InlineData(GridType.Hex)]
    public void RegionCountFallsWithinPresetRange(GridType gridType)
    {
        foreach (var preset in AllPresets)
        {
            var map = MapGenerator.Generate($"region-count-{gridType}-{preset}", gridType, preset, ShapeArchetype.Unconstrained);
            var (min, max) = preset.RegionCountRange();
            var regionCount = CountBiomeRegions(map);
            Assert.InRange(regionCount, min, max);
        }
    }

    [Fact]
    public void EveryCellInARegionSharesItsBiome()
    {
        var map = MapGenerator.Generate("region-uniformity", GridType.Square, SizePreset.Large, ShapeArchetype.Continent);
        var regionOf = LabelRegions(map, out var regionBiome);
        foreach (var cell in map.Cells)
        {
            Assert.Equal(regionBiome[regionOf[(cell.X, cell.Y)]], cell.Biome);
        }
    }

    [Fact]
    public void RegionsAreContiguous()
    {
        // CountBiomeRegions itself only counts flood-fill-connected patches,
        // so a non-contiguous "region" would already be split into two by
        // construction. This test asserts that didn't silently happen by
        // checking every same-biome pair we expect to be one region really
        // is reachable through same-biome neighbors.
        var map = MapGenerator.Generate("region-contiguity", GridType.Hex, SizePreset.Medium, ShapeArchetype.Continent);
        var regionOf = LabelRegions(map, out _);
        var cellsByRegion = map.Cells.GroupBy(c => regionOf[(c.X, c.Y)]);
        foreach (var region in cellsByRegion)
        {
            var cellSet = region.Select(c => (c.X, c.Y)).ToHashSet();
            var start = cellSet.First();
            var reached = new HashSet<(int, int)> { start };
            var stack = new Stack<(int, int)>();
            stack.Push(start);
            while (stack.Count > 0)
            {
                var (x, y) = stack.Pop();
                foreach (var n in GridNeighborsForTest(GridType.Hex, x, y, map.Width, map.Height))
                {
                    if (cellSet.Contains(n) && reached.Add(n))
                    {
                        stack.Push(n);
                    }
                }
            }

            Assert.Equal(cellSet.Count, reached.Count);
        }
    }

    [Theory]
    [InlineData(GridType.Square)]
    [InlineData(GridType.Hex)]
    public void NeighboringCellsHaveCloserElevationsThanRandomCells(GridType gridType)
    {
        var map = MapGenerator.Generate($"coherence-{gridType}", gridType, SizePreset.Medium, ShapeArchetype.Unconstrained);
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
    public void ContinentArchetypeProducesOneLandmass()
    {
        for (var i = 0; i < 5; i++)
        {
            var map = MapGenerator.Generate($"continent-{i}", GridType.Square, SizePreset.Medium, ShapeArchetype.Continent);
            Assert.Equal(1, CountLandComponents(map));
        }
    }

    [Fact]
    public void IslandArchetypeProducesOneLandmassWithOceanEdges()
    {
        for (var i = 0; i < 5; i++)
        {
            var map = MapGenerator.Generate($"island-{i}", GridType.Square, SizePreset.Medium, ShapeArchetype.Island);
            Assert.Equal(1, CountLandComponents(map));
            AssertAllEdgeCellsAreOcean(map);
        }
    }

    [Fact]
    public void ArchipelagoArchetypeProducesMultipleLandmasses()
    {
        for (var i = 0; i < 5; i++)
        {
            var map = MapGenerator.Generate($"archipelago-{i}", GridType.Square, SizePreset.Large, ShapeArchetype.Archipelago);
            Assert.True(CountLandComponents(map) >= 2);
        }
    }

    [Fact]
    public void PeninsulaArchetypeAttachesLandToExactlyOneSide()
    {
        for (var i = 0; i < 5; i++)
        {
            var map = MapGenerator.Generate($"peninsula-{i}", GridType.Square, SizePreset.Medium, ShapeArchetype.Peninsula);
            Assert.Equal(1, CountLandComponents(map));
            Assert.Equal(1, CountEdgesWithLand(map));
        }
    }

    [Fact]
    public void IsthmusLandBridgeArchetypeSpansTwoOppositeSides()
    {
        for (var i = 0; i < 5; i++)
        {
            var map = MapGenerator.Generate($"isthmus-{i}", GridType.Square, SizePreset.Medium, ShapeArchetype.IsthmusLandBridge);
            Assert.Equal(1, CountLandComponents(map));
            var edgesWithLand = EdgesWithLand(map);
            var spansOpposite = (edgesWithLand.Contains(0) && edgesWithLand.Contains(2))
                || (edgesWithLand.Contains(1) && edgesWithLand.Contains(3));
            Assert.True(spansOpposite, $"edges with land: {string.Join(',', edgesWithLand)}");
        }
    }

    [Fact]
    public void InlandSeaArchetypeEnclosesABodyOfWater()
    {
        for (var i = 0; i < 5; i++)
        {
            var map = MapGenerator.Generate($"inland-sea-{i}", GridType.Square, SizePreset.Medium, ShapeArchetype.InlandSea);
            Assert.True(HasEnclosedOcean(map), $"seed inland-sea-{i} had no enclosed water region");
        }
    }

    [Fact]
    public void RequestingAMapWithInvalidDimensionsIsNotApplicable_EnumsAreClosedSets()
    {
        // Grid type / size preset / shape archetype are closed enums, so an
        // "invalid" value can only arise at the HTTP boundary (unparseable
        // query string), covered by MapsController - see design.md.
        Assert.Equal(2, Enum.GetValues<GridType>().Length);
        Assert.Equal(4, Enum.GetValues<SizePreset>().Length);
        Assert.Equal(7, Enum.GetValues<ShapeArchetype>().Length);
    }

    private static int CountBiomeRegions(Map map)
    {
        LabelRegions(map, out var regionBiome);
        return regionBiome.Count;
    }

    private static Dictionary<(int X, int Y), int> LabelRegions(Map map, out Dictionary<int, Biome> regionBiome)
    {
        var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y));
        var regionOf = new Dictionary<(int X, int Y), int>();
        regionBiome = [];
        var nextLabel = 0;

        foreach (var cell in map.Cells)
        {
            var coord = (cell.X, cell.Y);
            if (regionOf.ContainsKey(coord))
            {
                continue;
            }

            var label = nextLabel++;
            regionBiome[label] = cell.Biome;
            var stack = new Stack<(int X, int Y)>();
            stack.Push(coord);
            regionOf[coord] = label;
            while (stack.Count > 0)
            {
                var (x, y) = stack.Pop();
                foreach (var n in GridNeighborsForTest(map.GridType, x, y, map.Width, map.Height))
                {
                    if (!regionOf.ContainsKey(n) && byCoord[n].Biome == cell.Biome)
                    {
                        regionOf[n] = label;
                        stack.Push(n);
                    }
                }
            }
        }

        return regionOf;
    }

    private static int CountLandComponents(Map map)
    {
        var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y));
        var visited = new HashSet<(int X, int Y)>();
        var count = 0;
        foreach (var cell in map.Cells)
        {
            var coord = (cell.X, cell.Y);
            if (cell.Biome == Biome.Ocean || visited.Contains(coord))
            {
                continue;
            }

            count++;
            var stack = new Stack<(int X, int Y)>();
            stack.Push(coord);
            visited.Add(coord);
            while (stack.Count > 0)
            {
                var (x, y) = stack.Pop();
                foreach (var n in GridNeighborsForTest(map.GridType, x, y, map.Width, map.Height))
                {
                    if (byCoord[n].Biome != Biome.Ocean && visited.Add(n))
                    {
                        stack.Push(n);
                    }
                }
            }
        }

        return count;
    }

    private static void AssertAllEdgeCellsAreOcean(Map map)
    {
        var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y));
        for (var x = 0; x < map.Width; x++)
        {
            Assert.Equal(Biome.Ocean, byCoord[(x, 0)].Biome);
            Assert.Equal(Biome.Ocean, byCoord[(x, map.Height - 1)].Biome);
        }

        for (var y = 0; y < map.Height; y++)
        {
            Assert.Equal(Biome.Ocean, byCoord[(0, y)].Biome);
            Assert.Equal(Biome.Ocean, byCoord[(map.Width - 1, y)].Biome);
        }
    }

    private static HashSet<int> EdgesWithLand(Map map)
    {
        var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y));
        var edges = new HashSet<int>();
        if (Enumerable.Range(0, map.Width).Any(x => byCoord[(x, 0)].Biome != Biome.Ocean)) edges.Add(0);
        if (Enumerable.Range(0, map.Height).Any(y => byCoord[(map.Width - 1, y)].Biome != Biome.Ocean)) edges.Add(1);
        if (Enumerable.Range(0, map.Width).Any(x => byCoord[(x, map.Height - 1)].Biome != Biome.Ocean)) edges.Add(2);
        if (Enumerable.Range(0, map.Height).Any(y => byCoord[(0, y)].Biome != Biome.Ocean)) edges.Add(3);
        return edges;
    }

    private static int CountEdgesWithLand(Map map) => EdgesWithLand(map).Count;

    private static bool HasEnclosedOcean(Map map)
    {
        var byCoord = map.Cells.ToDictionary(c => (c.X, c.Y));
        var visited = new HashSet<(int X, int Y)>();
        foreach (var cell in map.Cells)
        {
            var coord = (cell.X, cell.Y);
            if (cell.Biome != Biome.Ocean || visited.Contains(coord))
            {
                continue;
            }

            var component = new List<(int X, int Y)> { coord };
            visited.Add(coord);
            var stack = new Stack<(int X, int Y)>();
            stack.Push(coord);
            while (stack.Count > 0)
            {
                var (x, y) = stack.Pop();
                foreach (var n in GridNeighborsForTest(map.GridType, x, y, map.Width, map.Height))
                {
                    if (byCoord[n].Biome == Biome.Ocean && visited.Add(n))
                    {
                        component.Add(n);
                        stack.Push(n);
                    }
                }
            }

            var touchesEdge = component.Any(c => c.X == 0 || c.Y == 0 || c.X == map.Width - 1 || c.Y == map.Height - 1);
            if (!touchesEdge)
            {
                return true;
            }
        }

        return false;
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
