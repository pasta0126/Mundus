namespace Mundus.Core;

/// <summary>
/// Assigned from two independent values - elevation and moisture - via
/// the fixed table in <see cref="MapGenerator"/>. Unlike a single
/// ordered scalar, there's no total order across all ten values here;
/// adjacency is governed by each of the two underlying fields varying
/// smoothly, not by declaration order. Reordering or removing a value is
/// still a breaking change to <see cref="Map.SpecVersion"/> (it changes
/// what an existing seed's cells decode to), but declaration order
/// itself carries no generation meaning.
/// </summary>
public enum Biome
{
    Ocean,
    Beach,
    Desert,
    Grassland,
    Swamp,
    Tundra,
    Forest,
    Rainforest,
    Mountains,
    Snow,
}
