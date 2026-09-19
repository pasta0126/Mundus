namespace Mundus.Core;

/// <summary>What an icon is to the cluster it belongs to.</summary>
public enum PoiRole
{
    /// <summary>Stands alone: terrain features, monuments, legends.</summary>
    Single,

    /// <summary>Heads a settlement (a lone Point-tier icon is also an Anchor).</summary>
    Anchor,

    /// <summary>A service around an anchor - drawn only once the view is close enough.</summary>
    Satellite,
}

public sealed record PointOfInterest
{
    public required int X { get; init; }
    public required int Y { get; init; }
    public required string Category { get; init; }
    public required string Type { get; init; }
    public required PoiRole Role { get; init; }

    /// <summary>For anchors and their satellites: the size of the settlement they belong to.</summary>
    public SettlementTier? Tier { get; init; }
}

public sealed record PointsOfInterest
{
    public required string Seed { get; init; }
    public required int OriginX { get; init; }
    public required int OriginY { get; init; }
    public required int Width { get; init; }
    public required int Height { get; init; }
    public required IReadOnlyList<PointOfInterest> Points { get; init; }
}

/// <summary>
/// Scatters seed-deterministic points of interest from the
/// <see cref="PointOfInterestCatalog"/>: one lattice per catalog category,
/// one jittered candidate per block, kept with a per-category probability.
/// A candidate picks an icon among those the catalog allows on its biome
/// and terrain geometry, weighted by rarity; a settlements block grows a
/// whole cluster - an anchor of some size and the services around it.
/// Every decision is a pure function of (seed, category, block), never of
/// the requested window. See openspec/changes/add-map-overlays/specs/points-of-interest/spec.md.
/// </summary>
public static class PointOfInterestGenerator
{
    /// <summary>
    /// One lattice per category. Order and numbers are part of the frozen determinism contract - only ever append.
    /// `Reference` is the total icon weight a spot needs to be always kept: a
    /// spot whose valid icons weigh less is kept only in proportion, so a
    /// biome offering nothing but rare icons stays sparse instead of every
    /// block filling up with the one rare icon it has. 0 means no scaling.
    /// </summary>
    private static readonly (string Key, string Category, int BlockSize, double Density, int Tries, int Reference, bool SeekCoast)[] Layers =
    [
        (PointOfInterestCatalog.Relief, PointOfInterestCatalog.Relief, 110, 0.9, 12, 100, false),
        (PointOfInterestCatalog.Nature, PointOfInterestCatalog.Nature, 150, 0.9, 8, 100, false),
        (PointOfInterestCatalog.Sea, PointOfInterestCatalog.Sea, 170, 0.8, 5, 40, false),
        (PointOfInterestCatalog.Settlements, PointOfInterestCatalog.Settlements, 420, 0.55, 6, 0, false),
        (PointOfInterestCatalog.Heritage, PointOfInterestCatalog.Heritage, 300, 0.6, 6, 35, false),
        (PointOfInterestCatalog.Legends, PointOfInterestCatalog.Legends, 520, 0.45, 8, 20, false),
        // Lighthouses, islet beacons and piers need a cape, an islet or a shore - spots a random point almost never lands on, so this lattice walks rays out from each candidate until it meets a shoreline.
        ("coast", PointOfInterestCatalog.Settlements, 260, 0.15, 8, 0, true),
    ];

    /// <summary>The icons each layer may place, in <see cref="Layers"/> order (services only ever come with their settlement; shore layers take only the geometry-bound ones).</summary>
    private static readonly IReadOnlyList<PoiEntry>[] LayerEntries = Layers
        .Select(l => (IReadOnlyList<PoiEntry>)PointOfInterestCatalog.InCategory(l.Category)
            .Where(e => e.Enabled && e.Kind != PoiKind.Service && (e.Placement is Placement.Cape or Placement.Islet or Placement.Coast) == l.SeekCoast)
            .ToList())
        .ToArray();

    public static IReadOnlyList<string> Categories { get; } = PointOfInterestCatalog.Categories.Select(c => c.Id).ToList();

    /// <summary>Every icon type the generator can place, across all categories (retired ones excluded).</summary>
    public static IReadOnlyList<string> Types { get; } = PointOfInterestCatalog.Entries.Where(e => e.Enabled).Select(e => e.Id).ToList();

    public static IReadOnlyList<string> TypesOf(string category) =>
        PointOfInterestCatalog.InCategory(category).Where(e => e.Enabled).Select(e => e.Id).ToList();

    /// <summary>How far past the window (in sampled cells) a point still counts as touching it, so an icon straddling the edge is returned by both neighboring windows.</summary>
    public const int EdgeMargin = 40;

