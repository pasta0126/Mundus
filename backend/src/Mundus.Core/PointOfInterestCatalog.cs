namespace Mundus.Core;

/// <summary>How often an icon may show up, as the weight it carries against the other icons valid at the same spot (habitual / escaso / raro / excepcional).</summary>
public enum Rarity
{
    Common = 100,
    Uncommon = 35,
    Rare = 10,
    Exceptional = 2,
}

/// <summary>How an icon is placed on the map.</summary>
public enum PoiKind
{
    /// <summary>Loose scatter, tied to its biomes (relief, vegetation, sea features).</summary>
    Terrain,

    /// <summary>Heads a settlement of <see cref="PoiEntry.Tier"/>; a Point-tier anchor is a lone icon.</summary>
    Anchor,

    /// <summary>Only ever a satellite of a settlement cluster, never on its own.</summary>
    Service,

    /// <summary>Isolated and scarce: monuments and legends.</summary>
    Singular,
}

/// <summary>Size of a population core: decides the icons around it and how far it spreads.</summary>
public enum SettlementTier
{
    /// <summary>Puntual - one lone icon: a camp, a tower, a signpost.</summary>
    Point,

    /// <summary>Pequeño - a hamlet.</summary>
    Small,

    /// <summary>Mediano - a town.</summary>
    Medium,

    /// <summary>Grande - a city.</summary>
    Large,

    /// <summary>Enorme - a capital.</summary>
    Huge,
}

/// <summary>Terrain geometry a spot must satisfy beyond its biome, checked by ray probes.</summary>
public enum Placement
{
    Anywhere,

    /// <summary>Land with open sea within a few cells.</summary>
    Coast,

    /// <summary>Land jutting into the sea - ocean on at least three sides.</summary>
    Cape,

    /// <summary>Land surrounded by sea - an islet (sea in at least seven of the eight directions).</summary>
    Islet,

    /// <summary>Water enclosed by land on every side - a lake, not a sea.</summary>
    Lake,

    /// <summary>Sea, with land somewhere near.</summary>
    NearCoast,

    /// <summary>Sea with no land near - open water.</summary>
    OpenSea,

    /// <summary>Land with water (sea or lake) close by.</summary>
    Waterside,
}

/// <summary>The layout a dungeon is built as, chosen by the kind of place that holds it.</summary>
public enum DungeonStyle
{
    /// <summary>Organic, winding passages: caves, caverns and mines.</summary>
    Cave,

    /// <summary>Rooms joined by corridors: ruins, temples, castles, towers and lairs.</summary>
    Halls,

    /// <summary>A perfect maze, one path between any two cells: hedge mazes.</summary>
    Maze,
}

/// <summary>That an icon can hold a dungeon: its layout, and the chance that a given point of that type does.</summary>
public sealed record DungeonSpec(DungeonStyle Style, double Chance);

/// <param name="Id">Also the artwork's file stem: assets/poi/&lt;id&gt;.png.</param>
/// <param name="Category">A layer the user can switch on/off - one of <see cref="PointOfInterestCatalog.Categories"/>.</param>
/// <param name="Tier">Only for <see cref="PoiKind.Anchor"/>.</param>
/// <remarks>See <see cref="PoiEntry.Enabled"/> for retiring an icon without deleting it.</remarks>
public sealed record PoiEntry(
    string Id,
    string Label,
    string Description,
    string Category,
    PoiKind Kind,
    Rarity Rarity,
    IReadOnlyList<Biome> Biomes,
    Placement Placement = Placement.Anywhere,
    SettlementTier? Tier = null)
{
    public int Weight => (int)Rarity;

    /// <summary>Set for the icons that can hold a dungeon (see <see cref="PointOfInterestCatalog"/>); null for the rest. Marking an icon changes nothing about where it is placed.</summary>
    public DungeonSpec? Dungeon { get; init; }

    /// <summary>False for a retired icon: it stays in the catalog and keeps its artwork, but the generator never places it.</summary>
    public bool Enabled { get; init; } = true;
}

