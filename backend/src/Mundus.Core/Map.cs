namespace Mundus.Core;

public sealed record Cell
{
    public required int X { get; init; }
    public required int Y { get; init; }
    public required Biome Biome { get; init; }
    public required double Elevation { get; init; }
}

public sealed record Map
{
    public required int SpecVersion { get; init; }
    public required string Seed { get; init; }
    public required GridType GridType { get; init; }
    public required SizePreset SizePreset { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required IReadOnlyList<Cell> Cells { get; init; }
}

/// <summary>
/// Generates a deterministic <see cref="Map"/>: an elevation noise field
/// shaped by the requested archetype's mask, split into ocean/land by a
/// fixed threshold, with land partitioned into a handful of contiguous
/// Voronoi biome regions. See
/// specs/map-generation/spec.md and this change's design.md.
/// </summary>
public static class MapGenerator
{
    public const int CurrentSpecVersion = 1;

    private const double OceanThreshold = 0.3;

    /// <summary>
    /// Biome is decided by sampling elevation at a single point (a
    /// region's Voronoi seed point), not a region maximum - and
    /// bilinear-interpolated lattice noise rarely gets close to its
    /// theoretical 1.0 ceiling (that needs all four surrounding lattice
    /// corners to independently roll high). Empirically, well under 1%
    /// of cells exceed ~0.85, making Mountains practically unreachable
    /// at that threshold; 0.65 keeps it a genuinely elevated, not
    /// universal, biome while actually showing up in generated maps.
    /// </summary>
    private const double MountainThreshold = 0.65;

    private const int MaxRetries = 25;

    /// <summary>
    /// Lower bound blended into elevation as `falloff * (Floor + (1-Floor)
    /// * noise)`, not `falloff * noise` directly. Where an archetype's
    /// mask is at full strength (falloff = 1, e.g. the interior of a
    /// Continent/Island), this guarantees elevation >= Floor == the ocean
    /// threshold, so noise alone can never punch an isolated ocean hole
    /// through the core of a landmass and fragment it. Noise still
    /// creates ocean wherever the mask itself tapers toward 0 (the
    /// coastline band, or a shape's explicit forced-zero zones), since
    /// the blend is multiplied by falloff, not added independently of it.
    /// </summary>
    private const double ElevationFloor = OceanThreshold;

    public static Map Generate(string seed, GridType gridType, SizePreset sizePreset, ShapeArchetype shapeArchetype)
    {
        Map? last = null;
        for (var attempt = 0; attempt <= MaxRetries; attempt++)
        {
            var attemptSeed = attempt == 0 ? seed : $"{seed}:retry-{attempt}";
            last = GenerateOnce(attemptSeed, seed, gridType, sizePreset, shapeArchetype);
            if (Satisfies(last, shapeArchetype))
            {
                return last;
            }
        }

        return last!;
    }

    private static Map GenerateOnce(
        string attemptSeed,
        string reportedSeed,
        GridType gridType,
        SizePreset sizePreset,
        ShapeArchetype shapeArchetype)
    {
        var (width, height) = sizePreset.Dimensions();
        var rng = new Rng(attemptSeed);

        var noiseCellSize = Math.Max(4, width / 8);
        var elevationNoise = new ValueNoise2D(rng.Child("elevation-lattice"), width, height, noiseCellSize);
        var moistureNoise = new ValueNoise2D(rng.Child("moisture-lattice"), width, height, noiseCellSize);
        var shapeConfig = ShapeMask.Build(shapeArchetype, rng.Child("shape"), ArchipelagoBumpCount(sizePreset));

        var elevation = new double[width, height];
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                var falloff = ShapeMask.Falloff(shapeArchetype, shapeConfig, x, y, width, height);
                var noise = elevationNoise.Sample(x, y);
                elevation[x, y] = Math.Clamp(falloff * (ElevationFloor + ((1 - ElevationFloor) * noise)), 0, 1);
            }
        }

