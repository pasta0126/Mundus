using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class RegionGeneratorTests
{
    // Verified ahead of time to cross several region seams within one
    // window, so boundary-point assertions below have something real to
    // check rather than an empty list.
    private const string BoundarySeed = "hello";
    private const int BoundaryOriginX = -2000;
    private const int BoundaryOriginY = -2000;
    private const int BoundaryWidth = 512;
    private const int BoundaryHeight = 512;
    private const int BoundaryStep = 4;

    [Fact]
    public void SameSeedAndWindowProduceIdenticalBoundaries()
    {
        var a = RegionGenerator.GenerateBoundaries(BoundarySeed, BoundaryOriginX, BoundaryOriginY, BoundaryWidth, BoundaryHeight, BoundaryStep);
        var b = RegionGenerator.GenerateBoundaries(BoundarySeed, BoundaryOriginX, BoundaryOriginY, BoundaryWidth, BoundaryHeight, BoundaryStep);
        Assert.NotEmpty(a.Points);
        Assert.Equal(a.Points, b.Points);
    }

    [Fact]
    public void DifferentSeedsCanProduceDifferentBoundaries()
    {
        var a = RegionGenerator.GenerateBoundaries(BoundarySeed, BoundaryOriginX, BoundaryOriginY, BoundaryWidth, BoundaryHeight, BoundaryStep);
        var b = RegionGenerator.GenerateBoundaries("goodbye", BoundaryOriginX, BoundaryOriginY, BoundaryWidth, BoundaryHeight, BoundaryStep);
        Assert.NotEqual(a.Points, b.Points);
    }

    [Fact]
    public void OverlappingWindowsAgreeOnSharedBoundaryPoints()
    {
        var full = RegionGenerator.GenerateBoundaries(BoundarySeed, BoundaryOriginX, BoundaryOriginY, BoundaryWidth, BoundaryHeight, BoundaryStep);

        // A quarter of the same world area, requested as its own window -
        // every boundary point in that sub-area must match exactly what
        // the full window found there, since a boundary point is a pure
        // function of (seed, x, y), never of the window it's queried
        // through.
        const int subWidth = BoundaryWidth / 2;
        const int subHeight = BoundaryHeight / 2;
        var sub = RegionGenerator.GenerateBoundaries(BoundarySeed, BoundaryOriginX, BoundaryOriginY, subWidth, subHeight, BoundaryStep);

        var subMaxX = BoundaryOriginX + (subWidth * BoundaryStep);
        var subMaxY = BoundaryOriginY + (subHeight * BoundaryStep);
        var expected = full.Points.Where(p => p.X < subMaxX && p.Y < subMaxY).ToHashSet();

        Assert.NotEmpty(expected);
        Assert.Equal(expected, sub.Points.ToHashSet());
    }

    [Fact]
    public void EveryBoundaryPointFallsWithinTheRequestedWindow()
    {
        var boundaries = RegionGenerator.GenerateBoundaries(BoundarySeed, BoundaryOriginX, BoundaryOriginY, BoundaryWidth, BoundaryHeight, BoundaryStep);
        var maxX = BoundaryOriginX + (BoundaryWidth * BoundaryStep);
        var maxY = BoundaryOriginY + (BoundaryHeight * BoundaryStep);
        Assert.All(boundaries.Points, p =>
        {
            Assert.InRange(p.X, BoundaryOriginX, maxX - 1);
            Assert.InRange(p.Y, BoundaryOriginY, maxY - 1);
        });
    }

    [Theory]
    [InlineData(0, 32)]
    [InlineData(32, 0)]
    [InlineData(MapGenerator.MaxWindowDimension + 1, 32)]
    public void InvalidWindowDimensionsThrow(int width, int height)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => RegionGenerator.GenerateBoundaries("bad-window", 0, 0, width, height));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(MapGenerator.MaxStep + 1)]
    public void InvalidStepThrows(int step)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => RegionGenerator.GenerateBoundaries("bad-step", 0, 0, 4, 4, step));
    }

    [Fact]
    public void RegionIdAtIsDeterministic()
    {
        var a = RegionGenerator.RegionIdAt("region-id-seed", 123, -456);
        var b = RegionGenerator.RegionIdAt("region-id-seed", 123, -456);
        Assert.Equal(a, b);
    }

    [Fact]
    public void PointsFarFromEachOtherCanFallInDifferentRegions()
    {
        var ids = Enumerable.Range(0, 8)
            .Select(i => RegionGenerator.RegionIdAt("region-id-seed", i * 5000, i * -5000))
            .Distinct()
            .ToList();
        Assert.True(ids.Count > 1);
    }
}
