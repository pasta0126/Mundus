namespace Mundus.Core;

/// <summary>
/// Builds the dungeon a point of interest holds. Every decision is a pure
/// function of the map seed, the point's coordinate and its type - never of
/// the window the point was found through - and each step draws from a stream
/// of its own, so changing one step never reshuffles another.
/// </summary>
public static class DungeonGenerator
{
    /// <summary>Incremented whenever any rule here changes what a given input produces.</summary>
    public const int SpecVersion = 2;

    public const int MinSize = 32;
    public const int MaxSize = 96;

    private static readonly (int X, int Y)[] Cardinal = [(1, 0), (-1, 0), (0, 1), (0, -1)];

    private readonly record struct Rect(int X, int Y, int W, int H);

    public static Dungeon Generate(string seed, int x, int y, string type)
    {
        if (string.IsNullOrWhiteSpace(seed))
        {
            throw new ArgumentException("seed is required", nameof(seed));
        }

        var spec = PointOfInterestCatalog.Find(type)?.Dungeon
            ?? throw new ArgumentException($"'{type}' cannot hold a dungeon", nameof(type));
        var style = spec.Style;
        var baseSeed = $"{seed}:dungeon:{x}:{y}:{type}";

        var floor = style switch
        {
            DungeonStyle.Cave => Cave(baseSeed),
            DungeonStyle.Halls => Halls(baseSeed),
            _ => Maze(baseSeed),
        };
        var width = floor.GetLength(0);
        var height = floor.GetLength(1);

        var entrance = PlaceEntrance(new Rng($"{baseSeed}:entrance"), floor);
        var (distance, parent) = Walk(floor, entrance);
        var reachable = Cells(floor).Where(c => distance[c.X, c.Y] >= 0).ToList();
        var farthest = reachable.Max(c => distance[c.X, c.Y]);

        var bossRng = new Rng($"{baseSeed}:bosses");
        var finalCell = reachable.First(c => distance[c.X, c.Y] == farthest);
        var finalBoss = new DungeonMark(FinalBossId(bossRng, style, type), finalCell.X, finalCell.Y);

        var taken = new List<(int X, int Y)> { entrance, finalCell };
        var bosses = new List<DungeonMark>();
        var lesserKinds = DungeonCatalog.Bosses
            .Where(b => b.Styles.Contains(style) && b.Id != DungeonCatalog.Dragon && b.Id != finalBoss.Id)
            .ToList();
        if (lesserKinds.Count > 0)
        {
            var wanted = bossRng.Int(0, 2);
            var pool = bossRng.Shuffle(reachable
                .Where(c => distance[c.X, c.Y] >= farthest / 2 && Chebyshev(c, finalCell) >= 6)
                .ToList());
            foreach (var cell in pool)
            {
                if (bosses.Count == wanted)
                {
                    break;
                }

                if (taken.Any(t => Chebyshev(t, cell) < 6))
                {
                    continue;
                }

                var kind = bossRng.Weighted(lesserKinds.Select(b => new Rng.WeightedItem<string>(b.Id, b.Weight)).ToList());
                bosses.Add(new DungeonMark(kind, cell.X, cell.Y));
                taken.Add(cell);
            }
        }

        var hoardCell = Cardinal
            .Select(d => (X: finalCell.X + d.X, Y: finalCell.Y + d.Y))
            .First(c => IsFloor(floor, c.X, c.Y));
        taken.Add(hoardCell);
        var hoard = new DungeonMark(DungeonCatalog.Hoard.Id, hoardCell.X, hoardCell.Y);

        var treasures = PlaceTreasures(new Rng($"{baseSeed}:treasure"), floor, distance, parent, finalCell, reachable, taken);

        var rows = new string[height];
        for (var row = 0; row < height; row++)
        {
            var chars = new char[width];
            for (var col = 0; col < width; col++)
            {
                chars[col] = floor[col, row] ? '.' : '#';
            }

            rows[row] = new string(chars);
        }

        return new Dungeon
        {
            SpecVersion = SpecVersion,
            Seed = seed,
            X = x,
            Y = y,
            Type = type,
            Style = style,
            Width = width,
            Height = height,
            Rows = rows,
            Entrance = new DungeonCell(entrance.X, entrance.Y),
            FinalBoss = finalBoss,
            Bosses = bosses,
            Treasures = treasures,
            Hoard = hoard,
        };
    }