    /// <summary>Extra room (in cells, i.e. on-screen pixels) kept around a settlement's radius so other icons stay clear of its outermost buildings.</summary>
    private const int SettlementZonePad = 28;

    /// <summary>Tightest a cluster packs its icons (in cells, i.e. on-screen pixels at every zoom) so satellites drawn at about 30px never sit on each other.</summary>
    private const int ClusterSpacing = 26;

    private const int SatelliteTries = 8;

    // Terrain probes, in cells at step 1 (scaled by step at use).
    private const int CoastReach = 8;
    private const int WatersideReach = 10;
    private const int CapeReach = 12;
    private const int IsletReach = 10;
    private const int NearCoastReach = 45;
    private const int OpenSeaReach = 50;

    // A lake is water with land on every side within LakeSteps strides of
    // LakeStride cells, and no land closer than LakeMinStrides strides: a
    // broad lake, not the edge of a bay.
    private const int LakeSteps = 12;

    private const int LakeStride = 12;

    private const int LakeMinStrides = 2;

    private static readonly (int X, int Y)[] Cardinal = [(1, 0), (-1, 0), (0, 1), (0, -1)];
    private static readonly (int X, int Y)[] Compass = [(1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (-1, -1), (1, -1), (-1, 1)];

    public static PointsOfInterest Generate(string seed, int originX, int originY, int width, int height, int step = 1, string? category = null)
    {
        if (width < 1 || width > MapGenerator.MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(width), $"width must be between 1 and {MapGenerator.MaxWindowDimension}");
        }

        if (height < 1 || height > MapGenerator.MaxWindowDimension)
        {
            throw new ArgumentOutOfRangeException(nameof(height), $"height must be between 1 and {MapGenerator.MaxWindowDimension}");
        }

        if (step < 1 || step > MapGenerator.MaxStep)
        {
            throw new ArgumentOutOfRangeException(nameof(step), $"step must be between 1 and {MapGenerator.MaxStep}");
        }

        if (category is not null && !Categories.Contains(category))
        {
            throw new ArgumentException($"category must be one of: {string.Join(", ", Categories)}", nameof(category));
        }

        var margin = EdgeMargin * step;
        var minX = originX - margin;
        var minY = originY - margin;
        var maxX = originX + (width * step) + margin;
        var maxY = originY + (height * step) + margin;
        var probe = new BiomeProbe(seed, step);

        // What each block decides, computed at most once per call and kept with the
        // stream it used so a settlement can go on to draw its satellites from it.
        // Other layers read settlement blocks too (to keep clear of them), which is
        // why this is memoized rather than recomputed per use.
        var memo = new Dictionary<(int Layer, int Bx, int By), (Rng Rng, (int X, int Y, PoiEntry Entry, Biome Biome)? Placed)>();

        (Rng Rng, (int X, int Y, PoiEntry Entry, Biome Biome)? Placed) Placed(int layer, int bx, int by)
        {
            if (memo.TryGetValue((layer, bx, by), out var known))
            {
                return known;
            }

            var (key, _, blockSize, density, tries, reference, seekCoast) = Layers[layer];
            var block = blockSize * step;
            // Each block gets its own stream, so what one block decides
            // never depends on the window or on any other block.
            var rng = new Rng($"{seed}:poi-{key}:{bx}:{by}");
            (int X, int Y, PoiEntry Entry, Biome Biome)? placed = null;
            if (rng.Float() < density)
            {
                placed = seekCoast
                    ? TryPlaceOnShore(rng, probe, LayerEntries[layer], bx, by, block, tries, step)
                    : TryPlace(rng, probe, LayerEntries[layer], bx, by, block, tries, reference, step);
            }

            return memo[(layer, bx, by)] = (rng, placed);
        }

        // Whether (x, y) falls inside some settlement's footprint - its anchor's
        // radius plus room for the icons themselves. Scattered icons keep out of
        // these so nothing lands on top of a town.
        bool InsideSettlement(int x, int y)
        {
            var padded = SettlementZonePad * step;
            for (var layer = 0; layer < Layers.Length; layer++)
            {
                if (Layers[layer].Category != PointOfInterestCatalog.Settlements)
                {
                    continue;
                }

                var block = Layers[layer].BlockSize * step;
                var far = (PointOfInterestCatalog.SettlementSpecs.Max(s => s.Radius) * step) + padded;
                for (var by = FloorDiv(y - far, block); by <= FloorDiv(y + far, block); by++)
                {
                    for (var bx = FloorDiv(x - far, block); bx <= FloorDiv(x + far, block); bx++)
                    {
                        if (Placed(layer, bx, by).Placed is not { } anchor || anchor.Entry.Kind != PoiKind.Anchor)
                        {
                            continue;
                        }

                        var reach = (PointOfInterestCatalog.SpecOf(anchor.Entry.Tier!.Value).Radius * step) + padded;
                        long dx = anchor.X - x;
                        long dy = anchor.Y - y;
                        if ((dx * dx) + (dy * dy) <= (long)reach * reach)
                        {
                            return true;
                        }
                    }
                }
            }

            return false;
        }

        var points = new List<PointOfInterest>();
        for (var layer = 0; layer < Layers.Length; layer++)
        {
            var (_, cat, blockSize, _, _, _, _) = Layers[layer];
            if (category is not null && category != cat)
            {
                continue;
            }

            // A settlement's satellites sit up to the largest radius from
            // its anchor, so blocks that far outside the window can still
            // reach into it.
            var isSettlement = cat == PointOfInterestCatalog.Settlements;
            var reach = isSettlement ? PointOfInterestCatalog.SettlementSpecs.Max(s => s.Radius) * step : 0;
            var block = blockSize * step;
            for (var by = FloorDiv(minY - reach, block); by <= FloorDiv(maxY + reach, block); by++)
            {
                for (var bx = FloorDiv(minX - reach, block); bx <= FloorDiv(maxX + reach, block); bx++)
                {
                    var (rng, placed) = Placed(layer, bx, by);
                    if (placed is null || (!isSettlement && InsideSettlement(placed.Value.X, placed.Value.Y)))
                    {
                        continue;
                    }

                    foreach (var point in Expand(rng, probe, placed.Value, cat, step))
                    {
                        if (point.X >= minX && point.X < maxX && point.Y >= minY && point.Y < maxY)
                        {
                            points.Add(point);
                        }
                    }
                }
            }
        }

        return new PointsOfInterest
        {
            Seed = seed,
            OriginX = originX,
            OriginY = originY,
            Width = width,
            Height = height,
            Points = points,
        };
    }

