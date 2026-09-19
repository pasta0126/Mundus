namespace Mundus.Core;

public enum CentralBodyKind
{
    RedDwarf,
    Orange,
    Yellow,
    BlueGiant,
    WhiteDwarf,
    Pulsar,
    BlackHole,
}

public sealed record CentralBody
{
    public required CentralBodyKind Kind { get; init; }

    /// <summary>In system units (the same units as orbit radii).</summary>
    public required double Size { get; init; }
    public required string Color { get; init; }

    /// <summary>Null when the body sits at the common center (a group of one).</summary>
    public required Orbit? Orbit { get; init; }
}

public sealed record PlanetSlot
{
    /// <summary>1-based position, counting outward.</summary>
    public required int Index { get; init; }

    /// <summary>The normalized seed of the planet in this slot.</summary>
    public required string PlanetSeed { get; init; }
    public required Planet Planet { get; init; }
    public required Orbit Orbit { get; init; }
}

public sealed record AsteroidBelt
{
    /// <summary>The belt sits between this slot and the next (1-based).</summary>
    public required int AfterSlot { get; init; }
    public required double Width { get; init; }
    public required string Color { get; init; }
    public required int Count { get; init; }

    /// <summary>Radius is the belt's middle; always in the reference plane.</summary>
    public required Orbit Orbit { get; init; }
}

public sealed record PlanetarySystem
{
    public required int SpecVersion { get; init; }

    /// <summary>The normalized central seed the system was generated from.</summary>
    public required string Seed { get; init; }

    /// <summary>The central seed as the person wrote it; display only.</summary>
    public required string Name { get; init; }
    public required IReadOnlyList<CentralBody> Central { get; init; }
    public required IReadOnlyList<PlanetSlot> Slots { get; init; }
    public required AsteroidBelt? Belt { get; init; }
}

/// <summary>
/// Derives a whole system from its seed: a central group of one or two
/// bodies, up to eight planet slots, and at most one asteroid belt. A custom
/// system supplies its own planet seeds and belt position but takes the
/// central group and every orbit from the central seed exactly as a
/// generated system does, so listing a generated system's planet seeds
/// reproduces it. Orbits depend only on (central seed, slot index), each on
/// its own named stream, so the number of slots never changes an earlier
/// one. Changing what a seed produces is a breaking change to
/// <see cref="CurrentSpecVersion"/>. See
/// openspec/changes/add-planets-and-systems/specs/system-generation/spec.md.
/// </summary>
public static class SystemGenerator
{
    public const int CurrentSpecVersion = 2;
    public const int MaxPlanets = 8;

    /// <summary>A system is single or binary; never more.</summary>
    public const int MaxCentralBodies = 2;

    /// <summary>Room for the "/n" suffix of a slot's planet seed.</summary>
    public const int MaxSeedLength = SeedNormalizer.MaxLength - 2;

    private static readonly IReadOnlyList<Rng.WeightedItem<int>> CountWeights =
    [
        new(1, 4), new(2, 8), new(3, 14), new(4, 16), new(5, 16), new(6, 14), new(7, 10), new(8, 8),
    ];

    private static readonly IReadOnlyList<Rng.WeightedItem<int>> GroupSizeWeights =
        [new(1, 65), new(2, 35)];

    private static readonly IReadOnlyList<Rng.WeightedItem<CentralBodyKind>> KindWeights =
    [
        new(CentralBodyKind.RedDwarf, 26),
        new(CentralBodyKind.Yellow, 24),
        new(CentralBodyKind.Orange, 22),
        new(CentralBodyKind.WhiteDwarf, 10),
        new(CentralBodyKind.BlueGiant, 8),
        new(CentralBodyKind.Pulsar, 5),
        new(CentralBodyKind.BlackHole, 5),
    ];

    private static readonly string[] BeltColors = ["#8a7f72", "#a39485", "#6f6a66"];

    private static (double Size, string Color) Look(CentralBodyKind kind) => kind switch
    {
        CentralBodyKind.RedDwarf => (0.55, "#ff6a4d"),
        CentralBodyKind.Orange => (0.8, "#ffa54d"),
        CentralBodyKind.Yellow => (1.0, "#ffe27a"),
        CentralBodyKind.BlueGiant => (1.9, "#8fb8ff"),
        CentralBodyKind.WhiteDwarf => (0.3, "#eaf1ff"),
        CentralBodyKind.Pulsar => (0.25, "#b6d0ff"),
        _ => (0.6, "#000000"),
    };

    /// <summary>A whole system from one seed: the slots' planet seeds are "&lt;seed&gt;/&lt;n&gt;".</summary>
    public static PlanetarySystem Generate(string rawSeed)
    {
        var seed = NormalizeCentral(rawSeed);
        var display = SeedNormalizer.DisplayName(rawSeed);

        var count = new Rng($"{seed}|slots").Weighted(CountWeights);
        var planetSeeds = Enumerable.Range(1, count).Select(n => $"{display}/{n}").ToList();

        var beltRng = new Rng($"{seed}|belt|decision");
        var hasBelt = count >= 2 && beltRng.Bool(0.4);
        var after = beltRng.Int(1, Math.Max(1, count - 1));

        return Build(rawSeed, planetSeeds, hasBelt ? after : null);
    }

    /// <summary>
    /// A custom system: the central group and orbits come from the central seed;
    /// the planets are the seeds listed. <paramref name="beltAfter"/> optionally
    /// places the belt between that slot and the next.
    /// </summary>
    public static PlanetarySystem GenerateCustom(
        string rawCentralSeed, IReadOnlyList<string> planetSeeds, int? beltAfter)
    {
        NormalizeCentral(rawCentralSeed);
        return Build(rawCentralSeed, planetSeeds, beltAfter);
    }