    // ---- bosses and treasures --------------------------------------------------

    /// <summary>A dragon's lair is always guarded by a dragon; anywhere else the boss is drawn by rarity.</summary>
    private static string FinalBossId(Rng rng, DungeonStyle style, string type)
    {
        var kinds = DungeonCatalog.Bosses.Where(b => b.Styles.Contains(style)).ToList();
        var drawn = rng.Weighted(kinds.Select(b => new Rng.WeightedItem<string>(b.Id, b.Weight)).ToList());
        return type == DungeonCatalog.Dragon ? DungeonCatalog.Dragon : drawn;
    }

    /// <summary>
    /// Three to eight treasures away from the entrance and the bosses, leaning
    /// toward dead ends and toward the branches off the way to the final boss,
    /// and never crowded together.
    /// </summary>
    private static List<DungeonMark> PlaceTreasures(
        Rng rng,
        bool[,] floor,
        int[,] distance,
        (int X, int Y)[,] parent,
        (int X, int Y) finalCell,
        List<(int X, int Y)> reachable,
        List<(int X, int Y)> taken)
    {
        var mainRoute = new HashSet<(int, int)>();
        for (var c = finalCell; c != (-1, -1); c = parent[c.X, c.Y])
        {
            mainRoute.Add(c);
        }

        var candidates = reachable
            .Where(c => distance[c.X, c.Y] >= 4 && taken.All(t => Chebyshev(t, c) >= 2))
            .Select(c =>
            {
                var neighbours = Cardinal.Count(d => IsFloor(floor, c.X + d.X, c.Y + d.Y));
                var weight = neighbours == 1 ? 8 : mainRoute.Contains(c) ? 1 : 3;
                return new Rng.WeightedItem<(int X, int Y)>(c, weight);
            })
            .ToList();

        var wanted = rng.Int(3, 8);
        var kinds = DungeonCatalog.Treasures.Select(t => new Rng.WeightedItem<string>(t.Id, t.Weight)).ToList();
        var placed = new List<DungeonMark>();
        while (placed.Count < wanted && candidates.Count > 0)
        {
            var cell = rng.Weighted(candidates);
            placed.Add(new DungeonMark(rng.Weighted(kinds), cell.X, cell.Y));
            candidates = candidates.Where(c => Chebyshev(c.Value, cell) >= 3).ToList();
        }

        return placed;
    }

    // ---- entrance and reachability ---------------------------------------------

    /// <summary>The floor cell closest to a randomly chosen side of the grid, so the way in is at the edge of the floor area.</summary>
    private static (int X, int Y) PlaceEntrance(Rng rng, bool[,] floor)
    {
        var width = floor.GetLength(0);
        var height = floor.GetLength(1);
        var side = rng.Int(0, 3);
        int Gap((int X, int Y) c) => side switch
        {
            0 => c.Y,
            1 => height - 1 - c.Y,
            2 => c.X,
            _ => width - 1 - c.X,
        };

        var cells = Cells(floor).ToList();
        var best = cells.Min(Gap);
        return rng.Pick(cells.Where(c => Gap(c) == best).ToList());
    }

