using Mundus.Core;
using Xunit;

namespace Mundus.Core.Tests;

public class WorleyBoundaryFieldTests
{
    /// <summary>
    /// Regression test: which of the two nearest feature points counts as
    /// "nearest" vs "second nearest" flips right as (x, y) crosses the
    /// seam between them - exactly where a boundary threshold like
    /// RegionGenerator's fires. Sample() must not derive the tangent's
    /// sign from that flip, or SeamCoordinate jumps discontinuously right
    /// where dash-pattern continuity matters most.
    /// </summary>
    [Fact]
    public void SeamCoordinateStaysContinuousAcrossTheProximityPeak()
    {
        const double cellSize = 100;
        const double edgeWidth = 3;
        var field = new WorleyBoundaryField("seam-continuity", cellSize);

        // Scan for a seam crossing (proximity peak) along a horizontal
        // line, then verify SeamCoordinate never jumps by more than a
        // couple of world units between adjacent x's through the peak -
        // the bug produced a jump of ~500+ at the exact crossing.
        for (var y = 0; y < 2000; y += 7)
        {
            var samples = new List<WorleyBoundaryField.EdgeSample>();
            for (var x = 0; x < 2000; x++)
            {
                samples.Add(field.Sample(x, y, edgeWidth));
            }

            var peakIndex = -1;
            var peakProximity = 0.0;
            for (var i = 0; i < samples.Count; i++)
            {
                if (samples[i].Proximity > peakProximity)
                {
                    peakProximity = samples[i].Proximity;
                    peakIndex = i;
                }
            }

            if (peakProximity < 0.9 || peakIndex < 5 || peakIndex > samples.Count - 5)
            {
                continue; // no clean crossing on this scanline - try the next
            }

            for (var i = peakIndex - 3; i < peakIndex + 3; i++)
            {
                var jump = Math.Abs(samples[i + 1].SeamCoordinate - samples[i].SeamCoordinate);
                Assert.True(jump < 10, $"SeamCoordinate jumped by {jump} at x={i} near a proximity peak of {peakProximity}");
            }

            return; // found and checked one crossing - that's enough
        }

        Assert.Fail("No seam crossing found to check - test setup needs a wider scan");
    }
}
