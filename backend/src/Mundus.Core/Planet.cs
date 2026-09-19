namespace Mundus.Core;

public enum PlanetType
{
    Rocky,
    Desert,
    Oceanic,
    Ice,
    Lava,
    Toxic,
    GasGiant,
}

/// <summary>
/// A low-detail geographic singularity the viewer paints onto the texture.
/// Position is on the sphere (degrees); size is a fraction of the radius.
/// </summary>
public enum SurfaceFeatureKind
{
    Crater,
    Ridge,
    Dunes,
    Canyon,
    Continent,
    PolarCap,
    Crack,
    LavaFlow,
    Volcano,
    Lake,
    Band,
    Storm,
}

public sealed record SurfaceFeature
{
    public required SurfaceFeatureKind Kind { get; init; }
    public required double LatitudeDegrees { get; init; }
    public required double LongitudeDegrees { get; init; }
    public required double Size { get; init; }

    /// <summary>Index into <see cref="Planet.Palette"/>.</summary>
    public required int ColorIndex { get; init; }
}

public sealed record Atmosphere
{
    public required string Color { get; init; }
    public required double Density { get; init; }

    /// <summary>Null when the planet has an atmosphere but no cloud layer.</summary>
    public required CloudLayer? Clouds { get; init; }
}

public sealed record CloudLayer
{
    public required string Color { get; init; }
    public required double Coverage { get; init; }
}

/// <summary>Inner and outer extent are in planet radii.</summary>
public sealed record Rings
{
    public required double Inner { get; init; }
    public required double Outer { get; init; }
    public required string Color { get; init; }
}

/// <summary>Inner and outer extent are in planet radii.</summary>
public sealed record AsteroidField
{
    public required double Inner { get; init; }
    public required double Outer { get; init; }
    public required string Color { get; init; }
    public required int Count { get; init; }
}

public sealed record Moon
{
    /// <summary>In planet radii; always smaller than 1.</summary>
    public required double Size { get; init; }
    public required IReadOnlyList<string> Palette { get; init; }
    public required Orbit Orbit { get; init; }
}

public sealed record Planet
{
    public required int SpecVersion { get; init; }

    /// <summary>The normalized seed the planet was generated from.</summary>
    public required string Seed { get; init; }

    /// <summary>The seed as the person wrote it; display only.</summary>
    public required string Name { get; init; }
    public required PlanetType Type { get; init; }

    /// <summary>In Earth radii.</summary>
    public required double Radius { get; init; }
    public required string Description { get; init; }

    /// <summary>Hex colors of the single palette: base, secondary, accent.</summary>
    public required IReadOnlyList<string> Palette { get; init; }
    public required uint TextureSeed { get; init; }
    public required IReadOnlyList<SurfaceFeature> Features { get; init; }
    public required Atmosphere? Atmosphere { get; init; }
    public required Rings? Rings { get; init; }
    public required AsteroidField? AsteroidField { get; init; }
    public required IReadOnlyList<Moon> Moons { get; init; }
    public required double RotationPeriodSeconds { get; init; }
    public required double AxialTiltDegrees { get; init; }
}

/// <summary>
/// Derives a whole planet from nothing but its seed - never from a system,
/// an orbit, or any earlier request - so a planet requested alone is the
/// same planet as that seed inside a system. Every child stream is created
/// up front in a fixed order (see <see cref="Rng.Child"/>): append new
/// streams at the end, never insert. Changing what a seed produces is a
/// breaking change to <see cref="CurrentSpecVersion"/>. See
/// openspec/changes/add-planets-and-systems/specs/planet-generation/spec.md.
/// </summary>
public static class PlanetGenerator
{
    public const int CurrentSpecVersion = 1;

    public const int MaxMoons = 3;

