namespace Mundus.Core;

/// <summary>
/// Closed enum for now. Adding a value is backwards compatible for existing
/// seeds (their rolls don't land on the new value until it's added to the
/// weighted table in <see cref="WorldGenerator"/>), but reordering or
/// removing values changes what old seeds generate - treat that as a
/// breaking change requiring a <see cref="World.SpecVersion"/> bump.
/// </summary>
public enum Biome
{
    Forest,
    Desert,
    Tundra,
    Grassland,
    Swamp,
    Mountains,
    Ocean,
}

public enum WorldSize
{
    Small,
    Medium,
    Large,
}

/// <summary>
/// The World spec: the minimal, versioned shape every generator and client
/// agrees on. <see cref="SpecVersion"/> lets future breaking changes to
/// this shape be detected instead of silently misinterpreted.
/// </summary>
public sealed record World
{
    public required int SpecVersion { get; init; }
    public required string Seed { get; init; }
    public required WorldSize Size { get; init; }
    public required Biome Biome { get; init; }
}

/// <summary>
/// Generates a <see cref="World"/> from a seed. Same seed in -> identical
/// World out, always. Each facet (size, biome, ...) draws from its own
/// child stream so that adding a new facet later doesn't change the rolls
/// of existing ones.
/// </summary>
public static class WorldGenerator
{
    public const int CurrentSpecVersion = 1;

    private static readonly IReadOnlyList<Rng.WeightedItem<WorldSize>> SizeWeights =
    [
        new(WorldSize.Small, 3),
        new(WorldSize.Medium, 5),
        new(WorldSize.Large, 2),
    ];

    private static readonly IReadOnlyList<Rng.WeightedItem<Biome>> BiomeWeights =
        Enum.GetValues<Biome>().Select(b => new Rng.WeightedItem<Biome>(b, 1)).ToList();

    public static World Generate(string seed)
    {
        var rng = new Rng(seed);

        var size = rng.Child("size").Weighted(SizeWeights);
        var biome = rng.Child("biome").Weighted(BiomeWeights);

        return new World
        {
            SpecVersion = CurrentSpecVersion,
            Seed = seed,
            Size = size,
            Biome = biome,
        };
    }
}