    /// <summary>Try a few jittered positions and keep the first whose biome and terrain suit some icon - lets rare-terrain categories still show up, and stays a pure function of the block. Five draws per attempt, always, so the stream never depends on what happened.</summary>
    private static (int X, int Y, PoiEntry Entry, Biome Biome)? TryPlace(Rng rng, BiomeProbe probe, IReadOnlyList<PoiEntry> entries, int bx, int by, int block, int tries, int reference, int step)
    {
        for (var attempt = 0; attempt < tries; attempt++)
        {
            // Kept off the block's edges so neighboring blocks' icons don't collide.
            var tx = (int)((bx + 0.15 + (rng.Float() * 0.7)) * block);
            var ty = (int)((by + 0.15 + (rng.Float() * 0.7)) * block);
            var tierPick = rng.Float();
            var pick = rng.Float();
            var keep = rng.Float();

            var biome = probe.At(tx, ty);
            var placementOk = new Dictionary<Placement, bool>();
            var suitable = new List<PoiEntry>();
            foreach (var e in entries)
            {
                if (e.Biomes.Contains(biome) && PlacementHolds(probe, e.Placement, tx, ty, step, placementOk))
                {
                    suitable.Add(e);
                }
            }

            if (suitable.Count == 0)
            {
                continue;
            }

            // A spot that suits some icon but only rare ones is kept in
            // proportion to their weight; a spot turned down ends the block
            // (retrying elsewhere would refill it with the same rare icon).
            if (reference > 0 && keep >= suitable.Sum(e => e.Weight) / (double)reference)
            {
                return null;
            }

            var chosen = suitable.Any(e => e.Kind == PoiKind.Anchor)
                ? PickAnchor(suitable, tierPick, pick)
                : WeightedPick(suitable, e => e.Weight, pick);
            return (tx, ty, chosen, biome);
        }

        return null;
    }

    /// <summary>How far, in strides, a shoreline search walks before giving up, and how long a stride is (cells at step 1).</summary>
    private const int ShoreSteps = 80;

    private const int ShoreStride = 3;

