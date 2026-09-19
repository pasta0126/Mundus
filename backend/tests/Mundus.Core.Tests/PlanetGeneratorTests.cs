using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class SeedNormalizerTests
{
    [Theory]
    [InlineData("Kepler 4")]
    [InlineData("  kepler   4 ")]
    [InlineData("KEPLER 4")]
    public void EquivalentSpellingsNormalizeToTheSameSeed(string raw)
    {
        Assert.Equal("kepler 4", SeedNormalizer.Normalize(raw));
    }

    [Fact]
    public void ComposedAndDecomposedUnicodeAreTheSameSeed()
    {
        Assert.Equal(SeedNormalizer.Normalize("café"), SeedNormalizer.Normalize("café"));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void EmptySeedsAreRejected(string? raw)
    {
        Assert.False(SeedNormalizer.TryNormalize(raw, out _));
    }

    [Fact]
    public void OversizedSeedsAreRejected()
    {
        Assert.False(SeedNormalizer.TryNormalize(new string('a', SeedNormalizer.MaxLength + 1), out _));
        Assert.True(SeedNormalizer.TryNormalize(new string('a', SeedNormalizer.MaxLength), out _));
    }
}

public class PlanetGeneratorTests
{
    private static IEnumerable<Planet> ManyPlanets(int count = 300) =>
        Enumerable.Range(0, count).Select(i => PlanetGenerator.Generate($"planet-test-{i}"));

    [Fact]
    public void SameSeedYieldsTheSamePlanet()
    {
        var a = PlanetGenerator.Generate("kepler 4");
        var b = PlanetGenerator.Generate("kepler 4");
        Assert.Equal(System.Text.Json.JsonSerializer.Serialize(a), System.Text.Json.JsonSerializer.Serialize(b));
    }

    [Fact]
    public void SpellingOfTheSeedDoesNotChangeThePlanet()
    {
        var a = PlanetGenerator.Generate("Kepler 4");
        var b = PlanetGenerator.Generate("  KEPLER   4 ");
        Assert.Equal(a.Seed, b.Seed);
        Assert.Equal(a with { Name = "" }, b with { Name = "" }, PlanetComparer.Instance);
    }

    [Fact]
    public void DifferentSeedsYieldDifferentPlanets()
    {
        var textureSeeds = ManyPlanets(20).Select(p => p.TextureSeed).Distinct().Count();
        Assert.True(textureSeeds > 1);
    }

    [Fact]
    public void EveryTypeAppearsAcrossManySeeds()
    {
        var types = ManyPlanets().Select(p => p.Type).ToHashSet();
        Assert.Equal(Enum.GetValues<PlanetType>().Length, types.Count);
    }

    [Fact]
    public void CloudsOnlyExistWithAnAtmosphere()
    {
        foreach (var planet in ManyPlanets())
        {
            if (planet.Atmosphere is null)
            {
                Assert.Null(planet.Atmosphere?.Clouds);
            }
        }
        Assert.Contains(ManyPlanets(), p => p.Atmosphere?.Clouds is not null);
        Assert.Contains(ManyPlanets(), p => p.Atmosphere is { Clouds: null });
    }

    [Fact]
    public void GasGiantsAlwaysHaveAnAtmosphere()
    {
        var giants = ManyPlanets().Where(p => p.Type == PlanetType.GasGiant).ToList();
        Assert.NotEmpty(giants);
        Assert.All(giants, p => Assert.NotNull(p.Atmosphere));
    }

    [Fact]
    public void RingsAndAsteroidFieldsAreOptionalAndIndependent()
    {
        var planets = ManyPlanets().ToList();
        Assert.Contains(planets, p => p.Rings is not null);
        Assert.Contains(planets, p => p.AsteroidField is not null);
        Assert.Contains(planets, p => p.Rings is null && p.AsteroidField is null);
    }

    [Fact]
    public void MoonCountIsBoundedAndMoonsAreSmallerThanTheirPlanet()
    {
        var planets = ManyPlanets().ToList();
        Assert.All(planets, p =>
        {
            Assert.InRange(p.Moons.Count, 0, PlanetGenerator.MaxMoons);
            Assert.All(p.Moons, m => Assert.True(m.Size < 1));
        });
        Assert.Contains(planets, p => p.Moons.Count == 0);
        Assert.Contains(planets, p => p.Moons.Count == PlanetGenerator.MaxMoons);
    }

    [Fact]
    public void MoonsOrbitBeyondRingsAndAsteroidFields()
    {
        foreach (var p in ManyPlanets())
        {
            var clearOf = Math.Max(p.Rings?.Outer ?? 0, p.AsteroidField?.Outer ?? 0);
            Assert.All(p.Moons, m => Assert.True(m.Orbit.Radius > clearOf));
        }
    }

    [Fact]
    public void EveryPlanetCarriesSpinAndOnePalette()
    {
        Assert.All(ManyPlanets(), p =>
        {
            Assert.True(p.RotationPeriodSeconds > 0);
            Assert.InRange(p.AxialTiltDegrees, 0, 90);
            Assert.Equal(3, p.Palette.Count);
            Assert.All(p.Features, f => Assert.InRange(f.ColorIndex, 0, 2));
        });
    }

    [Fact]
    public void DescriptionDoesNotDependOnTheMachinesCulture()
    {
        var original = System.Globalization.CultureInfo.CurrentCulture;
        try
        {
            System.Globalization.CultureInfo.CurrentCulture = new System.Globalization.CultureInfo("es-ES");
            var spanish = PlanetGenerator.Generate("kepler 4").Description;
            System.Globalization.CultureInfo.CurrentCulture = System.Globalization.CultureInfo.InvariantCulture;
            var invariant = PlanetGenerator.Generate("kepler 4").Description;
            Assert.Equal(invariant, spanish);
            Assert.Matches(@"\d\.\d Earth radii", invariant);
        }
        finally
        {
            System.Globalization.CultureInfo.CurrentCulture = original;
        }
    }

    [Fact]
    public void ReportsItsSpecVersion()
    {
        Assert.Equal(PlanetGenerator.CurrentSpecVersion, PlanetGenerator.Generate("any").SpecVersion);
    }

    [Fact]
    public void RejectsAnInvalidSeed()
    {
        Assert.Throws<ArgumentException>(() => PlanetGenerator.Generate("   "));
    }

    /// <summary>Compares planets by their serialized form (they hold lists).</summary>
    private sealed class PlanetComparer : IEqualityComparer<Planet>
    {
        public static readonly PlanetComparer Instance = new();

        public bool Equals(Planet? x, Planet? y) =>
            System.Text.Json.JsonSerializer.Serialize(x) == System.Text.Json.JsonSerializer.Serialize(y);

        public int GetHashCode(Planet obj) => System.Text.Json.JsonSerializer.Serialize(obj).GetHashCode();
    }
}
