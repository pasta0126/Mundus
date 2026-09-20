namespace Mundus.Core;

/// <summary>A boss that can guard a dungeon. Ids are frozen (they are also the artwork file names) - only ever append.</summary>
/// <param name="Styles">The layouts this boss may guard.</param>
public sealed record BossEntry(string Id, string Label, string Description, Rarity Rarity, IReadOnlyList<DungeonStyle> Styles)
{
    public int Weight => (int)Rarity;
}

/// <summary>A treasure that can lie in a dungeon. Ids are frozen (they are also the artwork file names) - only ever append.</summary>
public sealed record TreasureEntry(string Id, string Label, string Description, Rarity Rarity)
{
    public int Weight => (int)Rarity;
}

/// <summary>A dungeon layout with its user-facing name.</summary>
public sealed record DungeonStyleEntry(DungeonStyle Style, string Id, string Label, string Description);

/// <summary>
/// The single source of truth for what fills a dungeon: which bosses guard
/// which layouts, which treasures lie about, and how each layout is named.
/// The generator reads it and the API exposes it; ids are frozen.
/// </summary>
public static class DungeonCatalog
{
    private static readonly DungeonStyle[] CaveOnly = [DungeonStyle.Cave];
    private static readonly DungeonStyle[] HallsOnly = [DungeonStyle.Halls];
    private static readonly DungeonStyle[] MazeOnly = [DungeonStyle.Maze];
    private static readonly DungeonStyle[] CaveOrHalls = [DungeonStyle.Cave, DungeonStyle.Halls];

    public const string Dragon = "dragon";

    public static IReadOnlyList<BossEntry> Bosses { get; } =
    [
        new("giant-spider", "Giant spider", "Something patient waits in the webs", Rarity.Common, CaveOnly),
        new("bandit-chief", "Bandit chief", "A cutthroat with a hideout to defend", Rarity.Common, CaveOrHalls),
        new("wraith", "Wraith", "A restless shade bound to this place", Rarity.Common, HallsOnly),
        new("thorn-warden", "Thorn warden", "A knot of living briars guarding the heart", Rarity.Common, MazeOnly),
        new("cave-troll", "Cave troll", "A hulking brute that has never seen daylight", Rarity.Uncommon, CaveOnly),
        new("stone-golem", "Stone golem", "A guardian carved to outlast its makers", Rarity.Uncommon, HallsOnly),
        new("skeleton-king", "Skeleton king", "A dead ruler still holding court", Rarity.Uncommon, HallsOnly),
        new("minotaur", "Minotaur", "A horned beast that hunts the corridors", Rarity.Uncommon, MazeOnly),
        new("crystal-elemental", "Crystal elemental", "A living heap of humming crystal", Rarity.Rare, CaveOnly),
        new("lich", "Lich", "A sorcerer who refused to die", Rarity.Rare, HallsOnly),
        new(Dragon, "Dragon", "A fire-breathing wyrm", Rarity.Exceptional, CaveOrHalls),
    ];

    /// <summary>What can be drawn for a treasure spot; the hoard is not among them (see <see cref="Hoard"/>).</summary>
    public static IReadOnlyList<TreasureEntry> Treasures { get; } =
    [
        new("coin-purse", "Coin purse", "A few coins someone never came back for", Rarity.Common),
        new("chest", "Treasure chest", "Iron-banded, and still locked", Rarity.Common),
        new("gem-cache", "Gem cache", "Loose stones glittering in the dust", Rarity.Uncommon),
        new("old-blade", "Old blade", "A weapon from a forgotten war", Rarity.Uncommon),
        new("tome", "Forgotten tome", "Pages no living scholar has read", Rarity.Rare),
        new("golden-idol", "Golden idol", "Heavy, ancient, and surely cursed", Rarity.Rare),
        new("lost-crown", "Lost crown", "It belonged to someone who is still missed", Rarity.Rare),
        new("relic", "Ancient relic", "It hums with a power no one remembers", Rarity.Exceptional),
    ];

    /// <summary>Always lies beside the final boss; never drawn by rarity.</summary>
    public static TreasureEntry Hoard { get; } = new("hoard", "Hoard", "A mountain of gold beneath its keeper", Rarity.Exceptional);

    public static IReadOnlyList<DungeonStyleEntry> Styles { get; } =
    [
        new(DungeonStyle.Cave, "cave", "Cavern", "Winding passages worn by water and time"),
        new(DungeonStyle.Halls, "halls", "Halls", "Chambers and corridors built by hands long gone"),
        new(DungeonStyle.Maze, "maze", "Maze", "One true path, and many ways to get lost"),
    ];

    public static BossEntry? FindBoss(string id) => Bosses.FirstOrDefault(b => b.Id == id);

    public static TreasureEntry? FindTreasure(string id) => id == Hoard.Id ? Hoard : Treasures.FirstOrDefault(t => t.Id == id);
}