    /// <summary>
    /// Like <see cref="TryPlace"/> but each attempt walks a ray out from a
    /// jittered start until land turns to sea (or sea to land), then tries
    /// the last few cells on the land side - where capes, islets and shores
    /// are. Six draws per attempt, always.
    /// </summary>
    private static (int X, int Y, PoiEntry Entry, Biome Biome)? TryPlaceOnShore(Rng rng, BiomeProbe probe, IReadOnlyList<PoiEntry> entries, int bx, int by, int block, int tries, int step)
    {
        for (var attempt = 0; attempt < tries; attempt++)
        {
            var tx = (int)((bx + 0.15 + (rng.Float() * 0.7)) * block);
            var ty = (int)((by + 0.15 + (rng.Float() * 0.7)) * block);
            var direction = Compass[rng.Int(0, Compass.Length - 1)];
            var tierPick = rng.Float();
            var pick = rng.Float();
            rng.Float(); // the sixth draw, kept so every attempt consumes the same amount

            var stride = ShoreStride * step;
            var startedOnLand = probe.IsLand(tx, ty);
            var crossing = 0;
            for (var k = 1; k <= ShoreSteps; k++)
            {
                if (probe.IsLand(tx + (direction.X * stride * k), ty + (direction.Y * stride * k)) != startedOnLand)
                {
                    crossing = k;
                    break;
                }
            }

            if (crossing == 0)
            {
                continue;
            }

            // Land side of the crossing: coming from land it is the step before; from sea, the step after and a few beyond (an islet's middle).
            var spots = startedOnLand ? new[] { crossing - 1, crossing - 2, crossing - 3 } : new[] { crossing, crossing + 1, crossing + 2 };
            foreach (var k in spots)
            {
                var x = tx + (direction.X * stride * k);
                var y = ty + (direction.Y * stride * k);
                if (!probe.IsLand(x, y))
                {
                    continue;
                }

                var biome = probe.At(x, y);
                var placementOk = new Dictionary<Placement, bool>();
                var suitable = entries.Where(e => e.Biomes.Contains(biome) && PlacementHolds(probe, e.Placement, x, y, step, placementOk)).ToList();
                if (suitable.Count > 0)
                {
                    // A cape or islet is a hard-won spot: when one is found, favor the beacon it suits over the pier any shore also suits.
                    return (x, y, WeightedPick(suitable, e => e.Placement is Placement.Cape or Placement.Islet ? e.Weight * 6 : e.Weight, pick), biome);
                }
            }
        }

        return null;
    }

    /// <summary>Settlement size is drawn by its own rarity first, then the anchor within that size by its rarity.</summary>
    private static PoiEntry PickAnchor(IReadOnlyList<PoiEntry> suitable, double tierPick, double pick)
    {
        var tiers = PointOfInterestCatalog.SettlementSpecs
            .Where(s => suitable.Any(e => e.Tier == s.Tier))
            .ToList();
        var tier = WeightedPick(tiers, s => s.Weight, tierPick).Tier;
        return WeightedPick(suitable.Where(e => e.Tier == tier).ToList(), e => e.Weight, pick);
    }

    private static T WeightedPick<T>(IReadOnlyList<T> items, Func<T, int> weight, double pick)
    {
        var total = items.Sum(weight);
        var target = pick * total;
        foreach (var item in items)
        {
            target -= weight(item);
            if (target < 0)
            {
                return item;
            }
        }

        return items[^1];
    }

    /// <summary>The placed icon itself and, for a settlement anchor, its satellites.</summary>
    private static IEnumerable<PointOfInterest> Expand(Rng rng, BiomeProbe probe, (int X, int Y, PoiEntry Entry, Biome Biome) placed, string category, int step)
    {
        var (x, y, entry, biome) = placed;
        if (entry.Kind != PoiKind.Anchor)
        {
            yield return new PointOfInterest { X = x, Y = y, Category = category, Type = entry.Id, Role = PoiRole.Single };
            yield break;
        }

        var tier = entry.Tier!.Value;
        yield return new PointOfInterest { X = x, Y = y, Category = category, Type = entry.Id, Role = PoiRole.Anchor, Tier = tier };

        var spec = PointOfInterestCatalog.SpecOf(tier);
        var taken = new List<(int X, int Y)> { (x, y) };
        var spacing = ClusterSpacing * step;
        foreach (var slot in spec.Services)
        {
            var service = PointOfInterestCatalog.Find(slot.Id)!;
            if (!service.Enabled)
            {
                continue;
            }

            var count = rng.Int(slot.Min, slot.Max);
            for (var n = 0; n < count; n++)
            {
                for (var attempt = 0; attempt < SatelliteTries; attempt++)
                {
                    var angle = rng.Float() * 2 * Math.PI;
                    var distance = (0.2 + (0.8 * Math.Sqrt(rng.Float()))) * spec.Radius * step;
                    var sx = x + (int)(Math.Cos(angle) * distance);
                    var sy = y + (int)(Math.Sin(angle) * distance);
                    if (taken.Any(t => Math.Abs(t.X - sx) < spacing && Math.Abs(t.Y - sy) < spacing))
                    {
                        continue;
                    }

                    var local = probe.At(sx, sy);
                    if (local == Biome.Ocean || (local != biome && local != Biome.Grassland))
                    {
                        continue;
                    }

                    if (!PlacementHolds(probe, service.Placement, sx, sy, step, new()))
                    {
                        continue;
                    }

                    taken.Add((sx, sy));
                    yield return new PointOfInterest { X = sx, Y = sy, Category = category, Type = service.Id, Role = PoiRole.Satellite, Tier = tier };
                    break;
                }
            }
        }
    }