    /// <summary>Breadth-first walk over floor cells: distance from the start (-1 where unreachable) and each cell's step back toward it.</summary>
    private static (int[,] Distance, (int X, int Y)[,] Parent) Walk(bool[,] floor, (int X, int Y) start)
    {
        var distance = new int[floor.GetLength(0), floor.GetLength(1)];
        var parent = new (int X, int Y)[floor.GetLength(0), floor.GetLength(1)];
        for (var x = 0; x < distance.GetLength(0); x++)
        {
            for (var y = 0; y < distance.GetLength(1); y++)
            {
                distance[x, y] = -1;
                parent[x, y] = (-1, -1);
            }
        }

        var queue = new Queue<(int X, int Y)>();
        distance[start.X, start.Y] = 0;
        queue.Enqueue(start);
        while (queue.Count > 0)
        {
            var c = queue.Dequeue();
            foreach (var d in Cardinal)
            {
                var n = (X: c.X + d.X, Y: c.Y + d.Y);
                if (IsFloor(floor, n.X, n.Y) && distance[n.X, n.Y] < 0)
                {
                    distance[n.X, n.Y] = distance[c.X, c.Y] + 1;
                    parent[n.X, n.Y] = c;
                    queue.Enqueue(n);
                }
            }
        }

        return (distance, parent);
    }

    // ---- layouts ---------------------------------------------------------------

    /// <summary>Bounds a cave layout must satisfy - see the `dungeon-generation` spec, "Caves are tunnels and chambers".</summary>
    private const double CaveMinFloorShare = 0.25;
    private const double CaveMaxFloorShare = 0.45;
    private const int CaveMaxOpenSquare = 10; // a fully-floor square of this size or larger is forbidden (spec: none larger than 9x9)
    private const int CaveMinWallGroup = 4; // a wall group smaller than this, surrounded by floor, is a forbidden "speck"

    /// <summary>
    /// Winding tunnels joining chambers, not one smoothed-open cavern: chamber
    /// blobs are grown from random centres, joined by a minimum spanning tree
    /// of winding, variable-width tunnels, then cleaned of stray specks and
    /// pockets and repaired if any block still reads as one open room. Several
    /// attempts are tried (as the previous cellular-automaton cave did) and the
    /// one that best satisfies the bounds is kept.
    /// </summary>
    private static bool[,] Cave(string baseSeed)
    {
        var sizeRng = new Rng($"{baseSeed}:size");
        var width = sizeRng.Int(56, 80);
        var height = sizeRng.Int(40, 60);

        bool[,]? best = null;
        var bestScore = double.MaxValue;
        for (var attempt = 0; attempt < 30; attempt++)
        {
            var rng = new Rng($"{baseSeed}:cave:{attempt}");
            var floor = BuildCaveLayout(rng, width, height);
            var score = CaveViolationScore(floor, width, height, out var passes);
            if (passes)
            {
                return floor;
            }

            if (score < bestScore)
            {
                bestScore = score;
                best = floor;
            }
        }

        return best!;
    }

    /// <summary>Grows a handful of chamber blobs, joins them with winding tunnels, then cleans up the result.</summary>
    private static bool[,] BuildCaveLayout(Rng rng, int width, int height)
    {
        var floor = new bool[width, height];
        var chamberCount = rng.Int(10, 15);
        var centres = new List<(int X, int Y)>();
        for (var i = 0; i < chamberCount; i++)
        {
            var center = PickChamberCentre(rng, centres, width, height);
            centres.Add(center);
            GrowChamber(floor, rng, center, rng.Int(30, 60), width, height);
        }

        foreach (var (a, b) in MinimumSpanningTree(centres))
        {
            CarveTunnel(floor, rng, centres[a], centres[b], width, height);
        }

        RemoveFloorPockets(floor, width, height);
        RemoveWallSpecks(floor, width, height);
        BreakLargeOpenSquares(floor, width, height);
        RemoveFloorPockets(floor, width, height);

        return KeepLargest(floor);
    }