    private static readonly IReadOnlyDictionary<PlanetType, string[][]> Palettes =
        new Dictionary<PlanetType, string[][]>
        {
            [PlanetType.Rocky] =
            [
                ["#8a8378", "#6b655c", "#b5ad9f"],
                ["#7d7268", "#5a5048", "#a89c8c"],
                ["#918a86", "#67615d", "#c2bab4"],
            ],
            [PlanetType.Desert] =
            [
                ["#d9a066", "#b57a45", "#f0c48a"],
                ["#cf8f5b", "#a5643a", "#e8b483"],
                ["#dfb679", "#b98a4e", "#f5d29b"],
            ],
            [PlanetType.Oceanic] =
            [
                ["#2f6fb0", "#4f9a5c", "#e8f1f8"],
                ["#2a5f9e", "#6aa36a", "#dfe9f2"],
                ["#3a7fc0", "#5a8f4f", "#f2f6fa"],
            ],
            [PlanetType.Ice] =
            [
                ["#dceaf2", "#a9c6d8", "#f8fcff"],
                ["#cfe0ea", "#9dbbcf", "#eef7fc"],
                ["#e4eef4", "#b6cfdf", "#ffffff"],
            ],
            [PlanetType.Lava] =
            [
                ["#3a2622", "#e0531f", "#ffb03a"],
                ["#2e1e1b", "#d4421a", "#ff9d2e"],
                ["#42302a", "#e86a2a", "#ffc24d"],
            ],
            [PlanetType.Toxic] =
            [
                ["#8fa23a", "#5f7a2a", "#cfd96a"],
                ["#a3a83c", "#6f7a30", "#dde079"],
                ["#7e9a48", "#546b34", "#bcd074"],
            ],
            [PlanetType.GasGiant] =
            [
                ["#d8b088", "#a87a52", "#f2dcc0"],
                ["#c9a06a", "#8f6a3f", "#e8cf9f"],
                ["#9fb6d4", "#6f8bb0", "#d4e0ef"],
                ["#c98a6b", "#9a5a44", "#ecc1a8"],
            ],
        };

    private static readonly IReadOnlyList<Rng.WeightedItem<PlanetType>> TypeWeights =
    [
        new(PlanetType.Rocky, 22),
        new(PlanetType.Desert, 16),
        new(PlanetType.Oceanic, 16),
        new(PlanetType.Ice, 12),
        new(PlanetType.Lava, 8),
        new(PlanetType.Toxic, 8),
        new(PlanetType.GasGiant, 18),
    ];

    /// <summary>
    /// Chance of an atmosphere per type; gas giants always have one.
    /// </summary>
    private static double AtmosphereChance(PlanetType type) => type switch
    {
        PlanetType.GasGiant => 1.0,
        PlanetType.Oceanic => 0.9,
        PlanetType.Toxic => 0.95,
        PlanetType.Desert => 0.5,
        PlanetType.Ice => 0.5,
        PlanetType.Lava => 0.5,
        _ => 0.35,
    };

    public static Planet Generate(string rawSeed)
    {
        var seed = SeedNormalizer.Normalize(rawSeed);
        var root = new Rng(seed);

        var typeRng = root.Child("type");
        var sizeRng = root.Child("size");
        var paletteRng = root.Child("palette");
        var surfaceRng = root.Child("surface");
        var atmosphereRng = root.Child("atmosphere");
        var ringsRng = root.Child("rings");
        var asteroidsRng = root.Child("asteroids");
        var moonsRng = root.Child("moons");
        var spinRng = root.Child("spin");
        var textureRng = root.Child("texture");

        var type = typeRng.Weighted(TypeWeights);
        var radius = Round(type == PlanetType.GasGiant
            ? 4 + sizeRng.Float() * 8
            : 0.4 + sizeRng.Float() * 1.4);
        var palette = paletteRng.Pick(Palettes[type]);

        var features = GenerateFeatures(type, surfaceRng);
        var atmosphere = GenerateAtmosphere(type, palette, atmosphereRng);
        var rings = GenerateRings(type, palette, ringsRng);
        var asteroidField = GenerateAsteroidField(palette, rings, asteroidsRng);
        var moons = GenerateMoons(type, palette, rings, asteroidField, moonsRng);

        return new Planet
        {
            SpecVersion = CurrentSpecVersion,
            Seed = seed,
            Name = SeedNormalizer.DisplayName(rawSeed),
            Type = type,
            Radius = radius,
            Description = Describe(type, radius, atmosphere, rings, asteroidField, moons.Count),
            Palette = palette,
            TextureSeed = (uint)textureRng.Int(0, int.MaxValue),
            Features = features,
            Atmosphere = atmosphere,
            Rings = rings,
            AsteroidField = asteroidField,
            Moons = moons,
            RotationPeriodSeconds = Round(30 + spinRng.Float() * 90),
            AxialTiltDegrees = Round(spinRng.Float() * 45),
        };
    }

