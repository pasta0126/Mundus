using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class CompassGeneratorTests
{
    [Fact]
    public void SameSeedYieldsSameBearing()
    {
        var a = CompassGenerator.Generate("north-test");
        var b = CompassGenerator.Generate("north-test");
        Assert.Equal(a.BearingDegrees, b.BearingDegrees);
    }

    [Fact]
    public void DifferentSeedsCanYieldDifferentBearings()
    {
        var bearings = Enumerable.Range(0, 10)
            .Select(i => CompassGenerator.Generate($"north-test-{i}").BearingDegrees)
            .Distinct()
            .ToList();
        Assert.True(bearings.Count > 1);
    }

    [Theory]
    [InlineData("alpha")]
    [InlineData("beta")]
    [InlineData("gamma")]
    public void BearingStaysWithinDocumentedRange(string seed)
    {
        var bearing = CompassGenerator.Generate(seed).BearingDegrees;
        Assert.InRange(bearing, 0.0, 360.0 - double.Epsilon);
    }
}