        var isWater = new bool[width, height];
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                isWater[x, y] = elevation[x, y] < OceanThreshold;
            }
        }

        var waterComponentCount = CountComponents(isWater, true, gridType, width, height);
        var (minRegions, maxRegions) = sizePreset.RegionCountRange();
        var targetTotal = rng.Child("region-count").Int(minRegions, maxRegions);
        var landSeedCount = Math.Max(1, targetTotal - waterComponentCount);
        var landSeeds = PlaceLandSeeds(isWater, width, height, rng.Child("regions"), landSeedCount);

        var biome = new Biome[width, height];
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                if (isWater[x, y])
                {
                    biome[x, y] = Biome.Ocean;
                    continue;
                }

                var nearest = NearestSeed(landSeeds, gridType, x, y);
                var seedElevation = elevation[nearest.X, nearest.Y];
                var seedMoisture = moistureNoise.Sample(nearest.X, nearest.Y);
                biome[x, y] = LandBiome(seedElevation, seedMoisture);
            }
        }

        var cells = new List<Cell>(width * height);
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                cells.Add(new Cell { X = x, Y = y, Biome = biome[x, y], Elevation = elevation[x, y] });
            }
        }

        return new Map
        {
            SpecVersion = CurrentSpecVersion,
            Seed = reportedSeed,
            GridType = gridType,
            SizePreset = sizePreset,
            Width = width,
            Height = height,
            Cells = cells,
        };
    }

    private static Biome LandBiome(double elevation, double moisture)
    {
        if (elevation >= MountainThreshold)
        {
            return Biome.Mountains;
        }

        return moisture switch
        {
            < 0.25 => Biome.Desert,
            < 0.5 => Biome.Grassland,
            < 0.75 => Biome.Forest,
            _ => Biome.Swamp,
        };
    }

    private static int ArchipelagoBumpCount(SizePreset preset) => preset switch
    {
        SizePreset.Small => 3,
        SizePreset.Medium => 4,
        SizePreset.Large => 5,
        _ => 6,
    };

    private static List<(int X, int Y)> PlaceLandSeeds(bool[,] isWater, int width, int height, Rng rng, int count)
    {
        var landCells = new List<(int X, int Y)>();
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                if (!isWater[x, y])
                {
                    landCells.Add((x, y));
                }
            }
        }

        if (landCells.Count == 0)
        {
            return [(width / 2, height / 2)];
        }

        var shuffled = rng.Shuffle(landCells);
        var seeds = new List<(int X, int Y)>();
        for (var i = 0; i < count && i < shuffled.Count; i++)
        {
            seeds.Add(shuffled[i]);
        }

        while (seeds.Count < count)
        {
            seeds.Add(shuffled[rng.Int(0, shuffled.Count - 1)]);
        }

        return seeds;
    }

    private static (int X, int Y) NearestSeed(IReadOnlyList<(int X, int Y)> seeds, GridType gridType, int x, int y)
    {
        var (px, py) = GridNeighbors.ToPlane(gridType, x, y);
        var best = seeds[0];
        var bestDist = double.MaxValue;
        foreach (var seed in seeds)
        {
            var (sx, sy) = GridNeighbors.ToPlane(gridType, seed.X, seed.Y);
            var d = ((px - sx) * (px - sx)) + ((py - sy) * (py - sy));
            if (d < bestDist)
            {
                bestDist = d;
                best = seed;
            }
        }

        return best;
    }

    private static bool Satisfies(Map map, ShapeArchetype archetype)
    {
        var width = map.Width;
        var height = map.Height;
        var biome = new Biome[width, height];
        var isWater = new bool[width, height];
        foreach (var cell in map.Cells)
        {
            biome[cell.X, cell.Y] = cell.Biome;
            isWater[cell.X, cell.Y] = cell.Biome == Biome.Ocean;
        }

        var (minRegions, maxRegions) = map.SizePreset.RegionCountRange();
        var totalRegions = CountBiomeRegions(biome, map.GridType, width, height);
        if (totalRegions < minRegions || totalRegions > maxRegions)
        {
            return false;
        }

        var landComponents = CountComponents(isWater, false, map.GridType, width, height);
        return archetype switch
        {
            ShapeArchetype.Continent => landComponents == 1,
            ShapeArchetype.Island => landComponents == 1 && AllEdgeCellsAre(isWater, true, width, height),
            ShapeArchetype.Archipelago => landComponents >= 2,
            ShapeArchetype.Peninsula => landComponents == 1 && ExactlyOneEdgeHasLand(isWater, width, height),
            ShapeArchetype.IsthmusLandBridge => landComponents == 1 && OppositeEdgesHaveLand(isWater, width, height),
            ShapeArchetype.InlandSea => HasEnclosedWaterRegion(isWater, map.GridType, width, height),
            _ => true,
        };
    }

    private static int CountBiomeRegions(Biome[,] biome, GridType gridType, int width, int height)
    {
        var visited = new bool[width, height];
        var count = 0;
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                if (visited[x, y])
                {
                    continue;
                }

                count++;
                FloodFill(visited, gridType, x, y, width, height, (nx, ny) => biome[nx, ny] == biome[x, y]);
            }
        }

        return count;
    }

    private static int CountComponents(bool[,] mask, bool value, GridType gridType, int width, int height)
    {
        LabelComponents(mask, value, gridType, width, height, out var count);
        return count;
    }

    private static int[,] LabelComponents(bool[,] mask, bool value, GridType gridType, int width, int height, out int count)
    {
        var labels = new int[width, height];
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                labels[x, y] = -1;
            }
        }

        var label = 0;
        var visited = new bool[width, height];
        for (var y = 0; y < height; y++)
        {
            for (var x = 0; x < width; x++)
            {
                if (mask[x, y] != value || visited[x, y])
                {
                    continue;
                }

                var currentLabel = label;
                FloodFill(visited, gridType, x, y, width, height, (nx, ny) => mask[nx, ny] == value, (nx, ny) => labels[nx, ny] = currentLabel);
                label++;
            }
        }

        count = label;
        return labels;
    }

    private static void FloodFill(
        bool[,] visited,
        GridType gridType,
        int startX,
        int startY,
        int width,
        int height,
        Func<int, int, bool> matches,
        Action<int, int>? onVisit = null)
    {
        var stack = new Stack<(int X, int Y)>();
        stack.Push((startX, startY));
        visited[startX, startY] = true;
        onVisit?.Invoke(startX, startY);

        while (stack.Count > 0)
        {
            var (x, y) = stack.Pop();
            foreach (var (nx, ny) in GridNeighbors.Get(gridType, x, y, width, height))
            {
                if (visited[nx, ny] || !matches(nx, ny))
                {
                    continue;
                }

                visited[nx, ny] = true;
                onVisit?.Invoke(nx, ny);
                stack.Push((nx, ny));
            }
        }
    }

    private static bool AllEdgeCellsAre(bool[,] isWater, bool value, int width, int height)
    {
        for (var x = 0; x < width; x++)
        {
            if (isWater[x, 0] != value || isWater[x, height - 1] != value)
            {
                return false;
            }
        }

        for (var y = 0; y < height; y++)
        {
            if (isWater[0, y] != value || isWater[width - 1, y] != value)
            {
                return false;
            }
        }

        return true;
    }

    private static bool EdgeHasLand(bool[,] isWater, int side, int width, int height) => side switch
    {
        0 => Enumerable.Range(0, width).Any(x => !isWater[x, 0]),
        2 => Enumerable.Range(0, width).Any(x => !isWater[x, height - 1]),
        1 => Enumerable.Range(0, height).Any(y => !isWater[width - 1, y]),
        _ => Enumerable.Range(0, height).Any(y => !isWater[0, y]),
    };

    private static bool ExactlyOneEdgeHasLand(bool[,] isWater, int width, int height) =>
        Enumerable.Range(0, 4).Count(side => EdgeHasLand(isWater, side, width, height)) == 1;

    private static bool OppositeEdgesHaveLand(bool[,] isWater, int width, int height)
    {
        var topBottom = EdgeHasLand(isWater, 0, width, height) && EdgeHasLand(isWater, 2, width, height);
        var leftRight = EdgeHasLand(isWater, 1, width, height) && EdgeHasLand(isWater, 3, width, height);
        return topBottom || leftRight;
    }

    private static bool HasEnclosedWaterRegion(bool[,] isWater, GridType gridType, int width, int height)
    {
        var labels = LabelComponents(isWater, true, gridType, width, height, out var count);
        if (count == 0)
        {
            return false;
        }

        var touchesEdge = new bool[count];
        for (var x = 0; x < width; x++)
        {
            if (isWater[x, 0])
            {
                touchesEdge[labels[x, 0]] = true;
            }

            if (isWater[x, height - 1])
            {
                touchesEdge[labels[x, height - 1]] = true;
            }
        }

        for (var y = 0; y < height; y++)
        {
            if (isWater[0, y])
            {
                touchesEdge[labels[0, y]] = true;
            }

            if (isWater[width - 1, y])
            {
                touchesEdge[labels[width - 1, y]] = true;
            }
        }

        return Enumerable.Range(0, count).Any(i => !touchesEdge[i]);
    }
}
