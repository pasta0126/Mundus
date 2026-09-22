using System.Text.Json;
using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class DungeonGeneratorTests
{
    private static readonly string[] Types = ["cave", "skull-cave", "mine", "ruins", "wizard-tower", "dark-castle", "dragon", "hedge-maze"];
    private static readonly string[] CaveTypes = ["cave", "skull-cave", "mine", "ice-cavern", "crystal-cave"];
    private static readonly (int X, int Y)[] Cardinal = [(1, 0), (-1, 0), (0, 1), (0, -1)];

    private static string Json(Dungeon d) => JsonSerializer.Serialize(d);

    private static bool Floor(Dungeon d, int x, int y) =>
        x >= 0 && y >= 0 && x < d.Width && y < d.Height && d.Rows[y][x] == '.';

    private static IEnumerable<(int X, int Y)> Cells(Dungeon d) =>
        Enumerable.Range(0, d.Height).SelectMany(y => Enumerable.Range(0, d.Width).Where(x => Floor(d, x, y)).Select(x => (x, y)));

    private static Dictionary<(int X, int Y), int> Distances(Dungeon d)
    {
        var dist = new Dictionary<(int X, int Y), int> { [(d.Entrance.X, d.Entrance.Y)] = 0 };
        var queue = new Queue<(int X, int Y)>([(d.Entrance.X, d.Entrance.Y)]);
        while (queue.Count > 0)
        {
            var c = queue.Dequeue();
            foreach (var s in Cardinal)
            {
                var n = (X: c.X + s.X, Y: c.Y + s.Y);
                if (Floor(d, n.X, n.Y) && !dist.ContainsKey(n))
                {
                    dist[n] = dist[c] + 1;
                    queue.Enqueue(n);
                }
            }
        }

        return dist;
    }

    private static IEnumerable<Dungeon> Many(int perType = 12) =>
        Types.SelectMany(t => Enumerable.Range(0, perType).Select(i => DungeonGenerator.Generate($"many-{i}", i * 37, -i * 11, t)));

    [Fact]
    public void SameInputsProduceTheSameDungeon()
    {
        foreach (var t in Types)
        {
            Assert.Equal(Json(DungeonGenerator.Generate("fixed", 10, -20, t)), Json(DungeonGenerator.Generate("fixed", 10, -20, t)));
        }
    }

    [Fact]
    public void ADifferentCoordinateGivesADifferentDungeon()
    {
        Assert.NotEqual(Json(DungeonGenerator.Generate("fixed", 10, -20, "cave")), Json(DungeonGenerator.Generate("fixed", 11, -20, "cave")));
    }

    [Fact]
    public void TheDungeonCarriesItsSpecVersionAndSource()
    {
        var d = DungeonGenerator.Generate("fixed", 3, 4, "ruins");
        Assert.Equal(DungeonGenerator.SpecVersion, d.SpecVersion);
        Assert.Equal(("fixed", 3, 4, "ruins", DungeonStyle.Halls), (d.Seed, d.X, d.Y, d.Type, d.Style));
    }

    [Fact]
    public void SizesStayWithinTheDocumentedBounds()
    {
        foreach (var d in Many())
        {
            Assert.InRange(d.Width, DungeonGenerator.MinSize, DungeonGenerator.MaxSize);
            Assert.InRange(d.Height, DungeonGenerator.MinSize, DungeonGenerator.MaxSize);
            Assert.Equal(d.Height, d.Rows.Count);
            Assert.All(d.Rows, r => Assert.Equal(d.Width, r.Length));
        }
    }

    [Fact]
    public void EverythingIsReachableFromTheOneEntrance()
    {
        foreach (var d in Many())
        {
            Assert.True(Floor(d, d.Entrance.X, d.Entrance.Y));
            var dist = Distances(d);
            Assert.Equal(Cells(d).Count(), dist.Count);
            foreach (var m in d.Treasures.Append(d.FinalBoss).Append(d.Hoard).Concat(d.Bosses))
            {
                Assert.True(dist.ContainsKey((m.X, m.Y)), $"{m.Id} at ({m.X},{m.Y}) is unreachable");
            }
        }
    }

    [Fact]
    public void TheFinalBossIsFarthestFromTheEntrance()
    {
        foreach (var d in Many())
        {
            var dist = Distances(d);
            Assert.Equal(dist.Values.Max(), dist[(d.FinalBoss.X, d.FinalBoss.Y)]);
        }
    }

    [Fact]
    public void LesserBossesLieBeyondTheMiddleOfTheRoute()
    {
        foreach (var d in Many())
        {
            var dist = Distances(d);
            var half = dist[(d.FinalBoss.X, d.FinalBoss.Y)] / 2;
            Assert.InRange(d.Bosses.Count, 0, 2);
            Assert.All(d.Bosses, b => Assert.True(dist[(b.X, b.Y)] >= half));
        }
    }

    [Fact]
    public void ADragonsLairIsGuardedByADragon()
    {
        for (var i = 0; i < 30; i++)
        {
            Assert.Equal("dragon", DungeonGenerator.Generate($"lair-{i}", i, i, "dragon").FinalBoss.Id);
        }
    }

    [Fact]
    public void BossesAreCatalogEntriesAllowedInTheStyle()
    {
        foreach (var d in Many())
        {
            foreach (var b in d.Bosses.Append(d.FinalBoss))
            {
                var entry = DungeonCatalog.FindBoss(b.Id);
                Assert.NotNull(entry);
                Assert.Contains(d.Style, entry!.Styles);
            }
        }
    }

    [Fact]
    public void TreasuresAreBoundedDistinctAndClearOfTheEntranceAndBosses()
    {
        foreach (var d in Many())
        {
            Assert.InRange(d.Treasures.Count, 3, 8);
            var occupied = d.Treasures.Append(d.Hoard).Append(d.FinalBoss).Concat(d.Bosses).Select(m => (m.X, m.Y)).Append((d.Entrance.X, d.Entrance.Y)).ToList();
            Assert.Equal(occupied.Count, occupied.Distinct().Count());
            Assert.All(d.Treasures, t => Assert.NotNull(DungeonCatalog.FindTreasure(t.Id)));
        }
    }

    [Fact]
    public void TheHoardLiesBesideTheFinalBoss()
    {
        foreach (var d in Many())
        {
            Assert.Equal("hoard", d.Hoard.Id);
            Assert.Equal(1, Math.Abs(d.Hoard.X - d.FinalBoss.X) + Math.Abs(d.Hoard.Y - d.FinalBoss.Y));
        }
    }

    [Fact]
    public void CommonTreasuresOutnumberExceptionalOnes()
    {
        var all = Many(30).SelectMany(d => d.Treasures).ToList();
        var common = all.Count(t => DungeonCatalog.FindTreasure(t.Id)!.Rarity == Rarity.Common);
        var exceptional = all.Count(t => DungeonCatalog.FindTreasure(t.Id)!.Rarity == Rarity.Exceptional);
        Assert.True(common > exceptional * 5, $"common {common} vs exceptional {exceptional}");
    }

    [Fact]
    public void AHedgeMazeHasExactlyOnePathBetweenAnyTwoCells()
    {
        for (var i = 0; i < 12; i++)
        {
            var d = DungeonGenerator.Generate($"maze-{i}", i, i, "hedge-maze");
            var cells = Cells(d).ToList();
            var edges = cells.Sum(c => Cardinal.Count(s => Floor(d, c.X + s.X, c.Y + s.Y))) / 2;
            Assert.Equal(cells.Count - 1, edges); // connected (checked elsewhere) and acyclic: a tree
        }
    }

    [Fact]
    public void RuinsAreRoomsJoinedByCorridors()
    {
        for (var i = 0; i < 12; i++)
        {
            var d = DungeonGenerator.Generate($"ruins-{i}", i, i, "ruins");
            var roomCells = Cells(d).Count(c => Cardinal.Count(s => Floor(d, c.X + s.X, c.Y + s.Y)) == 4);
            var corridorCells = Cells(d).Count(c => Cardinal.Count(s => Floor(d, c.X + s.X, c.Y + s.Y)) == 2);
            Assert.True(roomCells > 20, "expected open rooms");
            Assert.True(corridorCells > 5, "expected corridors");
        }
    }

    [Fact]
    public void ATypeThatCannotHoldADungeonIsRejected()
    {
        Assert.Throws<ArgumentException>(() => DungeonGenerator.Generate("s", 0, 0, "cottage"));
        Assert.Throws<ArgumentException>(() => DungeonGenerator.Generate("", 0, 0, "cave"));
    }

    [Fact]
    public void CavesAreNotAnOpenField()
    {
        for (var i = 0; i < 40; i++)
        {
            foreach (var t in CaveTypes)
            {
                var d = DungeonGenerator.Generate($"cave-open-{i}", i * 13, -i * 7, t);
                var share = (double)Cells(d).Count() / (d.Width * d.Height);
                Assert.InRange(share, 0.25, 0.45);
                Assert.False(HasOpenSquare(d, 10), $"{t} seed {i} has a 10x10 open block");
            }
        }
    }

    [Fact]
    public void CavesHaveNoSpecksOrPockets()
    {
        for (var i = 0; i < 40; i++)
        {
            foreach (var t in CaveTypes)
            {
                var d = DungeonGenerator.Generate($"cave-clean-{i}", i * 13, -i * 7, t);
                Assert.Equal(0, CountFloorPockets(d));
                Assert.Equal(0, CountWallSpecks(d));
            }
        }
    }

    [Fact]
    public void CavesAreDeterministicAcrossTypes()
    {
        foreach (var t in CaveTypes)
        {
            Assert.Equal(Json(DungeonGenerator.Generate("fixed-cave", 5, -9, t)), Json(DungeonGenerator.Generate("fixed-cave", 5, -9, t)));
        }
    }

    private static bool HasOpenSquare(Dungeon d, int size)
    {
        for (var x = 0; x <= d.Width - size; x++)
        {
            for (var y = 0; y <= d.Height - size; y++)
            {
                var all = true;
                for (var dx = 0; dx < size && all; dx++)
                {
                    for (var dy = 0; dy < size; dy++)
                    {
                        if (!Floor(d, x + dx, y + dy))
                        {
                            all = false;
                            break;
                        }
                    }
                }

                if (all)
                {
                    return true;
                }
            }
        }

        return false;
    }

    private static int CountFloorPockets(Dungeon d) =>
        Cells(d).Count(c => !Cardinal.Any(s => Floor(d, c.X + s.X, c.Y + s.Y)));

    /// <summary>Wall groups not reachable from the grid border without crossing floor, and smaller than 4 cells.</summary>
    private static int CountWallSpecks(Dungeon d)
    {
        var w = d.Width;
        var h = d.Height;
        var borderConnected = new bool[w, h];
        var queue = new Queue<(int X, int Y)>();
        void Seed(int x, int y)
        {
            if (!Floor(d, x, y) && !borderConnected[x, y])
            {
                borderConnected[x, y] = true;
                queue.Enqueue((x, y));
            }
        }

        for (var x = 0; x < w; x++)
        {
            Seed(x, 0);
            Seed(x, h - 1);
        }

        for (var y = 0; y < h; y++)
        {
            Seed(0, y);
            Seed(w - 1, y);
        }

        while (queue.Count > 0)
        {
            var c = queue.Dequeue();
            foreach (var s in Cardinal)
            {
                var n = (X: c.X + s.X, Y: c.Y + s.Y);
                if (n.X >= 0 && n.Y >= 0 && n.X < w && n.Y < h && !Floor(d, n.X, n.Y) && !borderConnected[n.X, n.Y])
                {
                    borderConnected[n.X, n.Y] = true;
                    queue.Enqueue(n);
                }
            }
        }

        var visited = new bool[w, h];
        var speckCount = 0;
        for (var x = 0; x < w; x++)
        {
            for (var y = 0; y < h; y++)
            {
                if (Floor(d, x, y) || borderConnected[x, y] || visited[x, y])
                {
                    continue;
                }

                var size = 0;
                var region = new Queue<(int X, int Y)>();
                visited[x, y] = true;
                region.Enqueue((x, y));
                while (region.Count > 0)
                {
                    var c = region.Dequeue();
                    size++;
                    foreach (var s in Cardinal)
                    {
                        var n = (X: c.X + s.X, Y: c.Y + s.Y);
                        if (n.X >= 0 && n.Y >= 0 && n.X < w && n.Y < h && !Floor(d, n.X, n.Y) && !borderConnected[n.X, n.Y] && !visited[n.X, n.Y])
                        {
                            visited[n.X, n.Y] = true;
                            region.Enqueue(n);
                        }
                    }
                }

                if (size < 4)
                {
                    speckCount++;
                }
            }
        }

        return speckCount;
    }

    [Fact]
    public void CatalogIdsAreUniqueAndEveryStyleHasBosses()
    {
        var ids = DungeonCatalog.Bosses.Select(b => b.Id).Concat(DungeonCatalog.Treasures.Select(t => t.Id)).Append(DungeonCatalog.Hoard.Id).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
        foreach (var style in Enum.GetValues<DungeonStyle>())
        {
            Assert.True(DungeonCatalog.Bosses.Count(b => b.Styles.Contains(style)) >= 2, $"{style} needs at least two bosses");
        }
    }
}
