using System.Text.Json;
using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class SystemGeneratorTests
{
    private static IEnumerable<PlanetarySystem> ManySystems(int count = 300) =>
        Enumerable.Range(0, count).Select(i => SystemGenerator.Generate($"system-test-{i}"));

    private static string Json(object value) => JsonSerializer.Serialize(value);

    [Fact]
    public void SameSeedYieldsTheSameSystem()
    {
        Assert.Equal(Json(SystemGenerator.Generate("Kepler")), Json(SystemGenerator.Generate("Kepler")));
    }

    [Fact]
    public void SpellingOfTheSeedDoesNotChangeTheSystem()
    {
        var a = SystemGenerator.Generate("Kepler 4");
        var b = SystemGenerator.Generate("  KEPLER   4 ");
        Assert.Equal(a.Seed, b.Seed);
        Assert.Equal(Json(a.Central), Json(b.Central));
        Assert.Equal(Json(a.Slots.Select(s => s.Orbit)), Json(b.Slots.Select(s => s.Orbit)));
    }

    [Fact]
    public void CentralGroupIsSingleOrBinaryAndEveryKindAppears()
    {
        var systems = ManySystems().ToList();
        Assert.All(systems, s => Assert.InRange(s.Central.Count, 1, SystemGenerator.MaxCentralBodies));
        Assert.Contains(systems, s => s.Central.Count == 1);
        Assert.Contains(systems, s => s.Central.Count == 2);
        var kinds = systems.SelectMany(s => s.Central).Select(b => b.Kind).ToHashSet();
        Assert.Equal(Enum.GetValues<CentralBodyKind>().Length, kinds.Count);
    }

    [Fact]
    public void ABlackHoleIsAlwaysAloneAtTheCenter()
    {
        var holes = ManySystems(600).Where(s => s.Central.Any(b => b.Kind == CentralBodyKind.BlackHole)).ToList();
        Assert.NotEmpty(holes);
        Assert.All(holes, s =>
        {
            Assert.Single(s.Central);
            Assert.Null(s.Central[0].Orbit);
        });
    }

    [Fact]
    public void ASingleBodySitsAtTheCenterAndGroupsOrbit()
    {
        foreach (var s in ManySystems())
        {
            if (s.Central.Count == 1) Assert.Null(s.Central[0].Orbit);
            else Assert.All(s.Central, b => Assert.NotNull(b.Orbit));
        }
    }

    [Fact]
    public void SlotSeedsFollowThePatternAndMatchTheStandalonePlanet()
    {
        var system = SystemGenerator.Generate("Kepler");
        Assert.InRange(system.Slots.Count, 1, SystemGenerator.MaxPlanets);
        for (var i = 0; i < system.Slots.Count; i++)
        {
            var slot = system.Slots[i];
            Assert.Equal(i + 1, slot.Index);
            Assert.Equal($"kepler/{i + 1}", slot.PlanetSeed);
            var alone = PlanetGenerator.Generate(slot.PlanetSeed);
            Assert.Equal(Json(alone with { Name = "" }), Json(slot.Planet with { Name = "" }));
        }
    }

    [Fact]
    public void OrbitsMoveOutwardAndStayOutsideTheCentralGroup()
    {
        foreach (var s in ManySystems())
        {
            var extent = s.Central.Max(b => (b.Orbit?.Radius ?? 0) + b.Size);
            var previous = extent;
            foreach (var slot in s.Slots)
            {
                Assert.True(slot.Orbit.Radius > previous);
                previous = slot.Orbit.Radius;
            }
        }
    }

    [Fact]
    public void MostOrbitsAreCoplanarAndAFewAreInclined()
    {
        var incl = ManySystems().SelectMany(s => s.Slots).Select(sl => Math.Abs(sl.Orbit.InclinationDegrees)).ToList();
        Assert.True(incl.Count(i => i <= 2) > incl.Count * 0.6);
        Assert.Contains(incl, i => i >= 10);
    }

    [Fact]
    public void ASystemNeverHasMoreThanOneBeltAndItSitsBetweenTwoOrbits()
    {
        var systems = ManySystems().ToList();
        Assert.Contains(systems, s => s.Belt is not null);
        Assert.Contains(systems, s => s.Belt is null);
        foreach (var s in systems.Where(s => s.Belt is not null))
        {
            var belt = s.Belt!;
            Assert.InRange(belt.AfterSlot, 1, s.Slots.Count - 1);
            Assert.True(belt.Orbit.Radius > s.Slots[belt.AfterSlot - 1].Orbit.Radius);
            Assert.True(belt.Orbit.Radius < s.Slots[belt.AfterSlot].Orbit.Radius);
        }
    }

    [Fact]
    public void ASlotsOrbitDoesNotDependOnHowManySlotsThereAre()
    {
        var two = SystemGenerator.GenerateCustom("kepler", ["a", "b"], null);
        var five = SystemGenerator.GenerateCustom("kepler", ["a", "b", "c", "d", "e"], null);
        Assert.Equal(Json(two.Slots[0].Orbit), Json(five.Slots[0].Orbit));
        Assert.Equal(Json(two.Slots[1].Orbit), Json(five.Slots[1].Orbit));
        Assert.Equal(Json(two.Central), Json(five.Central));
    }

    [Fact]
    public void ACustomSystemListingAGeneratedSystemsSeedsEqualsIt()
    {
        foreach (var seed in new[] { "Kepler", "Zorvath", "x1", "x2", "x3", "x4", "x5" })
        {
            var generated = SystemGenerator.Generate(seed);
            var custom = SystemGenerator.GenerateCustom(
                seed, generated.Slots.Select(s => s.PlanetSeed).ToList(), generated.Belt?.AfterSlot);
            Assert.Equal(Json(generated with { Slots = [] }), Json(custom with { Slots = [] }));
            Assert.Equal(
                Json(generated.Slots.Select(s => (s.Orbit, s.PlanetSeed))),
                Json(custom.Slots.Select(s => (s.Orbit, s.PlanetSeed))));
        }
    }

    [Fact]
    public void CustomLimitsAreEnforced()
    {
        var nine = Enumerable.Range(1, 9).Select(i => $"p{i}").ToList();
        Assert.Throws<ArgumentException>(() => SystemGenerator.GenerateCustom("kepler", nine, null));
        Assert.Throws<ArgumentException>(() => SystemGenerator.GenerateCustom("kepler", [], null));
        Assert.Throws<ArgumentException>(() => SystemGenerator.GenerateCustom("kepler", ["a", "b"], 2));
        Assert.Throws<ArgumentException>(() => SystemGenerator.GenerateCustom("kepler", ["a"], 1));
        Assert.Throws<ArgumentException>(() => SystemGenerator.GenerateCustom("  ", ["a"], null));
    }

    [Fact]
    public void ReportsItsSpecVersion()
    {
        Assert.Equal(SystemGenerator.CurrentSpecVersion, SystemGenerator.Generate("any").SpecVersion);
    }
}
