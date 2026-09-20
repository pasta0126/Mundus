using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class DungeonFlagTests
{
    private static IEnumerable<PointOfInterest> ManyPoints(int seeds = 40)
    {
        for (var i = 0; i < seeds; i++)
        {
            foreach (var p in PointOfInterestGenerator.Generate($"dungeon-flag-{i}", -2048, -2048, 512, 512, 8).Points)
            {
                yield return p;
            }
        }
    }

    [Fact]
    public void OnlyMarkedIconsHoldDungeons()
    {
        var holders = ManyPoints().Where(p => p.Dungeon is not null).ToList();
        Assert.NotEmpty(holders);
        Assert.All(holders, p => Assert.NotNull(PointOfInterestCatalog.Find(p.Type)!.Dungeon));
    }

    [Fact]
    public void SettlementServicesNeverHoldDungeons()
    {
        foreach (var e in PointOfInterestCatalog.Entries.Where(e => e.Kind == PoiKind.Service))
        {
            Assert.Null(e.Dungeon);
        }
    }

    [Fact]
    public void MarkingChangesNeitherIdsNorRarity()
    {
        // The marks are layered over the entries, so an icon keeps everything else it had.
        var cave = PointOfInterestCatalog.Find("cave")!;
        Assert.Equal(Rarity.Uncommon, cave.Rarity);
        Assert.Equal(PoiKind.Terrain, cave.Kind);
        Assert.Equal(DungeonStyle.Cave, cave.Dungeon!.Style);
    }

    [Fact]
    public void TheRollIsAFunctionOfSeedCoordinateAndTypeOnly()
    {
        for (var i = 0; i < 200; i++)
        {
            Assert.Equal(
                PointOfInterestGenerator.DungeonAt("roll", i * 7, -i * 3, "cave"),
                PointOfInterestGenerator.DungeonAt("roll", i * 7, -i * 3, "cave"));
        }
    }

    [Fact]
    public void OverlappingWindowsAgreeOnWhichPointsHoldDungeons()
    {
        var a = PointOfInterestGenerator.Generate("dungeon-overlap", -1024, -1024, 512, 512, 4).Points;
        var b = PointOfInterestGenerator.Generate("dungeon-overlap", -768, -768, 512, 512, 4).Points;
        var byPosition = b.ToDictionary(p => (p.X, p.Y, p.Type));
        var shared = 0;
        foreach (var p in a)
        {
            if (byPosition.TryGetValue((p.X, p.Y, p.Type), out var other))
            {
                shared++;
                Assert.Equal(p.Dungeon, other.Dungeon);
            }
        }

        Assert.True(shared > 0, "the windows should share points");
    }

    [Theory]
    [InlineData("dragon")]
    [InlineData("skull-cave")]
    [InlineData("dark-castle")]
    public void LairsAlwaysHoldOne(string type)
    {
        for (var i = 0; i < 200; i++)
        {
            Assert.NotNull(PointOfInterestGenerator.DungeonAt("lair", i, i * 2, type));
        }
    }

    [Fact]
    public void NotEveryCaveHoldsADungeon()
    {
        var caves = Enumerable.Range(0, 400).Select(i => PointOfInterestGenerator.DungeonAt("caves", i * 13, i * 5, "cave")).ToList();
        Assert.Contains(caves, d => d is not null);
        Assert.Contains(caves, d => d is null);
    }

    [Fact]
    public void UnmarkedTypesNeverHoldOne()
    {
        for (var i = 0; i < 100; i++)
        {
            Assert.Null(PointOfInterestGenerator.DungeonAt("none", i, i, "cottage"));
        }
    }
}
