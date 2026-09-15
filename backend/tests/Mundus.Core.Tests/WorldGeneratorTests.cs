using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class WorldGeneratorTests
{
    [Fact]
    public void SameSeedProducesIdenticalWorld()
    {
        var a = WorldGenerator.Generate("northern-archive");
        var b = WorldGenerator.Generate("northern-archive");
        Assert.Equal(a, b);
    }

    [Fact]
    public void DifferentSeedsProduceDifferentWorlds()
    {
        var a = WorldGenerator.Generate("seed-a");
        var b = WorldGenerator.Generate("seed-b");
        Assert.NotEqual(a, b);
    }

    [Fact]
    public void GeneratedWorldIsWellFormed()
    {
        var world = WorldGenerator.Generate("well-formed");

        Assert.Equal(WorldGenerator.CurrentSpecVersion, world.SpecVersion);
        Assert.Equal("well-formed", world.Seed);
        Assert.True(Enum.IsDefined(world.Size));
        Assert.True(Enum.IsDefined(world.Biome));
    }
}