    /// <summary>A chamber centre kept at least 10 cells from every earlier one where possible, so chambers don't all pile up together.</summary>
    private static (int X, int Y) PickChamberCentre(Rng rng, List<(int X, int Y)> existing, int width, int height)
    {
        var best = (X: rng.Int(6, width - 7), Y: rng.Int(6, height - 7));
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var candidate = (X: rng.Int(6, width - 7), Y: rng.Int(6, height - 7));
            if (existing.All(c => Chebyshev(c, candidate) >= 10))
            {
                return candidate;
            }

            best = candidate;
        }

        return best;
    }

    /// <summary>Grows an organic blob of roughly `areaTarget` cells from `center` by randomly expanding its frontier - never a filled rectangle.</summary>
    private static void GrowChamber(bool[,] floor, Rng rng, (int X, int Y) center, int areaTarget, int width, int height)
    {
        if (!IsInterior(center.X, center.Y, width, height))
        {
            return;
        }

        var queued = new HashSet<(int X, int Y)> { center };
        var frontier = new List<(int X, int Y)> { center };
        var placed = 0;
        while (placed < areaTarget && frontier.Count > 0)
        {
            var index = rng.Int(0, frontier.Count - 1);
            var cell = frontier[index];
            frontier.RemoveAt(index);
            floor[cell.X, cell.Y] = true;
            placed++;

            foreach (var d in Cardinal)
            {
                var n = (X: cell.X + d.X, Y: cell.Y + d.Y);
                if (IsInterior(n.X, n.Y, width, height) && queued.Add(n))
                {
                    frontier.Add(n);
                }
            }
        }
    }

    /// <summary>Prim's algorithm over chamber centres, by Euclidean distance - the fewest tunnels that still join every chamber.</summary>
    private static List<(int A, int B)> MinimumSpanningTree(List<(int X, int Y)> centres)
    {
        var inTree = new bool[centres.Count];
        var edges = new List<(int A, int B)>();
        inTree[0] = true;
        for (var added = 1; added < centres.Count; added++)
        {
            var bestA = -1;
            var bestB = -1;
            var bestDistance = long.MaxValue;
            for (var a = 0; a < centres.Count; a++)
            {
                if (!inTree[a])
                {
                    continue;
                }

                for (var b = 0; b < centres.Count; b++)
                {
                    if (inTree[b])
                    {
                        continue;
                    }

                    var dx = centres[a].X - centres[b].X;
                    var dy = centres[a].Y - centres[b].Y;
                    var distance = ((long)dx * dx) + ((long)dy * dy);
                    if (distance < bestDistance)
                    {
                        bestDistance = distance;
                        bestA = a;
                        bestB = b;
                    }
                }
            }

            inTree[bestB] = true;
            edges.Add((bestA, bestB));
        }

        return edges;
    }

    /// <summary>
    /// Carves a winding passage, 2 to 5 cells wide, from `from` to `to`: mostly
    /// steps toward the target but sometimes jitters sideways, and its width is
    /// re-rolled now and then, so it winds and varies rather than running straight.
    /// </summary>
    private static void CarveTunnel(bool[,] floor, Rng rng, (int X, int Y) from, (int X, int Y) to, int width, int height)
    {
        var current = from;
        var thickness = rng.Int(2, 5);
        var maxSteps = ((Math.Abs(to.X - from.X) + Math.Abs(to.Y - from.Y)) * 3) + 20;
        StampBrush(floor, current, thickness, width, height);
        for (var step = 0; step < maxSteps && current != to; step++)
        {
            if (rng.Bool(0.12))
            {
                thickness = rng.Int(2, 5);
            }

            if (rng.Bool(0.75))
            {
                if (Math.Abs(to.X - current.X) >= Math.Abs(to.Y - current.Y) && current.X != to.X)
                {
                    current = (current.X + Math.Sign(to.X - current.X), current.Y);
                }
                else if (current.Y != to.Y)
                {
                    current = (current.X, current.Y + Math.Sign(to.Y - current.Y));
                }
                else if (current.X != to.X)
                {
                    current = (current.X + Math.Sign(to.X - current.X), current.Y);
                }
            }
            else if (rng.Bool())
            {
                current = (Math.Clamp(current.X + rng.Int(-1, 1), 1, width - 2), current.Y);
            }
            else
            {
                current = (current.X, Math.Clamp(current.Y + rng.Int(-1, 1), 1, height - 2));
            }

            StampBrush(floor, current, thickness, width, height);
        }

        StampBrush(floor, to, thickness, width, height);
    }

    /// <summary>Fills a square of `thickness` cells centred on `center`, clipped to the interior.</summary>
    private static void StampBrush(bool[,] floor, (int X, int Y) center, int thickness, int width, int height)
    {
        var half = thickness / 2;
        var extra = thickness % 2;
        for (var dx = -half; dx <= half - 1 + extra; dx++)
        {
            for (var dy = -half; dy <= half - 1 + extra; dy++)
            {
                var x = center.X + dx;
                var y = center.Y + dy;
                if (IsInterior(x, y, width, height))
                {
                    floor[x, y] = true;
                }
            }
        }
    }

    /// <summary>Fills any floor cell with no floor neighbour - a one-cell pocket with nothing around it to belong to.</summary>
    private static void RemoveFloorPockets(bool[,] floor, int width, int height)
    {
        for (var x = 1; x <= width - 2; x++)
        {
            for (var y = 1; y <= height - 2; y++)
            {
                if (floor[x, y] && !Cardinal.Any(d => IsFloor(floor, x + d.X, y + d.Y)))
                {
                    floor[x, y] = false;
                }
            }
        }
    }

    /// <summary>Every wall cell reachable from the grid border without crossing floor - the "outside rock", as opposed to a stray speck sitting inside the floor.</summary>
    private static bool[,] BorderConnectedWalls(bool[,] floor, int width, int height)
    {
        var borderConnected = new bool[width, height];
        var queue = new Queue<(int X, int Y)>();
        void Seed(int x, int y)
        {
            if (!IsFloor(floor, x, y) && !borderConnected[x, y])
            {
                borderConnected[x, y] = true;
                queue.Enqueue((x, y));
            }
        }

        for (var x = 0; x < width; x++)
        {
            Seed(x, 0);
            Seed(x, height - 1);
        }

        for (var y = 0; y < height; y++)
        {
            Seed(0, y);
            Seed(width - 1, y);
        }

        while (queue.Count > 0)
        {
            var c = queue.Dequeue();
            foreach (var d in Cardinal)
            {
                var n = (X: c.X + d.X, Y: c.Y + d.Y);
                if (n.X >= 0 && n.Y >= 0 && n.X < width && n.Y < height && !IsFloor(floor, n.X, n.Y) && !borderConnected[n.X, n.Y])
                {
                    borderConnected[n.X, n.Y] = true;
                    queue.Enqueue(n);
                }
            }
        }

        return borderConnected;
    }

    /// <summary>Finds every isolated wall island (not reachable from the border) and, if it's smaller than the minimum group size, turns it to floor.</summary>
    private static void RemoveWallSpecks(bool[,] floor, int width, int height)
    {
        var borderConnected = BorderConnectedWalls(floor, width, height);
        var visited = new bool[width, height];
        for (var x = 0; x < width; x++)
        {
            for (var y = 0; y < height; y++)
            {
                if (IsFloor(floor, x, y) || borderConnected[x, y] || visited[x, y])
                {
                    continue;
                }

                var region = new List<(int X, int Y)>();
                var queue = new Queue<(int X, int Y)>();
                visited[x, y] = true;
                queue.Enqueue((x, y));
                while (queue.Count > 0)
                {
                    var c = queue.Dequeue();
                    region.Add(c);
                    foreach (var d in Cardinal)
                    {
                        var n = (X: c.X + d.X, Y: c.Y + d.Y);
                        if (n.X >= 0 && n.Y >= 0 && n.X < width && n.Y < height && !IsFloor(floor, n.X, n.Y) && !borderConnected[n.X, n.Y] && !visited[n.X, n.Y])
                        {
                            visited[n.X, n.Y] = true;
                            queue.Enqueue(n);
                        }
                    }
                }

                if (region.Count < CaveMinWallGroup)
                {
                    foreach (var c in region)
                    {
                        floor[c.X, c.Y] = true;
                    }
                }
            }
        }
    }

    /// <summary>Finds the top-left corner of a fully-floor square of the given size, using a summed-area table so the scan is a single pass.</summary>
    private static (int X, int Y)? FindOpenSquare(bool[,] floor, int width, int height, int size)
    {
        if (width < size || height < size)
        {
            return null;
        }

        var prefix = new int[width + 1, height + 1];
        for (var x = 0; x < width; x++)
        {
            for (var y = 0; y < height; y++)
            {
                prefix[x + 1, y + 1] = prefix[x, y + 1] + prefix[x + 1, y] - prefix[x, y] + (floor[x, y] ? 1 : 0);
            }
        }

        for (var x = 0; x <= width - size; x++)
        {
            for (var y = 0; y <= height - size; y++)
            {
                var sum = prefix[x + size, y + size] - prefix[x, y + size] - prefix[x + size, y] + prefix[x, y];
                if (sum == size * size)
                {
                    return (x, y);
                }
            }
        }

        return null;
    }

    /// <summary>
    /// Breaks up any block that still reads as one open room by dropping a
    /// 2x2 rock formation (never smaller - a 1-cell pillar would itself be a
    /// forbidden speck) into its centre, repeating until none remain.
    /// </summary>
    private static void BreakLargeOpenSquares(bool[,] floor, int width, int height)
    {
        for (var iteration = 0; iteration < 50; iteration++)
        {
            var found = FindOpenSquare(floor, width, height, CaveMaxOpenSquare);
            if (found is null)
            {
                break;
            }

            var cx = found.Value.X + (CaveMaxOpenSquare / 2);
            var cy = found.Value.Y + (CaveMaxOpenSquare / 2);
            floor[cx, cy] = false;
            floor[cx + 1, cy] = false;
            floor[cx, cy + 1] = false;
            floor[cx + 1, cy + 1] = false;
        }
    }

    /// <summary>How far a layout is from satisfying every cave bound (0 = it does); used to pick the best of several attempts when none pass outright.</summary>
    private static double CaveViolationScore(bool[,] floor, int width, int height, out bool passes)
    {
        var floorCount = Cells(floor).Count();
        var share = (double)floorCount / (width * height);
        var shareDeviation = share < CaveMinFloorShare ? CaveMinFloorShare - share : share > CaveMaxFloorShare ? share - CaveMaxFloorShare : 0;
        var hasBigSquare = FindOpenSquare(floor, width, height, CaveMaxOpenSquare) is not null;

        var borderConnected = BorderConnectedWalls(floor, width, height);
        var visited = new bool[width, height];
        var speckCount = 0;
        for (var x = 0; x < width; x++)
        {
            for (var y = 0; y < height; y++)
            {
                if (IsFloor(floor, x, y) || borderConnected[x, y] || visited[x, y])
                {
                    continue;
                }

                var size = 0;
                var queue = new Queue<(int X, int Y)>();
                visited[x, y] = true;
                queue.Enqueue((x, y));
                while (queue.Count > 0)
                {
                    var c = queue.Dequeue();
                    size++;
                    foreach (var d in Cardinal)
                    {
                        var n = (X: c.X + d.X, Y: c.Y + d.Y);
                        if (n.X >= 0 && n.Y >= 0 && n.X < width && n.Y < height && !IsFloor(floor, n.X, n.Y) && !borderConnected[n.X, n.Y] && !visited[n.X, n.Y])
                        {
                            visited[n.X, n.Y] = true;
                            queue.Enqueue(n);
                        }
                    }
                }

                if (size < CaveMinWallGroup)
                {
                    speckCount++;
                }
            }
        }

        var pocketCount = 0;
        for (var x = 1; x <= width - 2; x++)
        {
            for (var y = 1; y <= height - 2; y++)
            {
                if (floor[x, y] && !Cardinal.Any(d => IsFloor(floor, x + d.X, y + d.Y)))
                {
                    pocketCount++;
                }
            }
        }

        passes = shareDeviation == 0 && !hasBigSquare && speckCount == 0 && pocketCount == 0;
        return (shareDeviation * 10) + (hasBigSquare ? 5 : 0) + (speckCount * 2) + (pocketCount * 2);
    }

    private static bool IsInterior(int x, int y, int width, int height) => x >= 1 && x <= width - 2 && y >= 1 && y <= height - 2;

    /// <summary>Rooms joined by corridors: the grid is split in halves, a room is set in each leaf, and every pair of halves is joined by a corridor.</summary>
    private static bool[,] Halls(string baseSeed)
    {
        var rng = new Rng($"{baseSeed}:halls");
        var width = rng.Int(56, 88);
        var height = rng.Int(40, 64);
        var floor = new bool[width, height];

        List<Rect> Build(Rect leaf, int depth)
        {
            const int minW = 14;
            const int minH = 10;
            var canSplitX = leaf.W >= 2 * minW;
            var canSplitY = leaf.H >= 2 * minH;
            if (depth == 0 || (!canSplitX && !canSplitY))
            {
                var rw = rng.Int(5, leaf.W - 3);
                var rh = rng.Int(4, leaf.H - 3);
                var room = new Rect(leaf.X + rng.Int(1, leaf.W - rw - 1), leaf.Y + rng.Int(1, leaf.H - rh - 1), rw, rh);
                for (var x = room.X; x < room.X + room.W; x++)
                {
                    for (var y = room.Y; y < room.Y + room.H; y++)
                    {
                        floor[x, y] = true;
                    }
                }

                return [room];
            }

            List<Rect> a, b;
            if (canSplitX && (!canSplitY || rng.Bool()))
            {
                var cut = rng.Int(minW, leaf.W - minW);
                a = Build(new Rect(leaf.X, leaf.Y, cut, leaf.H), depth - 1);
                b = Build(new Rect(leaf.X + cut, leaf.Y, leaf.W - cut, leaf.H), depth - 1);
            }
            else
            {
                var cut = rng.Int(minH, leaf.H - minH);
                a = Build(new Rect(leaf.X, leaf.Y, leaf.W, cut), depth - 1);
                b = Build(new Rect(leaf.X, leaf.Y + cut, leaf.W, leaf.H - cut), depth - 1);
            }

            Corridor(floor, Centre(rng.Pick(a)), Centre(rng.Pick(b)), rng.Bool());
            return [.. a, .. b];
        }

        Build(new Rect(1, 1, width - 2, height - 2), 4);
        return KeepLargest(floor);
    }

    private static (int X, int Y) Centre(Rect r) => (r.X + (r.W / 2), r.Y + (r.H / 2));

    /// <summary>An L-shaped corridor one cell wide.</summary>
    private static void Corridor(bool[,] floor, (int X, int Y) from, (int X, int Y) to, bool horizontalFirst)
    {
        var corner = horizontalFirst ? (X: to.X, Y: from.Y) : (X: from.X, Y: to.Y);
        Line(floor, from, corner);
        Line(floor, corner, to);
    }

    private static void Line(bool[,] floor, (int X, int Y) a, (int X, int Y) b)
    {
        var dx = Math.Sign(b.X - a.X);
        var dy = Math.Sign(b.Y - a.Y);
        var c = a;
        floor[c.X, c.Y] = true;
        while (c != b)
        {
            c = (c.X + dx, c.Y + dy);
            floor[c.X, c.Y] = true;
        }
    }

    /// <summary>A perfect maze (a spanning tree of cells): exactly one path between any two floor cells, carved by a randomized depth-first walk.</summary>
    private static bool[,] Maze(string baseSeed)
    {
        var rng = new Rng($"{baseSeed}:maze");
        var cellsX = rng.Int(16, 24);
        var cellsY = rng.Int(16, 22);
        var floor = new bool[(2 * cellsX) + 1, (2 * cellsY) + 1];
        var seen = new bool[cellsX, cellsY];
        var stack = new Stack<(int X, int Y)>();
        var start = (X: rng.Int(0, cellsX - 1), Y: rng.Int(0, cellsY - 1));
        seen[start.X, start.Y] = true;
        floor[(2 * start.X) + 1, (2 * start.Y) + 1] = true;
        stack.Push(start);
        while (stack.Count > 0)
        {
            var c = stack.Peek();
            var open = rng.Shuffle(Cardinal)
                .Where(d => c.X + d.X >= 0 && c.X + d.X < cellsX && c.Y + d.Y >= 0 && c.Y + d.Y < cellsY && !seen[c.X + d.X, c.Y + d.Y])
                .ToList();
            if (open.Count == 0)
            {
                stack.Pop();
                continue;
            }

            var d = open[0];
            var n = (X: c.X + d.X, Y: c.Y + d.Y);
            seen[n.X, n.Y] = true;
            floor[(2 * c.X) + 1 + d.X, (2 * c.Y) + 1 + d.Y] = true;
            floor[(2 * n.X) + 1, (2 * n.Y) + 1] = true;
            stack.Push(n);
        }

        return floor;
    }

    // ---- helpers ---------------------------------------------------------------

    private static bool IsFloor(bool[,] floor, int x, int y) =>
        x >= 0 && y >= 0 && x < floor.GetLength(0) && y < floor.GetLength(1) && floor[x, y];

    private static int Chebyshev((int X, int Y) a, (int X, int Y) b) => Math.Max(Math.Abs(a.X - b.X), Math.Abs(a.Y - b.Y));

    /// <summary>Every floor cell, in row-major order (so "first" is always well defined).</summary>
    private static IEnumerable<(int X, int Y)> Cells(bool[,] floor)
    {
        for (var y = 0; y < floor.GetLength(1); y++)
        {
            for (var x = 0; x < floor.GetLength(0); x++)
            {
                if (floor[x, y])
                {
                    yield return (x, y);
                }
            }
        }
    }

    /// <summary>Drops every floor cell outside the largest connected region.</summary>
    private static bool[,] KeepLargest(bool[,] floor)
    {
        var seen = new bool[floor.GetLength(0), floor.GetLength(1)];
        List<(int X, int Y)> best = [];
        foreach (var start in Cells(floor))
        {
            if (seen[start.X, start.Y])
            {
                continue;
            }

            var region = new List<(int X, int Y)>();
            var queue = new Queue<(int X, int Y)>();
            seen[start.X, start.Y] = true;
            queue.Enqueue(start);
            while (queue.Count > 0)
            {
                var c = queue.Dequeue();
                region.Add(c);
                foreach (var d in Cardinal)
                {
                    var n = (X: c.X + d.X, Y: c.Y + d.Y);
                    if (IsFloor(floor, n.X, n.Y) && !seen[n.X, n.Y])
                    {
                        seen[n.X, n.Y] = true;
                        queue.Enqueue(n);
                    }
                }
            }

            if (region.Count > best.Count)
            {
                best = region;
            }
        }

        var kept = new bool[floor.GetLength(0), floor.GetLength(1)];
        foreach (var c in best)
        {
            kept[c.X, c.Y] = true;
        }

        return kept;
    }
}