public sealed record PoiCategory(string Id, string Label);

/// <param name="Id">A catalog entry - usually a Service, but lone icons such as a cottage can appear too.</param>
public sealed record ServiceSlot(string Id, int Min, int Max);

/// <param name="Rarity">How often a core of this size shows up against the other sizes.</param>
/// <param name="Radius">How far the satellites spread around the anchor, in cells at step 1 - which is also screen pixels, since the map is drawn at 1px per sampled cell at every zoom (zooming out widens `step`). Sized so icons of about 30px fit inside without overlapping.</param>
public sealed record SettlementSpec(SettlementTier Tier, Rarity Rarity, int Radius, IReadOnlyList<ServiceSlot> Services)
{
    public int Weight => (int)Rarity;
}

/// <summary>
/// The single source of truth for every points-of-interest icon: which
/// layer it belongs to, how it is placed, where it may sit and how often.
/// The generator reads it; the API exposes it and the frontend derives its
/// legend and layer toggles from it. Ids are frozen: they are artwork file
/// names and part of the determinism contract - only ever append.
/// </summary>
public static class PointOfInterestCatalog
{
    public const string Relief = "relief";
    public const string Nature = "nature";
    public const string Sea = "sea";
    public const string Settlements = "settlements";
    public const string Heritage = "heritage";
    public const string Legends = "legends";

    public static IReadOnlyList<PoiCategory> Categories { get; } =
    [
        new(Relief, "Relief & geology"),
        new(Nature, "Nature & wildlife"),
        new(Sea, "Sea & islands"),
        new(Settlements, "Settlements"),
        new(Heritage, "Monuments & ruins"),
        new(Legends, "Legends & mysteries"),
    ];

    private static readonly Biome[] Mountain = [Biome.Mountains, Biome.Snow];
    private static readonly Biome[] Woods = [Biome.Forest, Biome.Rainforest];
    private static readonly Biome[] Cold = [Biome.Tundra, Biome.Snow];
    private static readonly Biome[] OpenWater = [Biome.Ocean];
    private static readonly Biome[] Homeland = [Biome.Grassland, Biome.Forest];
    private static readonly Biome[] Fertile = [Biome.Grassland, Biome.Forest, Biome.Beach];
    private static readonly Biome[] Plains = [Biome.Grassland];
    private static readonly Biome[] Dry = [Biome.Desert];

    /// <summary>Land a legend or monument may stand on.</summary>
    private static readonly Biome[] Land =
    [
        Biome.Beach, Biome.Desert, Biome.Grassland, Biome.Swamp, Biome.Tundra,
        Biome.Forest, Biome.Rainforest, Biome.Mountains, Biome.Snow,
    ];

    private static PoiEntry Entry(string id, string label, string description, string category, PoiKind kind, Rarity rarity, Biome[] biomes, Placement placement = Placement.Anywhere, SettlementTier? tier = null) =>
        new(id, label, description, category, kind, rarity, biomes, placement, tier);

    /// <summary>
    /// Icons switched off for now: still catalogued (their placement rules and
    /// artwork stay in place) but never generated. To bring one back, remove
    /// its id here.
    /// </summary>
    private static readonly HashSet<string> Retired =
    [
        "archipelago", "desert", "canyon", "forest", "island", "lake", "mesa",
        "palm-islands", "pine-forest", "sailboat", "swamp",
    ];

