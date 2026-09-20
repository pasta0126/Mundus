namespace Mundus.Core;

public sealed record DungeonCell(int X, int Y);

/// <summary>A boss or treasure standing on a cell; <paramref name="Id"/> is a <see cref="DungeonCatalog"/> entry.</summary>
public sealed record DungeonMark(string Id, int X, int Y);

/// <summary>A single-floor dungeon: pure function of (map seed, point coordinate, point type).</summary>
public sealed record Dungeon
{
    /// <summary>See <see cref="DungeonGenerator.SpecVersion"/>.</summary>
    public required int SpecVersion { get; init; }
    public required string Seed { get; init; }
    public required int X { get; init; }
    public required int Y { get; init; }
    public required string Type { get; init; }
    public required DungeonStyle Style { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }

    /// <summary>One string per row, top to bottom: '#' is wall, '.' is floor.</summary>
    public required IReadOnlyList<string> Rows { get; init; }
    public required DungeonCell Entrance { get; init; }
    public required DungeonMark FinalBoss { get; init; }
    public required IReadOnlyList<DungeonMark> Bosses { get; init; }
    public required IReadOnlyList<DungeonMark> Treasures { get; init; }

    /// <summary>Beside the final boss.</summary>
    public required DungeonMark Hoard { get; init; }
}