    private static List<SurfaceFeature> GenerateFeatures(PlanetType type, Rng rng)
    {
        (SurfaceFeatureKind Kind, int Min, int Max)[] plan = type switch
        {
            PlanetType.Rocky => [(SurfaceFeatureKind.Crater, 3, 6), (SurfaceFeatureKind.Ridge, 1, 3)],
            PlanetType.Desert => [(SurfaceFeatureKind.Dunes, 2, 4), (SurfaceFeatureKind.Canyon, 1, 2), (SurfaceFeatureKind.Crater, 0, 2)],
            PlanetType.Oceanic => [(SurfaceFeatureKind.Continent, 2, 4), (SurfaceFeatureKind.PolarCap, 2, 2)],
            PlanetType.Ice => [(SurfaceFeatureKind.Crack, 2, 4), (SurfaceFeatureKind.Crater, 1, 3), (SurfaceFeatureKind.PolarCap, 2, 2)],
            PlanetType.Lava => [(SurfaceFeatureKind.LavaFlow, 2, 4), (SurfaceFeatureKind.Volcano, 1, 3)],
            PlanetType.Toxic => [(SurfaceFeatureKind.Lake, 2, 4), (SurfaceFeatureKind.Storm, 0, 1)],
            _ => [(SurfaceFeatureKind.Band, 4, 7), (SurfaceFeatureKind.Storm, 0, 2)],
        };

        var features = new List<SurfaceFeature>();
        foreach (var (kind, min, max) in plan)
        {
            var count = rng.Int(min, max);
            for (var i = 0; i < count; i++)
            {
                var polar = kind == SurfaceFeatureKind.PolarCap;
                features.Add(new SurfaceFeature
                {
                    Kind = kind,
                    // Polar caps alternate poles; bands spread over the whole
                    // globe like the belts of a gas giant.
                    LatitudeDegrees = Round(polar
                        ? (i % 2 == 0 ? 82 : -82)
                        : -70 + rng.Float() * 140),
                    LongitudeDegrees = Round(-180 + rng.Float() * 360),
                    Size = Round(0.06 + rng.Float() * 0.24),
                    ColorIndex = rng.Int(0, 2),
                });
            }
        }
        return features;
    }

    private static Atmosphere? GenerateAtmosphere(PlanetType type, string[] palette, Rng rng)
    {
        if (!rng.Bool(AtmosphereChance(type))) return null;

        // Gas giants read as mostly cloud already; give them a thin haze.
        var cloudChance = type == PlanetType.GasGiant ? 0.3 : 0.7;
        var clouds = rng.Bool(cloudChance)
            ? new CloudLayer { Color = "#ffffff", Coverage = Round(0.25 + rng.Float() * 0.5) }
            : null;
        var color = type switch
        {
            PlanetType.Oceanic => "#8ec5ff",
            PlanetType.Toxic => "#d8e36a",
            PlanetType.Lava => "#ff9a5a",
            _ => palette[2],
        };
        return new Atmosphere
        {
            Color = color,
            Density = Round(0.2 + rng.Float() * 0.8),
            Clouds = clouds,
        };
    }

