using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class PointOfInterestGeneratorTests
{
    private const string Seed = "poi-fixed";
    private const int Step = 4;

    private static readonly (int X, int Y)[] Cardinal = [(1, 0), (-1, 0), (0, 1), (0, -1)];
    private static readonly (int X, int Y)[] Compass = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)];

    private static PointsOfInterest Window(string seed, int x, int y, int w, int h, int step = Step, string? category = null) =>
        PointOfInterestGenerator.Generate(seed, x, y, w, h, step, category);

    private static Biome Biome_(string seed, int x, int y) => MapGenerator.BiomeAt(seed, x, y, Step);

    /// <summary>Many seeds' worth of points, so every rule below has real samples to check.</summary>
    private static IEnumerable<(string Seed, PointOfInterest Point)> ManyPoints(int seeds = 25)
    {
        for (var i = 0; i < seeds; i++)
        {
            var seed = $"poi-many-{i}";
            foreach (var p in Window(seed, -1024, -1024, 512, 512).Points)
            {
                yield return (seed, p);
            }
        }
    }

    [Fact]
    public void SameSeedAndWindowProduceIdenticalPoints()
    {
        var a = Window(Seed, -1024, -1024, 512, 512);
        var b = Window(Seed, -1024, -1024, 512, 512);
        Assert.NotEmpty(a.Points);
        Assert.Equal(a.Points, b.Points);
    }

    [Fact]
    public void DifferentSeedsCanProduceDifferentPoints()
    {
        Assert.NotEqual(Window(Seed, -1024, -1024, 512, 512).Points, Window("poi-other", -1024, -1024, 512, 512).Points);
    }

    [Fact]
    public void EveryPointIsACatalogEntryOfItsOwnCategory()
    {
        var seen = ManyPoints().ToList();
        Assert.NotEmpty(seen);
        Assert.All(seen, s =>
        {
            var entry = PointOfInterestCatalog.Find(s.Point.Type);
            Assert.NotNull(entry);
            Assert.Equal(entry!.Category, s.Point.Category);
        });
    }

    [Fact]
    public void RolesAndTiersAgreeWithTheCatalog()
    {
        foreach (var (_, p) in ManyPoints())
        {
            var entry = PointOfInterestCatalog.Find(p.Type)!;
            switch (p.Role)
            {
                case PoiRole.Single:
                    Assert.NotEqual(PoiKind.Anchor, entry.Kind);
                    Assert.Null(p.Tier);
                    break;
                case PoiRole.Anchor:
                    Assert.Equal(PoiKind.Anchor, entry.Kind);
                    Assert.Equal(entry.Tier, p.Tier);
                    break;
                case PoiRole.Satellite:
                    Assert.NotNull(p.Tier);
                    Assert.Equal(PointOfInterestCatalog.Settlements, p.Category);
                    Assert.Contains(PointOfInterestCatalog.SpecOf(p.Tier!.Value).Services, s => s.Id == p.Type);
                    break;
            }
        }
    }

    [Fact]
    public void OverlappingWindowsAgreeOnSharedPoints()
    {
        const int x = -1024;
        const int y = -1024;
        const int margin = PointOfInterestGenerator.EdgeMargin * Step;
        var checkedAny = false;
        for (var i = 0; i < 12; i++)
        {
            var seed = $"poi-overlap-{i}";
            var full = Window(seed, x, y, 512, 512);
            var sub = Window(seed, x, y, 300, 300);

            // A point is returned whenever it falls within a window's bounds
            // plus a fixed edge margin - so what the small window returns must
            // be exactly the full window's points inside that same region.
            var expected = full.Points
                .Where(p => p.X >= x - margin && p.X < x + (300 * Step) + margin && p.Y >= y - margin && p.Y < y + (300 * Step) + margin)
                .ToHashSet();
            Assert.Equal(expected, sub.Points.ToHashSet());
            checkedAny |= expected.Count > 0;
        }

        Assert.True(checkedAny, "no seed produced points in the overlap - the comparison was vacuous");
    }

    [Fact]
    public void PointsDoNotDependOnTheWindowTheyAreRequestedThrough()
    {
        // Two windows sharing the region x in [-1024, 512): a point in it must
        // be identical whichever window found it - satellites included.
        var wide = Window(Seed, -1536, -1024, 512, 512).Points.ToHashSet();
        var shifted = Window(Seed, -1024, -1024, 512, 512).Points.Where(p => p.X < 512).ToList();
        Assert.NotEmpty(shifted);
        Assert.All(shifted, p => Assert.Contains(p, wide));
    }

    [Fact]
    public void EveryPointSitsOnABiomeItsCatalogEntryAllows()
    {
        foreach (var (seed, p) in ManyPoints())
        {
            var biome = Biome_(seed, p.X, p.Y);
            var entry = PointOfInterestCatalog.Find(p.Type)!;
            if (p.Role == PoiRole.Satellite)
            {
                // Services stay on the ground their anchor stands on - never in the sea.
                Assert.NotEqual(Biome.Ocean, biome);
            }
            else
            {
                Assert.True(entry.Biomes.Contains(biome), $"{p.Type} placed on {biome}");
            }
        }
    }

    [Fact]
    public void SeaIconsAreOnlyPlacedOnOcean()
    {
        var sea = ManyPoints(60).Where(s => s.Point.Category == PointOfInterestCatalog.Sea).ToList();
        Assert.NotEmpty(sea);
        Assert.All(sea, s => Assert.Equal(Biome.Ocean, Biome_(s.Seed, s.Point.X, s.Point.Y)));
    }

    [Fact]
    public void ReliefIconsAreOnlyPlacedOnTheirBiomes()
    {
        var relief = ManyPoints(120).Where(s => s.Point.Category == PointOfInterestCatalog.Relief).ToList();
        Assert.NotEmpty(relief);
        Assert.All(relief, s => Assert.Contains(Biome_(s.Seed, s.Point.X, s.Point.Y), PointOfInterestCatalog.Find(s.Point.Type)!.Biomes));
    }

    [Fact]
    public void TerrainPlacementRulesHold()
    {
        // Every rare-geometry icon that shows up must satisfy its rule.
        var checkedTypes = new HashSet<string>();
        foreach (var (seed, p) in ManyPoints(200))
        {
            var entry = PointOfInterestCatalog.Find(p.Type)!;
            int Water(int reach, (int X, int Y)[] dirs) => dirs.Count(d => Biome_(seed, p.X + (d.X * reach), p.Y + (d.Y * reach)) == Biome.Ocean);
            int Land(int reach, (int X, int Y)[] dirs) => dirs.Count(d => Biome_(seed, p.X + (d.X * reach), p.Y + (d.Y * reach)) != Biome.Ocean
                || Biome_(seed, p.X + (d.X * reach / 2), p.Y + (d.Y * reach / 2)) != Biome.Ocean);

            switch (entry.Placement)
            {
                case Placement.Coast:
                    Assert.True(Water(8 * Step, Cardinal) >= 1, $"{p.Type} at ({p.X},{p.Y}) in {seed} is not on a coast");
                    break;
                case Placement.Cape:
                    Assert.True(Water(12 * Step, Cardinal) >= 3, $"{p.Type} at ({p.X},{p.Y}) in {seed} is not on a cape");
                    break;
                case Placement.Islet:
                    Assert.Equal(Compass.Length, Water(12 * Step, Compass));
                    break;
                case Placement.NearCoast:
                    Assert.True(Land(45 * Step, Compass) >= 1, $"{p.Type} at ({p.X},{p.Y}) in {seed} is far from any coast");
                    break;
                case Placement.OpenSea:
                    Assert.Equal(0, Land(50 * Step, Compass));
                    break;
                case Placement.Lake:
                    Assert.Equal(Biome.Ocean, Biome_(seed, p.X, p.Y));
                    // Enclosed: land on every side within 144 cells, and none closer than 24.
                    foreach (var (dx, dy) in Compass)
                    {
                        var firstLand = Enumerable.Range(1, 12).FirstOrDefault(k => Biome_(seed, p.X + (dx * 12 * Step * k), p.Y + (dy * 12 * Step * k)) != Biome.Ocean);
                        Assert.True(firstLand > 2, $"lake at ({p.X},{p.Y}) in {seed} is open water or too narrow (first land at stride {firstLand})");
                    }

                    break;
                default:
                    continue;
            }

            checkedTypes.Add(p.Type);
        }

        // Rules are only worth what they were checked on.
        Assert.Contains("lake", checkedTypes);
        Assert.Contains("island", checkedTypes);
        Assert.Contains("whirlpool", checkedTypes);
    }

    [Fact]
    public void SatellitesStayWithinTheirSettlementsRadius()
    {
        var checkedAny = false;
        for (var i = 0; i < 25; i++)
        {
            var seed = $"poi-cluster-{i}";
            var points = Window(seed, -1024, -1024, 512, 512).Points;
            var anchors = points.Where(p => p.Role == PoiRole.Anchor).ToList();
            foreach (var s in points.Where(p => p.Role == PoiRole.Satellite))
            {
                var radius = PointOfInterestCatalog.SpecOf(s.Tier!.Value).Radius * Step;
                var home = anchors.FirstOrDefault(a => a.Tier == s.Tier && Math.Abs(a.X - s.X) <= radius && Math.Abs(a.Y - s.Y) <= radius);
                // Only insist on an anchor if the satellite is far enough inside the window that its anchor cannot lie beyond the returned margin.
                var shrink = radius - (PointOfInterestGenerator.EdgeMargin * Step);
                var inner = s.X > -1024 + shrink && s.X < 1024 - shrink && s.Y > -1024 + shrink && s.Y < 1024 - shrink;
                if (inner)
                {
                    Assert.True(home is not null, $"satellite {s.Type} at ({s.X},{s.Y}) in {seed} has no {s.Tier} anchor within {radius}");
                    checkedAny = true;
                }
            }
        }

        Assert.True(checkedAny, "no satellites were found - the comparison was vacuous");
    }

    [Fact]
    public void CommonIconsOutnumberExceptionalOnes()
    {
        var counts = ManyPoints(120).GroupBy(s => s.Point.Type).ToDictionary(g => g.Key, g => g.Count());
        var common = PointOfInterestCatalog.Entries.Where(e => e.Kind != PoiKind.Service && e.Rarity == Rarity.Common && e.Category != PointOfInterestCatalog.Settlements)
            .Sum(e => counts.GetValueOrDefault(e.Id));
        var exceptional = PointOfInterestCatalog.Entries.Where(e => e.Rarity == Rarity.Exceptional).Sum(e => counts.GetValueOrDefault(e.Id));
        Assert.True(common > exceptional * 3, $"common={common} exceptional={exceptional}");
    }

    [Fact]
    public void LargerSettlementsAreRarerThanSmallOnes()
    {
        var anchors = ManyPoints(120).Where(s => s.Point.Role == PoiRole.Anchor).GroupBy(s => s.Point.Tier!.Value).ToDictionary(g => g.Key, g => g.Count());
        Assert.True(anchors.GetValueOrDefault(SettlementTier.Small) > anchors.GetValueOrDefault(SettlementTier.Medium));
        Assert.True(anchors.GetValueOrDefault(SettlementTier.Medium) > anchors.GetValueOrDefault(SettlementTier.Huge));
        Assert.True(anchors.GetValueOrDefault(SettlementTier.Point) > 0);
    }

    [Fact]
    public void CategoryFilterReturnsOnlyThatCategoryAndMatchesTheUnfilteredPoints()
    {
        var all = Window(Seed, -1024, -1024, 512, 512).Points;
        foreach (var category in PointOfInterestGenerator.Categories)
        {
            var filtered = Window(Seed, -1024, -1024, 512, 512, Step, category).Points;
            Assert.All(filtered, p => Assert.Equal(category, p.Category));
            Assert.Equal(all.Where(p => p.Category == category), filtered);
        }
    }

    [Theory]
    [InlineData(0, 32)]
    [InlineData(32, 0)]
    [InlineData(MapGenerator.MaxWindowDimension + 1, 32)]
    public void InvalidWindowDimensionsThrow(int width, int height)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Window("bad-window", 0, 0, width, height));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(MapGenerator.MaxStep + 1)]
    public void InvalidStepThrows(int step)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => Window("bad-step", 0, 0, 4, 4, step));
    }

    [Fact]
    public void UnknownCategoryThrows()
    {
        Assert.Throws<ArgumentException>(() => Window("bad-category", 0, 0, 4, 4, 1, "nonsense"));
    }
}
