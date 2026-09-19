using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class PointOfInterestCatalogTests
{
    private static string ArtworkRoot() =>
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../../frontend/src/assets/poi"));

    private static readonly Biome[] WaterBiomes = [Biome.Ocean];

    [Fact]
    public void IdsAreUniqueKebabCase()
    {
        var ids = PointOfInterestCatalog.Entries.Select(e => e.Id).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
        Assert.All(ids, id => Assert.Matches("^[a-z]+(-[a-z]+)*$", id));
    }

    [Fact]
    public void EveryEntryHasArtwork()
    {
        var root = ArtworkRoot();
        Assert.True(Directory.Exists(root), $"artwork folder not found: {root}");
        foreach (var entry in PointOfInterestCatalog.Entries)
        {
            Assert.True(File.Exists(Path.Combine(root, $"{entry.Id}.png")), $"missing {entry.Id}.png");
        }
    }

    [Fact]
    public void NoArtworkIsLeftUncatalogued()
    {
        var known = PointOfInterestCatalog.Entries.Select(e => e.Id).ToHashSet();
        var files = Directory.GetFiles(ArtworkRoot(), "*.png").Select(f => Path.GetFileNameWithoutExtension(f)!);
        Assert.All(files, f => Assert.True(known.Contains(f), $"{f}.png has no catalog entry"));
    }

    [Fact]
    public void EveryEntryBelongsToADeclaredCategory()
    {
        var categories = PointOfInterestCatalog.Categories.Select(c => c.Id).ToHashSet();
        Assert.All(PointOfInterestCatalog.Entries, e => Assert.Contains(e.Category, categories));
        Assert.All(categories, c => Assert.NotEmpty(PointOfInterestCatalog.InCategory(c)));
    }

    [Fact]
    public void EveryEntryNamesAtLeastOneBiome()
    {
        Assert.All(PointOfInterestCatalog.Entries, e => Assert.NotEmpty(e.Biomes));
    }

    [Fact]
    public void OnlyAnchorsCarryATierAndEveryAnchorHasOne()
    {
        Assert.All(PointOfInterestCatalog.Entries, e => Assert.Equal(e.Kind == PoiKind.Anchor, e.Tier is not null));
    }

    [Fact]
    public void WaterPlacementsSitOnWaterAndLandPlacementsOnLand()
    {
        var water = new[] { Placement.Lake, Placement.NearCoast, Placement.OpenSea };
        var land = new[] { Placement.Coast, Placement.Cape, Placement.Islet, Placement.Waterside };
        foreach (var e in PointOfInterestCatalog.Entries)
        {
            if (water.Contains(e.Placement))
            {
                Assert.All(e.Biomes, b => Assert.Contains(b, WaterBiomes));
            }

            if (land.Contains(e.Placement))
            {
                Assert.DoesNotContain(Biome.Ocean, e.Biomes);
            }
        }
    }

    [Fact]
    public void EveryBiomeCanHostSomeScatteredIcon()
    {
        // A biome no icon may sit on would be a permanent blank on the map.
        foreach (var biome in Enum.GetValues<Biome>())
        {
            Assert.Contains(PointOfInterestCatalog.Entries, e => e.Kind is PoiKind.Terrain or PoiKind.Singular && e.Biomes.Contains(biome));
        }
    }

    [Fact]
    public void EveryTierHasAnAnchorAndASpec()
    {
        foreach (var tier in Enum.GetValues<SettlementTier>())
        {
            Assert.Contains(PointOfInterestCatalog.Entries, e => e.Kind == PoiKind.Anchor && e.Tier == tier);
            Assert.Single(PointOfInterestCatalog.SettlementSpecs, s => s.Tier == tier);
        }
    }

    [Fact]
    public void LargerCoresAreRarerAndSpreadWider()
    {
        var specs = PointOfInterestCatalog.SettlementSpecs.OrderBy(s => s.Tier).ToList();
        for (var i = 1; i < specs.Count; i++)
        {
            Assert.True(specs[i].Radius > specs[i - 1].Radius, $"{specs[i].Tier} must spread wider than {specs[i - 1].Tier}");
            // A lone point-size icon is not a step on the ladder: settlements are ranked from small up.
            if (specs[i - 1].Tier != SettlementTier.Point)
            {
                Assert.True(specs[i].Weight <= specs[i - 1].Weight, $"{specs[i].Tier} must be no more common than {specs[i - 1].Tier}");
            }
        }

        Assert.Equal(0, specs[0].Radius);
        Assert.Empty(specs[0].Services);
    }

    [Fact]
    public void ServiceSlotsReferenceRealNonScatteredIconsWithSaneCounts()
    {
        foreach (var spec in PointOfInterestCatalog.SettlementSpecs)
        {
            foreach (var slot in spec.Services)
            {
                var entry = PointOfInterestCatalog.Find(slot.Id);
                Assert.NotNull(entry);
                Assert.Equal(PointOfInterestCatalog.Settlements, entry!.Category);
                Assert.True(slot.Min >= 0 && slot.Max >= slot.Min && slot.Max > 0, $"{spec.Tier}/{slot.Id}: bad range {slot.Min}-{slot.Max}");
            }
        }
    }

    [Fact]
    public void LargerCoresNeverLoseAServiceTheirNeighborHasRequired()
    {
        // A capital must not be poorer than a city in what it *requires*.
        var specs = PointOfInterestCatalog.SettlementSpecs.Where(s => s.Tier >= SettlementTier.Small).OrderBy(s => s.Tier).ToList();
        for (var i = 1; i < specs.Count; i++)
        {
            foreach (var required in specs[i - 1].Services.Where(s => s.Min > 0))
            {
                var next = specs[i].Services.FirstOrDefault(s => s.Id == required.Id);
                Assert.True(next is not null && next.Min >= required.Min, $"{specs[i].Tier} must keep at least {required.Min} of {required.Id}");
            }
        }
    }

    [Fact]
    public void ServicesAreOnlyEverSatellites()
    {
        // Every Service entry must be used by at least one settlement spec, or it would never appear.
        var used = PointOfInterestCatalog.SettlementSpecs.SelectMany(s => s.Services).Select(s => s.Id).ToHashSet();
        Assert.All(PointOfInterestCatalog.Entries.Where(e => e.Kind == PoiKind.Service), e => Assert.Contains(e.Id, used));
    }

    [Fact]
    public void WeightsFollowTheRarityScale()
    {
        Assert.Equal(100, (int)Rarity.Common);
        Assert.Equal(35, (int)Rarity.Uncommon);
        Assert.Equal(10, (int)Rarity.Rare);
        Assert.Equal(2, (int)Rarity.Exceptional);
    }
}
