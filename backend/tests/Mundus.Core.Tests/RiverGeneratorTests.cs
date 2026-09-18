using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class RiverGeneratorTests
{
    // Verified ahead of time to produce a river, so path-shape assertions
    // below have something real to check.
    private const string OneRiverSeed = "discard-check-366";

    // A single Peak-band candidate whose downhill trace never reaches
    // water within the documented max length - verifies discarding.
    private const string UnreachableSourceSeed = "discard-check-368";

    // Two sources whose paths converge before either reaches water.
    private const string ConfluenceSeed = "cs2-75";

    private const int AreaMinX = -4000;
    private const int AreaMinY = -4000;
    private const int AreaMaxX = 4000;
    private const int AreaMaxY = 4000;

    [Fact]
    public void SameSeedProducesIdenticalRivers()
    {
        var a = RiverGenerator.TraceRivers(OneRiverSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);
        var b = RiverGenerator.TraceRivers(OneRiverSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);
        Assert.NotEmpty(a);
        Assert.Equal(a, b);
    }

    [Fact]
    public void EveryRiverSourceIsPeakBand()
    {
        var rivers = RiverGenerator.TraceRivers(OneRiverSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);
        Assert.NotEmpty(rivers);
        Assert.All(rivers, river => Assert.Equal("Peak", MapGenerator.ElevationBandAt(OneRiverSeed, river[0].X, river[0].Y)));
    }

    [Fact]
    public void EveryRiverEndsAtOceanOrALake()
    {
        var rivers = RiverGenerator.TraceRivers(OneRiverSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);
        Assert.NotEmpty(rivers);
        Assert.All(rivers, river =>
        {
            var last = river[^1];
            Assert.True(MapGenerator.IsOceanAt(OneRiverSeed, last.X, last.Y) || RiverGenerator.IsLakeAt(OneRiverSeed, last.X, last.Y));
        });
    }

    [Fact]
    public void ElevationNeverIncreasesAlongARiver()
    {
        var rivers = RiverGenerator.TraceRivers(OneRiverSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);
        Assert.NotEmpty(rivers);
        foreach (var river in rivers)
        {
            var previousElevation = MapGenerator.ElevationAt(OneRiverSeed, river[0].X, river[0].Y);
            foreach (var (x, y) in river.Skip(1))
            {
                var elevation = MapGenerator.ElevationAt(OneRiverSeed, x, y);
                Assert.True(elevation <= previousElevation + 1e-9, "a river step increased in elevation");
                previousElevation = elevation;
            }
        }
    }

    [Fact]
    public void ASufficientlyLongRiverIsNotAStraightLine()
    {
        var rivers = RiverGenerator.TraceRivers(OneRiverSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);
        var longRiver = Assert.Single(rivers, r => r.Count >= 15);

        var directionChanges = 0;
        double? previousAngle = null;
        for (var i = 1; i < longRiver.Count; i++)
        {
            var dx = longRiver[i].X - longRiver[i - 1].X;
            var dy = longRiver[i].Y - longRiver[i - 1].Y;
            var angle = Math.Atan2(dy, dx);
            if (previousAngle is { } prev && Math.Abs(NormalizeAngle(angle - prev)) > 0.05)
            {
                directionChanges++;
            }

            previousAngle = angle;
        }

        Assert.True(directionChanges > 1, "a sufficiently long river should change direction more than once");
    }

    [Fact]
    public void UnreachableSourceProducesNoRiver()
    {
        var rivers = RiverGenerator.TraceRivers(UnreachableSourceSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);
        Assert.Empty(rivers);
    }

    [Fact]
    public void TwoRiversMergeIntoOneSharedDownstreamPath()
    {
        var rivers = RiverGenerator.TraceRivers(ConfluenceSeed, AreaMinX, AreaMinY, AreaMaxX, AreaMaxY);

        // Exactly one pair should share a terminus (the merged tributary
        // pair) - a third, unrelated river in the same area is fine.
        var byTerminus = rivers.GroupBy(r => r[^1]).Where(g => g.Count() > 1).ToList();
        var mergedGroup = Assert.Single(byTerminus);
        var a = mergedGroup.First();
        var b = mergedGroup.Last();

        // Downstream of the confluence, both paths share an identical
        // suffix (of whatever length the shorter one's own post-merge
        // continuation has - their prefixes up to the confluence differ,
        // since they started from different sources).
        Assert.Equal(a[^1], b[^1]);
        var commonSuffixLength = 1;
        while (commonSuffixLength < Math.Min(a.Count, b.Count) && a[^(commonSuffixLength + 1)] == b[^(commonSuffixLength + 1)])
        {
            commonSuffixLength++;
        }

        Assert.True(commonSuffixLength > 1, "merged rivers should share more than just their final point");
        Assert.Equal(a.TakeLast(commonSuffixLength), b.TakeLast(commonSuffixLength));

        // The merge itself must not have introduced an uphill jump.
        foreach (var river in new[] { a, b })
        {
            var previousElevation = MapGenerator.ElevationAt(ConfluenceSeed, river[0].X, river[0].Y);
            foreach (var (x, y) in river.Skip(1))
            {
                var elevation = MapGenerator.ElevationAt(ConfluenceSeed, x, y);
                Assert.True(elevation <= previousElevation + 1e-9, "the merged path increased in elevation");
                previousElevation = elevation;
            }
        }
    }

    [Fact]
    public void OverlappingWindowsAgreeOnSharedSegments()
    {
        // Covers OneRiverSeed's known river (source ~(3028,-1093), terminus
        // ~(2995,-1435)) - candidate sources are themselves found on a
        // step-scaled lattice (see SourceCandidates), so this must use
        // the same step=1 the river was found at, not an arbitrary one.
        const int originX = 2900;
        const int originY = -1500;
        const int step = 1;
        var full = RiverGenerator.GenerateRivers(OneRiverSeed, originX, originY, 512, 512, step);
        Assert.NotEmpty(full.Segments);

        const int subWidth = 256;
        const int subHeight = 256;
        var sub = RiverGenerator.GenerateRivers(OneRiverSeed, originX, originY, subWidth, subHeight, step);

        var subMaxX = originX + (subWidth * step);
        var subMaxY = originY + (subHeight * step);
        bool InSub(int x, int y) => x >= originX && x < subMaxX && y >= originY && y < subMaxY;

        var expected = full.Segments.Where(s => InSub(s.X1, s.Y1) || InSub(s.X2, s.Y2)).ToHashSet();
        Assert.NotEmpty(expected);
        Assert.Equal(expected, sub.Segments.ToHashSet());
    }

    [Theory]
    [InlineData(0, 32)]
    [InlineData(32, 0)]
    [InlineData(MapGenerator.MaxWindowDimension + 1, 32)]
    public void InvalidWindowDimensionsThrow(int width, int height)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => RiverGenerator.GenerateRivers("bad-window", 0, 0, width, height));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(MapGenerator.MaxStep + 1)]
    public void InvalidStepThrows(int step)
    {
        Assert.Throws<ArgumentOutOfRangeException>(() => RiverGenerator.GenerateRivers("bad-step", 0, 0, 4, 4, step));
    }

    private static double NormalizeAngle(double angle)
    {
        while (angle > Math.PI) angle -= 2 * Math.PI;
        while (angle < -Math.PI) angle += 2 * Math.PI;
        return angle;
    }
}