    private static Rings? GenerateRings(PlanetType type, string[] palette, Rng rng)
    {
        var chance = type switch
        {
            PlanetType.GasGiant => 0.5,
            PlanetType.Ice => 0.15,
            _ => 0.08,
        };
        if (!rng.Bool(chance)) return null;

        var inner = 1.3 + rng.Float() * 0.4;
        return new Rings
        {
            Inner = Round(inner),
            Outer = Round(inner + 0.4 + rng.Float() * 0.8),
            Color = palette[rng.Int(1, 2)],
        };
    }

    private static AsteroidField? GenerateAsteroidField(string[] palette, Rings? rings, Rng rng)
    {
        if (!rng.Bool(0.1)) return null;

        // Sits outside any rings, and clear of where moons start.
        var inner = (rings?.Outer ?? 1.5) + 0.3 + rng.Float() * 0.3;
        return new AsteroidField
        {
            Inner = Round(inner),
            Outer = Round(inner + 0.5 + rng.Float() * 0.6),
            Color = palette[0],
            Count = rng.Int(80, 200),
        };
    }

    private static List<Moon> GenerateMoons(
        PlanetType type, string[] palette, Rings? rings, AsteroidField? field, Rng rng)
    {
        var count = type == PlanetType.GasGiant
            ? rng.Int(1, MaxMoons)
            : rng.Weighted<int>([new(0, 45), new(1, 35), new(2, 15), new(3, 5)]);

        // Moons start beyond every ring and asteroid field.
        var distance = Math.Max(2.4, Math.Max(rings?.Outer ?? 0, field?.Outer ?? 0) + 0.5);
        var moons = new List<Moon>();
        for (var i = 0; i < count; i++)
        {
            distance += 0.8 + rng.Float() * 0.8;
            moons.Add(new Moon
            {
                Size = Round(0.05 + rng.Float() * 0.25),
                Palette = rng.Pick<string[]>(Palettes[PlanetType.Rocky]),
                Orbit = new Orbit
                {
                    Radius = Round(distance),
                    PeriodSeconds = Round(20 + rng.Float() * 70),
                    PhaseDegrees = Round(rng.Float() * 360),
                    InclinationDegrees = Round(rng.Float() * 12),
                },
            });
        }
        return moons;
    }

    private static string Describe(
        PlanetType type, double radius, Atmosphere? atmosphere,
        Rings? rings, AsteroidField? field, int moons)
    {
        var body = type switch
        {
            PlanetType.Rocky => "A barren, cratered rock",
            PlanetType.Desert => "A dry world of dunes and canyons",
            PlanetType.Oceanic => "A blue world of seas and scattered continents",
            PlanetType.Ice => "A frozen world of pale ice and cracked plains",
            PlanetType.Lava => "A scorched world of lava flows and volcanoes",
            PlanetType.Toxic => "A poisonous world of sulfur lakes and yellow haze",
            _ => "A vast banded gas giant",
        };

        var extras = new List<string>();
        if (atmosphere is not null)
        {
            extras.Add(atmosphere.Clouds is not null ? "a cloudy atmosphere" : "a clear atmosphere");
        }
        if (rings is not null) extras.Add("a ring system");
        if (field is not null) extras.Add("its own asteroid field");
        if (moons > 0) extras.Add(moons == 1 ? "one moon" : $"{moons} moons");

        var extra = extras.Count == 0 ? "" : $", with {string.Join(", ", extras)}";
        // Invariant culture: the description is part of the deterministic
        // output, so it must not depend on the machine's locale.
        return string.Create(
            System.Globalization.CultureInfo.InvariantCulture,
            $"{body}, {radius:0.0} Earth radii across{extra}.");
    }

    private static double Round(double value) => Math.Round(value, 3);
}