    /// <summary>Whether the terrain around (x, y) meets an icon's placement rule; memoized per candidate spot in `memo`.</summary>
    private static bool PlacementHolds(BiomeProbe probe, Placement placement, int x, int y, int step, Dictionary<Placement, bool> memo)
    {
        if (placement == Placement.Anywhere)
        {
            return true;
        }

        if (memo.TryGetValue(placement, out var known))
        {
            return known;
        }

        var result = placement switch
        {
            Placement.Coast => probe.IsLand(x, y) && probe.WaterAt(x, y, CoastReach * step, Cardinal) >= 1,
            Placement.Waterside => probe.IsLand(x, y) && (probe.WaterAt(x, y, WatersideReach * step, Compass) >= 1 || probe.WaterAt(x, y, WatersideReach * step / 2, Compass) >= 1),
            Placement.Cape => probe.IsLand(x, y) && probe.WaterAt(x, y, CapeReach * step, Cardinal) >= 3,
            Placement.Islet => probe.IsLand(x, y) && probe.WaterAt(x, y, IsletReach * step, Compass) >= Compass.Length - 1,
            Placement.Lake => probe.IsWater(x, y) && IsLake(probe, x, y, step),
            Placement.NearCoast => probe.IsWater(x, y) && probe.LandAt(x, y, NearCoastReach * step, Compass) >= 1,
            Placement.OpenSea => probe.IsWater(x, y) && probe.LandAt(x, y, OpenSeaReach * step, Compass) == 0 && probe.LandAt(x, y, OpenSeaReach * step * 2, Compass) == 0,
            _ => true,
        };
        memo[placement] = result;
        return result;
    }

    /// <summary>
    /// A lake is water enclosed by land: marching out along each compass
    /// direction meets land within <see cref="LakeSteps"/> strides, and not
    /// too close (broad water, not the edge of a bay). Open sea runs out of
    /// strides in the very first ray, so it costs little to reject.
    /// </summary>
    private static bool IsLake(BiomeProbe probe, int x, int y, int step)
    {
        var stride = LakeStride * step;
        foreach (var (dx, dy) in Compass)
        {
            var found = false;
            for (var k = 1; k <= LakeSteps; k++)
            {
                if (probe.IsLand(x + (dx * stride * k), y + (dy * stride * k)))
                {
                    if (k <= LakeMinStrides)
                    {
                        return false;
                    }

                    found = true;
                    break;
                }
            }

            if (!found)
            {
                return false;
            }
        }

        return true;
    }

    /// <summary>Biome lookups for one Generate call, cached: rays of neighbouring probes overlap a lot.</summary>
    private sealed class BiomeProbe(string seed, int step)
    {
        private readonly Dictionary<(int, int), Biome> _cache = [];

        public Biome At(int x, int y)
        {
            if (!_cache.TryGetValue((x, y), out var biome))
            {
                biome = MapGenerator.BiomeAt(seed, x, y, step);
                _cache[(x, y)] = biome;
            }

            return biome;
        }

        public bool IsWater(int x, int y) => At(x, y) == Biome.Ocean;

        public bool IsLand(int x, int y) => At(x, y) != Biome.Ocean;

        /// <summary>How many of `directions` find water exactly `reach` cells away.</summary>
        public int WaterAt(int x, int y, int reach, (int X, int Y)[] directions) =>
            directions.Count(d => IsWater(x + (d.X * reach), y + (d.Y * reach)));

        /// <summary>How many of `directions` find land at `reach`, or half of it - a coast that a single ray might skip over.</summary>
        public int LandAt(int x, int y, int reach, (int X, int Y)[] directions) =>
            directions.Count(d => IsLand(x + (d.X * reach), y + (d.Y * reach)) || IsLand(x + (d.X * reach / 2), y + (d.Y * reach / 2)));
    }

    private static int FloorDiv(int value, int divisor) => (int)Math.Floor((double)value / divisor);
}