    private static string NormalizeCentral(string rawSeed)
    {
        var seed = SeedNormalizer.Normalize(rawSeed);
        if (seed.Length > MaxSeedLength)
        {
            throw new ArgumentException(
                $"system seed must be at most {MaxSeedLength} characters", nameof(rawSeed));
        }
        return seed;
    }

    private static PlanetarySystem Build(string rawSeed, IReadOnlyList<string> planetSeeds, int? beltAfter)
    {
        var seed = NormalizeCentral(rawSeed);

        if (planetSeeds.Count is < 1 or > MaxPlanets)
        {
            throw new ArgumentException($"a system has 1 to {MaxPlanets} planets", nameof(planetSeeds));
        }
        if (beltAfter is not null && (beltAfter < 1 || beltAfter > planetSeeds.Count - 1))
        {
            throw new ArgumentException(
                "the belt must sit between two planets", nameof(beltAfter));
        }

        var central = GenerateCentral(seed, out var extent);
        var start = extent + 3.0;

        var radii = new List<double>();
        for (var i = 1; i <= planetSeeds.Count; i++)
        {
            radii.Add(SlotRadius(seed, i, start));
        }

        var slots = new List<PlanetSlot>();
        for (var i = 1; i <= planetSeeds.Count; i++)
        {
            var planet = PlanetGenerator.Generate(planetSeeds[i - 1]);
            slots.Add(new PlanetSlot
            {
                Index = i,
                PlanetSeed = planet.Seed,
                Planet = planet,
                Orbit = SlotOrbit(seed, i, radii[i - 1], start),
            });
        }

        AsteroidBelt? belt = null;
        if (beltAfter is { } k)
        {
            var radius = Round((radii[k - 1] + radii[k]) / 2);
            var rb = new Rng($"{seed}|belt|params");
            belt = new AsteroidBelt
            {
                AfterSlot = k,
                Width = Round(Math.Min((radii[k] - radii[k - 1]) * 0.5, 2.4) * (0.6 + 0.4 * rb.Float())),
                Color = rb.Pick(BeltColors),
                Count = rb.Int(300, 700),
                Orbit = new Orbit
                {
                    Radius = radius,
                    PeriodSeconds = Round(25 * Math.Pow(radius / start, 1.5)),
                    PhaseDegrees = 0,
                    InclinationDegrees = 0,
                },
            };
        }

        return new PlanetarySystem
        {
            SpecVersion = CurrentSpecVersion,
            Seed = seed,
            Name = SeedNormalizer.DisplayName(rawSeed),
            Central = central,
            Slots = slots,
            Belt = belt,
        };
    }

    private static List<CentralBody> GenerateCentral(string seed, out double extent)
    {
        var rng = new Rng($"{seed}|central");
        var count = rng.Weighted(GroupSizeWeights);
        // A black hole owns the center: it only ever appears alone.
        var pool = count == 1 ? KindWeights : KindWeights.Where(w => w.Value != CentralBodyKind.BlackHole).ToList();
        var kinds = Enumerable.Range(0, count).Select(_ => rng.Weighted(pool)).ToList();
        var looks = kinds.Select(Look).ToList();

        if (count == 1)
        {
            extent = looks[0].Size;
            return [new CentralBody { Kind = kinds[0], Size = looks[0].Size, Color = looks[0].Color, Orbit = null }];
        }

        // A tight pair orbits the common center in opposite phases.
        var pairRadius = Round(Math.Max(looks[0].Size, looks[1].Size) * 1.3 + 0.3);
        var pairPeriod = Round(8 + rng.Float() * 10);
        var phase = Round(rng.Float() * 360);
        var bodies = new List<CentralBody>();
        for (var i = 0; i < 2; i++)
        {
            bodies.Add(new CentralBody
            {
                Kind = kinds[i],
                Size = looks[i].Size,
                Color = looks[i].Color,
                Orbit = new Orbit
                {
                    Radius = pairRadius,
                    PeriodSeconds = pairPeriod,
                    PhaseDegrees = Round((phase + 180 * i) % 360),
                    InclinationDegrees = 0,
                },
            });
        }
        extent = pairRadius + Math.Max(looks[0].Size, looks[1].Size);

        return bodies;
    }

    /// <summary>
    /// Radius of slot <paramref name="index"/>: the start plus every gap up to
    /// it, each gap on its own stream so it never depends on how many slots
    /// there are.
    /// </summary>
    private static double SlotRadius(string seed, int index, double start)
    {
        var radius = start;
        for (var j = 1; j <= index; j++)
        {
            var gap = (2.2 + new Rng($"{seed}|gap|{j}").Float() * 2.4) * (1 + 0.12 * (j - 1));
            radius += gap;
        }
        return Round(radius);
    }

    private static Orbit SlotOrbit(string seed, int index, double radius, double start)
    {
        var rng = new Rng($"{seed}|slot|{index}");
        var inclined = rng.Bool(0.18);
        var inclination = inclined
            ? (12 + rng.Float() * 28) * (rng.Bool() ? 1 : -1)
            : (rng.Float() * 2 - 1) * 1.5;
        return new Orbit
        {
            Radius = radius,
            PeriodSeconds = Round(25 * Math.Pow(radius / start, 1.5)),
            PhaseDegrees = Round(rng.Float() * 360),
            InclinationDegrees = Round(inclination),
        };
    }

    private static double Round(double value) => Math.Round(value, 3);
}
