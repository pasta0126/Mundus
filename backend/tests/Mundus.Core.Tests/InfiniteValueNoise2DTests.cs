using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class InfiniteValueNoise2DTests
{
    [Theory]
    [InlineData(0, 0)]
    [InlineData(1_000_000, -1_000_000)]
    [InlineData(-5, -5)]
    public void SameSeedAndCoordinateProduceIdenticalValues(int x, int y)
    {
        var a = new InfiniteValueNoise2D("noise-seed", 32);
        var b = new InfiniteValueNoise2D("noise-seed", 32);
        Assert.Equal(a.Sample(x, y), b.Sample(x, y));
    }

    [Fact]
    public void DifferentSeedsProduceDifferentValues()
    {
        var a = new InfiniteValueNoise2D("seed-a", 32);
        var b = new InfiniteValueNoise2D("seed-b", 32);
        Assert.NotEqual(a.Sample(3, 3), b.Sample(3, 3));
    }

    [Fact]
    public void AllValuesAreInZeroToOneRange()
    {
        var noise = new InfiniteValueNoise2D("range-check", 32);
        for (var x = -100; x <= 100; x += 7)
        {
            for (var y = -100; y <= 100; y += 7)
            {
                var value = noise.Sample(x, y);
                Assert.InRange(value, 0.0, 1.0);
            }
        }
    }

    [Fact]
    public void NegativeCoordinatesUseFloorDivisionNotTruncation()
    {
        // With regionScale 32, x = -1 and x = 0 sit in different lattice
        // cells (indices -1 and 0). Truncating division would incorrectly
        // put both in lattice cell 0, making the field discontinuous
        // exactly at 0 rather than smooth across it. Sample a dense strip
        // straddling the boundary and confirm no implausibly large jump
        // between adjacent integer x values (which floor division, unlike
        // truncation, guarantees given smoothstep interpolation).
        var noise = new InfiniteValueNoise2D("floor-division", 32);
        for (var x = -3; x < 3; x++)
        {
            var here = noise.Sample(x, 0);
            var next = noise.Sample(x + 1, 0);
            Assert.True(Math.Abs(here - next) < 0.2, $"unexpectedly large jump between x={x} ({here}) and x={x + 1} ({next})");
        }
    }
}