    /// <summary>
    /// The icons that can hold a dungeon, with its layout and the chance that a
    /// given point of that type does (decided per point, see
    /// <see cref="PointOfInterestGenerator.DungeonAt"/>). Settlement services
    /// never hold one: a town's temple is part of the town. Lairs and dark
    /// castles always do.
    /// </summary>
    private static readonly Dictionary<string, DungeonSpec> Dungeons = new()
    {
        ["cave"] = new(DungeonStyle.Cave, 0.5),
        ["ice-cavern"] = new(DungeonStyle.Cave, 0.5),
        ["crystal-cave"] = new(DungeonStyle.Cave, 0.5),
        ["mine"] = new(DungeonStyle.Cave, 0.5),
        ["skull-cave"] = new(DungeonStyle.Cave, 1.0),
        ["ruins"] = new(DungeonStyle.Halls, 0.5),
        ["hidden-temple"] = new(DungeonStyle.Halls, 0.5),
        ["wizard-tower"] = new(DungeonStyle.Halls, 0.5),
        ["dragon"] = new(DungeonStyle.Halls, 1.0),
        ["dark-castle"] = new(DungeonStyle.Halls, 1.0),
        ["hedge-maze"] = new(DungeonStyle.Maze, 0.5),
    };

    private static readonly PoiEntry[] AllEntries =
    [
        // -- Relief & geology --------------------------------------------------
        Entry("mountain-peak", "Mountain peak", "A lone, snow-capped summit", Relief, PoiKind.Terrain, Rarity.Common, Mountain),
        Entry("mountain-range", "Mountain range", "A chain of high peaks", Relief, PoiKind.Terrain, Rarity.Common, Mountain),
        Entry("volcano", "Volcano", "A smoking, lava-filled crater", Relief, PoiKind.Terrain, Rarity.Rare, [Biome.Mountains]),
        Entry("cave", "Cave", "A dark opening in the rock", Relief, PoiKind.Terrain, Rarity.Uncommon, [Biome.Mountains, Biome.Tundra]),
        Entry("canyon", "Canyon", "A river carving through red rock", Relief, PoiKind.Terrain, Rarity.Rare, [Biome.Desert, Biome.Tundra]),
        Entry("mesa", "Mesa", "Flat-topped rock towers", Relief, PoiKind.Terrain, Rarity.Rare, Dry),
        Entry("waterfall", "Waterfall", "Water tumbling down a cliff", Relief, PoiKind.Terrain, Rarity.Rare, [Biome.Mountains, Biome.Forest, Biome.Rainforest]),
        Entry("ice-cavern", "Ice cavern", "A frozen hollow of blue ice", Relief, PoiKind.Terrain, Rarity.Rare, Cold),
        Entry("crystals", "Crystal outcrop", "Purple crystals breaking through the rock", Relief, PoiKind.Terrain, Rarity.Rare, [Biome.Mountains, Biome.Desert]),

        // -- Nature & wildlife -------------------------------------------------
        Entry("forest", "Forest", "A dense stand of trees", Nature, PoiKind.Terrain, Rarity.Common, Woods),
        Entry("pine-forest", "Pine forest", "Tall evergreens, thick on cold ground", Nature, PoiKind.Terrain, Rarity.Common, [Biome.Forest, Biome.Tundra]),
        Entry("swamp", "Swamp", "Stagnant water and bare trees", Nature, PoiKind.Terrain, Rarity.Common, [Biome.Swamp]),
        Entry("lake", "Lake", "A broad lake ringed by woods", Nature, PoiKind.Terrain, Rarity.Uncommon, OpenWater, Placement.Lake),
        Entry("desert", "Dunes", "Sand, dunes and a few cacti", Nature, PoiKind.Terrain, Rarity.Common, Dry),
        Entry("oasis", "Oasis", "Palms and water in the wastes", Nature, PoiKind.Terrain, Rarity.Rare, Dry),
        Entry("dead-tree", "Dead tree", "A gnarled, lifeless tree", Nature, PoiKind.Terrain, Rarity.Uncommon, [Biome.Swamp, Biome.Tundra]),
        Entry("great-tree", "Great tree", "A colossal tree older than the kingdoms", Nature, PoiKind.Terrain, Rarity.Rare, [Biome.Forest, Biome.Rainforest, Biome.Grassland]),
        Entry("mushrooms", "Giant mushrooms", "A grove of towering fungi", Nature, PoiKind.Terrain, Rarity.Rare, [Biome.Forest, Biome.Rainforest, Biome.Swamp]),
        Entry("fossil", "Fossil bed", "Bones of something enormous", Nature, PoiKind.Terrain, Rarity.Rare, [Biome.Desert, Biome.Tundra]),
        Entry("deer", "Deer", "Game roaming the wild", Nature, PoiKind.Terrain, Rarity.Rare, [Biome.Forest, Biome.Grassland, Biome.Tundra]),

        // -- Sea & islands -----------------------------------------------------
        Entry("island", "Island", "A lone palm island", Sea, PoiKind.Terrain, Rarity.Uncommon, OpenWater, Placement.NearCoast),
        Entry("palm-islands", "Palm islands", "Sandy islets under palms", Sea, PoiKind.Terrain, Rarity.Uncommon, OpenWater, Placement.NearCoast),
        Entry("archipelago", "Archipelago", "A scatter of green islets", Sea, PoiKind.Terrain, Rarity.Uncommon, OpenWater, Placement.NearCoast),
        Entry("sea-stacks", "Sea stacks", "Rocks rising from the waves", Sea, PoiKind.Terrain, Rarity.Rare, OpenWater, Placement.NearCoast),
        Entry("whirlpool", "Whirlpool", "A churning maw in the open sea", Sea, PoiKind.Terrain, Rarity.Rare, OpenWater, Placement.OpenSea),
        Entry("fishing-spot", "Fishing grounds", "Shoals teeming with fish", Sea, PoiKind.Terrain, Rarity.Rare, OpenWater, Placement.NearCoast),
        Entry("shipwreck", "Shipwreck", "A vessel that never made port", Sea, PoiKind.Terrain, Rarity.Rare, OpenWater, Placement.NearCoast),

        // -- Settlements: lone points ------------------------------------------
        Entry("camp", "Camp", "A tent and a fire beside the trail", Settlements, PoiKind.Anchor, Rarity.Common, [Biome.Grassland, Biome.Forest, Biome.Tundra, Biome.Desert], tier: SettlementTier.Point),
        Entry("camp-flag", "Expedition camp", "A base camp flying its banner", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Tundra, Biome.Mountains, Biome.Desert, Biome.Grassland], tier: SettlementTier.Point),
        Entry("signpost", "Signpost", "A crossroads marker", Settlements, PoiKind.Anchor, Rarity.Common, Homeland, tier: SettlementTier.Point),
        Entry("wagon", "Caravan", "A covered wagon on the road", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Grassland, Biome.Desert, Biome.Tundra], tier: SettlementTier.Point),
        Entry("checkpoint", "Checkpoint", "A toll barrier across the road", Settlements, PoiKind.Anchor, Rarity.Uncommon, Plains, tier: SettlementTier.Point),
        Entry("watchtower", "Watchtower", "A wooden lookout", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Grassland, Biome.Tundra, Biome.Desert], tier: SettlementTier.Point),
        Entry("watchtower-forest", "Forest watchtower", "A lookout above the canopy", Settlements, PoiKind.Anchor, Rarity.Uncommon, Woods, tier: SettlementTier.Point),
        Entry("tower-stone", "Stone tower", "A lone fortified tower", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Grassland, Biome.Tundra, Biome.Mountains, Biome.Desert], tier: SettlementTier.Point),
        Entry("lighthouse", "Lighthouse", "A beacon on a headland", Settlements, PoiKind.Anchor, Rarity.Rare, Land, Placement.Cape, SettlementTier.Point),
        Entry("sea-lighthouse", "Island lighthouse", "A beacon on a rock in the waves", Settlements, PoiKind.Anchor, Rarity.Rare, Land, Placement.Islet, SettlementTier.Point),
        Entry("mine", "Mine", "A timbered shaft into the hill", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Mountains, Biome.Tundra], tier: SettlementTier.Point),
        Entry("pickaxe", "Quarry", "Ore and stone being worked", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Mountains, Biome.Tundra], tier: SettlementTier.Point),
        Entry("mine-cart", "Mining camp", "Carts laden with gold", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Mountains, Biome.Desert], tier: SettlementTier.Point),
        Entry("dock", "Pier", "A wooden pier and its fishing berths", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Beach, Biome.Grassland, Biome.Forest], Placement.Coast, SettlementTier.Point),
        Entry("cottage", "Cottage", "A lone thatched house", Settlements, PoiKind.Anchor, Rarity.Common, Homeland, tier: SettlementTier.Point),
        Entry("farm", "Farmstead", "A farm with its silo and fences", Settlements, PoiKind.Anchor, Rarity.Common, Plains, tier: SettlementTier.Point),

        // -- Settlements: cores ------------------------------------------------
        Entry("village", "Hamlet", "A small farming settlement", Settlements, PoiKind.Anchor, Rarity.Common, [Biome.Grassland, Biome.Forest, Biome.Beach, Biome.Tundra], tier: SettlementTier.Small),
        Entry("chapel-village", "Town", "A market town with its church", Settlements, PoiKind.Anchor, Rarity.Common, Fertile, tier: SettlementTier.Medium),
        Entry("castle-town", "City", "A walled city of red roofs", Settlements, PoiKind.Anchor, Rarity.Common, [Biome.Grassland, Biome.Beach], tier: SettlementTier.Large),
        Entry("gatehouse", "Fortified city", "A city behind a great gatehouse", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Grassland, Biome.Tundra], tier: SettlementTier.Large),
        Entry("palace", "Capital", "A royal capital with its palace", Settlements, PoiKind.Anchor, Rarity.Common, [Biome.Grassland, Biome.Beach], tier: SettlementTier.Huge),
        Entry("capitol-dome", "Grand capital", "A capital crowned by a golden dome", Settlements, PoiKind.Anchor, Rarity.Uncommon, [Biome.Grassland, Biome.Beach], tier: SettlementTier.Huge),

        // -- Settlements: services ---------------------------------------------
        Entry("tavern", "Tavern", "Ale, beds and rumours", Settlements, PoiKind.Service, Rarity.Common, Land),
        Entry("windmill", "Windmill", "Grinding the local grain", Settlements, PoiKind.Service, Rarity.Common, Land),
        Entry("fields", "Fields", "Farmland around the settlement", Settlements, PoiKind.Service, Rarity.Common, Land),
        Entry("stable", "Stable", "Horses for hire", Settlements, PoiKind.Service, Rarity.Common, Land),
        Entry("market", "Market", "Stalls and traders", Settlements, PoiKind.Service, Rarity.Common, Land),
        Entry("watermill", "Watermill", "A mill on a stream", Settlements, PoiKind.Service, Rarity.Uncommon, Land, Placement.Waterside),
        Entry("sailboat", "Harbor", "Sailing boats at anchor", Settlements, PoiKind.Service, Rarity.Common, Land, Placement.Coast),
        Entry("stone-bridge", "Bridge", "A stone bridge over the water", Settlements, PoiKind.Service, Rarity.Uncommon, Land, Placement.Waterside),
        Entry("temple", "Temple", "A house of the gods", Settlements, PoiKind.Service, Rarity.Common, Land),
        Entry("library", "Library", "Books and scholars", Settlements, PoiKind.Service, Rarity.Uncommon, Land),
        Entry("clock-tower", "Clock tower", "A civic landmark", Settlements, PoiKind.Service, Rarity.Uncommon, Land),
        Entry("colosseum", "Colosseum", "An arena for games", Settlements, PoiKind.Service, Rarity.Rare, Land),
        Entry("graveyard", "Graveyard", "Where the town lays its dead", Settlements, PoiKind.Service, Rarity.Common, Land),
        Entry("castle-blue", "Castle", "A castle with its garrison", Settlements, PoiKind.Service, Rarity.Rare, Land),
        Entry("fortress", "Fortress", "The city's great stronghold", Settlements, PoiKind.Service, Rarity.Rare, Land),

        // -- Monuments & ruins -------------------------------------------------
        Entry("ruins", "Ruins", "The remains of something older", Heritage, PoiKind.Singular, Rarity.Common, [Biome.Grassland, Biome.Desert, Biome.Forest, Biome.Tundra, Biome.Swamp]),
        Entry("monolith", "Monolith", "A standing stone carved with runes", Heritage, PoiKind.Singular, Rarity.Uncommon, Land),
        Entry("standing-stones", "Standing stones", "A circle of ancient megaliths", Heritage, PoiKind.Singular, Rarity.Uncommon, [Biome.Grassland, Biome.Tundra, Biome.Forest]),
        Entry("obelisk-stone", "Obelisk", "A weathered stone obelisk", Heritage, PoiKind.Singular, Rarity.Uncommon, [Biome.Grassland, Biome.Desert, Biome.Tundra]),
        Entry("obelisk-gold", "Golden obelisk", "An obelisk tipped in gold", Heritage, PoiKind.Singular, Rarity.Rare, [Biome.Grassland, Biome.Desert]),
        Entry("brazier", "Beacon", "A stone brazier that never goes out", Heritage, PoiKind.Singular, Rarity.Uncommon, [Biome.Grassland, Biome.Tundra, Biome.Mountains]),
        Entry("stone-arch", "Stone arch", "A natural or carved gateway", Heritage, PoiKind.Singular, Rarity.Uncommon, [Biome.Mountains, Biome.Desert, Biome.Beach]),
        Entry("hidden-temple", "Hidden temple", "A shrine lost in the wilds", Heritage, PoiKind.Singular, Rarity.Rare, [Biome.Rainforest, Biome.Forest, Biome.Swamp, Biome.Desert]),
        Entry("crystal-shrine", "Crystal shrine", "A shrine around a glowing crystal", Heritage, PoiKind.Singular, Rarity.Rare, [Biome.Mountains, Biome.Snow, Biome.Tundra]),
        Entry("compass-rock", "Compass rock", "A guide-stone marked with a compass", Heritage, PoiKind.Singular, Rarity.Rare, [Biome.Beach, Biome.Mountains, Biome.Grassland, Biome.Desert]),
        Entry("hedge-maze", "Hedge maze", "A garden labyrinth", Heritage, PoiKind.Singular, Rarity.Rare, Plains),

        // -- Legends & mysteries -----------------------------------------------
        Entry("dragon", "Dragon", "A fire-breathing wyrm", Legends, PoiKind.Singular, Rarity.Exceptional, [Biome.Mountains, Biome.Tundra, Biome.Desert]),
        Entry("sea-serpent", "Sea serpent", "Something large lives here", Legends, PoiKind.Singular, Rarity.Exceptional, OpenWater, Placement.OpenSea),
        Entry("portal", "Portal", "A gateway to somewhere else", Legends, PoiKind.Singular, Rarity.Exceptional, Land),
        Entry("wizard-tower", "Wizard's tower", "A tower crackling with arcane energy", Legends, PoiKind.Singular, Rarity.Rare, [Biome.Forest, Biome.Swamp, Biome.Mountains, Biome.Tundra]),
        Entry("skull-cave", "Skull cave", "A cave that no one comes back from", Legends, PoiKind.Singular, Rarity.Rare, [Biome.Mountains, Biome.Swamp, Biome.Tundra]),
        Entry("dark-castle", "Dark castle", "A fortress of shadow", Legends, PoiKind.Singular, Rarity.Exceptional, [Biome.Swamp, Biome.Tundra, Biome.Mountains]),
        Entry("dark-crystals", "Dark crystals", "Corrupted crystals humming with power", Legends, PoiKind.Singular, Rarity.Exceptional, [Biome.Tundra, Biome.Snow, Biome.Swamp, Biome.Mountains]),
        Entry("crystal-cave", "Crystal cave", "A cavern lined with glowing crystal", Legends, PoiKind.Singular, Rarity.Rare, Mountain),
        Entry("floating-island", "Floating island", "A castle drifting on the clouds", Legends, PoiKind.Singular, Rarity.Exceptional, Land),
        Entry("treasure", "Treasure", "Riches lost or buried", Legends, PoiKind.Singular, Rarity.Exceptional, Land),
        Entry("balloon", "Balloon", "A hot-air balloon adrift", Legends, PoiKind.Singular, Rarity.Exceptional, Plains),
    ];

    /// <summary>Every icon, in the order of the artwork sheet, retired ones included (see <see cref="PoiEntry.Enabled"/>). Ids are frozen - only ever append.</summary>
    public static IReadOnlyList<PoiEntry> Entries { get; } = AllEntries
        .Select(e => e with { Enabled = !Retired.Contains(e.Id), Dungeon = Dungeons.GetValueOrDefault(e.Id) })
        .ToList();

    /// <summary>What each core size contains: the icons that cluster around its anchor. Ordered small to huge.</summary>
    public static IReadOnlyList<SettlementSpec> SettlementSpecs { get; } =
    [
        new(SettlementTier.Point, Rarity.Uncommon, 0, []),
        new(SettlementTier.Small, Rarity.Common, 60,
        [
            new("cottage", 2, 4), new("farm", 0, 2), new("fields", 1, 3), new("windmill", 0, 1), new("tavern", 0, 1),
        ]),
        new(SettlementTier.Medium, Rarity.Uncommon, 85,
        [
            new("cottage", 3, 5), new("farm", 1, 3), new("fields", 2, 4), new("windmill", 0, 1), new("tavern", 1, 1),
            new("market", 1, 1), new("stable", 0, 1), new("temple", 0, 1), new("watermill", 0, 1), new("dock", 0, 1),
            new("sailboat", 0, 1), new("stone-bridge", 0, 1),
        ]),
        new(SettlementTier.Large, Rarity.Rare, 115,
        [
            new("cottage", 4, 6), new("farm", 1, 3), new("fields", 2, 4), new("tavern", 2, 2), new("market", 1, 2), new("stable", 1, 1),
            new("temple", 1, 1), new("library", 0, 1), new("clock-tower", 0, 1), new("graveyard", 0, 1), new("watermill", 0, 1),
            new("dock", 0, 2), new("sailboat", 0, 2), new("stone-bridge", 0, 1), new("castle-blue", 0, 1),
        ]),
        new(SettlementTier.Huge, Rarity.Exceptional, 150,
        [
            new("cottage", 6, 8), new("farm", 2, 4), new("fields", 3, 5), new("tavern", 3, 3), new("market", 2, 3), new("stable", 1, 2),
            new("temple", 1, 2), new("library", 1, 1), new("clock-tower", 1, 1), new("graveyard", 1, 1), new("colosseum", 0, 1),
            new("castle-blue", 0, 1), new("fortress", 1, 1), new("watermill", 0, 1), new("dock", 1, 3), new("sailboat", 1, 3),
            new("stone-bridge", 1, 2),
        ]),
    ];

    private static readonly Dictionary<string, PoiEntry> ById = Entries.ToDictionary(e => e.Id);

    public static PoiEntry? Find(string id) => ById.GetValueOrDefault(id);

    public static IEnumerable<PoiEntry> InCategory(string category) => Entries.Where(e => e.Category == category);

    public static SettlementSpec SpecOf(SettlementTier tier) => SettlementSpecs.First(s => s.Tier == tier);

    /// <summary>Anchor icons that can head a settlement of `tier` on `biome`.</summary>
    public static IEnumerable<PoiEntry> AnchorsFor(SettlementTier tier, Biome biome) =>
        Entries.Where(e => e.Kind == PoiKind.Anchor && e.Tier == tier && e.Biomes.Contains(biome));

    /// <summary>Whether `id` may be placed on `biome` (placement geometry aside).</summary>
    public static bool IsSuitable(string id, Biome biome) => Find(id)?.Biomes.Contains(biome) == true;
}
