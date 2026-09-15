namespace Mundus.Core;

/// <summary>
/// Ordered biome bands, low terrain value to high - see
/// <see cref="MapGenerator"/>'s threshold table. The order is part of the
/// generation contract: which biomes can border which is determined by
/// adjacency in this sequence, not assigned independently. Reordering or
/// removing a value is a breaking change to <see cref="Map.SpecVersion"/>.
/// </summary>
public enum Biome
{
    Ocean,
    Beach,
    Grassland,
    Forest,
    Tundra,
    Snow,
}
