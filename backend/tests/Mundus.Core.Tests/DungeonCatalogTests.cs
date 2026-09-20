using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class DungeonCatalogTests
{
    private static string ArtworkRoot() =>
        Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../../frontend/src/assets/dungeon"));

    /// <summary>Marks every dungeon shows besides its bosses and treasures.</summary>
    private static readonly string[] SharedMarks = ["entrance", "boss", "final-boss", "dungeon-badge"];

    /// <summary>Drawn for the sheet but not (yet) used by any catalog entry.</summary>
    private static readonly string[] Spare = ["skull-banner", "royal-crown", "sealed-scroll"];

    private static IEnumerable<string> CatalogArtwork() =>
        DungeonCatalog.Bosses.Select(b => b.Id)
            .Concat(DungeonCatalog.Treasures.Select(t => t.Id))
            .Append(DungeonCatalog.Hoard.Id)
            .Concat(DungeonCatalog.Styles.Select(s => $"style-{s.Id}"))
            .Concat(SharedMarks);

    [Fact]
    public void EveryCatalogEntryHasArtwork()
    {
        var root = ArtworkRoot();
        Assert.True(Directory.Exists(root), $"artwork folder not found: {root}");
        foreach (var id in CatalogArtwork())
        {
            Assert.True(File.Exists(Path.Combine(root, $"{id}.png")), $"missing {id}.png");
        }
    }

    [Fact]
    public void NoArtworkLacksAnEntry()
    {
        var known = CatalogArtwork().Concat(Spare).ToHashSet();
        foreach (var file in Directory.GetFiles(ArtworkRoot(), "*.png"))
        {
            Assert.Contains(Path.GetFileNameWithoutExtension(file), known);
        }
    }

    [Fact]
    public void EveryStyleIsNamed()
    {
        Assert.Equivalent(Enum.GetValues<DungeonStyle>(), DungeonCatalog.Styles.Select(s => s.Style));
    }
}
