namespace Mundus.Core;

/// <summary>
/// Per-archetype elevation falloff: multiplied into the raw noise field
/// so that, e.g., an Island's outer ring is forced toward zero (ocean)
/// regardless of what the noise says there, while a Continent's edges
/// are merely biased, not forced. See design.md for the rationale behind
/// each formula. <see cref="MapGenerator"/> verifies the resulting map
/// actually satisfies the archetype's guarantee and retries with a
/// derived seed if a rare noise configuration breaks it - these formulas
/// only need to make that common case, not guarantee it outright.
/// </summary>
internal static class ShapeMask
{
    public readonly record struct Config(
        int AttachedEdge,
        bool BridgeHorizontal,
        IReadOnlyList<(double X, double Y, double Radius)> Bumps,
        (double X, double Y, double Radius) Depression);

    public static Config Build(ShapeArchetype archetype, Rng rng, int archipelagoBumpCount)
    {
        switch (archetype)
        {
            case ShapeArchetype.Peninsula:
                return new Config(rng.Int(0, 3), false, [], default);

            case ShapeArchetype.IsthmusLandBridge:
                return new Config(0, rng.Bool(), [], default);

            case ShapeArchetype.Archipelago:
                return new Config(0, false, PlaceBumps(rng, archipelagoBumpCount), default);

            case ShapeArchetype.InlandSea:
            {
                double dx, dy;
                var attempts = 0;
                do
                {
                    dx = rng.Float() - 0.5;
                    dy = rng.Float() - 0.5;
                    attempts++;
                }
                while (Math.Sqrt(dx * dx + dy * dy) > 0.2 && attempts < 50);

                return new Config(0, false, [], (dx, dy, 0.1 + rng.Float() * 0.05));
            }

            default:
                return new Config(0, false, [], default);
        }
    }

    private static IReadOnlyList<(double X, double Y, double Radius)> PlaceBumps(Rng rng, int count)
    {
        var bumps = new List<(double X, double Y, double Radius)>();
        var attempts = 0;
        while (bumps.Count < count && attempts < count * 25)
        {
            attempts++;
            var cx = rng.Float() - 0.5;
            var cy = rng.Float() - 0.5;
            var radius = 0.14 + rng.Float() * 0.06;
            var farEnough = true;
            foreach (var (bx, by, br) in bumps)
            {
                var d = Math.Sqrt(((cx - bx) * (cx - bx)) + ((cy - by) * (cy - by)));
                if (d < radius + br + 0.08)
                {
                    farEnough = false;
                    break;
                }
            }

            if (farEnough)
            {
                bumps.Add((cx, cy, radius));
            }
        }

        return bumps;
    }

    public static double Falloff(ShapeArchetype archetype, Config config, int x, int y, int width, int height)
    {
        var cx = ((double)x / (width - 1)) - 0.5;
        var cy = ((double)y / (height - 1)) - 0.5;

        return archetype switch
        {
            ShapeArchetype.Continent => Radial(cx, cy, maxDist: 0.75, power: 1.4),
            ShapeArchetype.Island => Radial(cx, cy, maxDist: 0.5, power: 2.2),
            ShapeArchetype.Peninsula => PeninsulaFalloff(config.AttachedEdge, cx, cy),
            ShapeArchetype.IsthmusLandBridge => IsthmusFalloff(config.BridgeHorizontal, cx, cy),
            ShapeArchetype.Archipelago => ArchipelagoFalloff(config.Bumps, cx, cy),
            ShapeArchetype.InlandSea => InlandSeaFalloff(config.Depression, cx, cy),
            _ => 1.0, // Unconstrained
        };
    }

    private static double Radial(double cx, double cy, double maxDist, double power)
    {
        var dist = Math.Sqrt((cx * cx) + (cy * cy));
        return Math.Clamp(1 - Math.Pow(dist / maxDist, power), 0, 1);
    }

    private static double PeninsulaFalloff(int attachedEdge, double cx, double cy)
    {
        // Rotate so "attached edge" maps onto the along=0 axis. along: 0 at
        // the attached edge, 1 at the opposite edge. across: 0 at the
        // edge's midpoint, 1 at either of its corners.
        var (along, across) = attachedEdge switch
        {
            0 => (cy + 0.5, cx), // top
            1 => (0.5 - cx, cy), // right
            2 => (0.5 - cy, cx), // bottom
            _ => (cx + 0.5, cy), // left
        };

        var u = Math.Clamp(2 * Math.Abs(across), 0, 1);
        var v = Math.Clamp(along, 0, 1);
        return Math.Clamp(1 - Math.Pow(v, 1.5) - Math.Pow(u, 2), 0, 1);
    }

    private static double IsthmusFalloff(bool bridgeHorizontal, double cx, double cy)
    {
        var cross = bridgeHorizontal ? cy : cx;
        var u = Math.Clamp(2 * Math.Abs(cross), 0, 1);
        var band = Math.Clamp(1 - Math.Pow(u, 2.5), 0, 1);

        var (e1X, e1Y) = bridgeHorizontal ? (-0.5, 0.0) : (0.0, -0.5);
        var (e2X, e2Y) = bridgeHorizontal ? (0.5, 0.0) : (0.0, 0.5);
        var bump1 = Radial(cx - e1X, cy - e1Y, maxDist: 0.45, power: 2);
        var bump2 = Radial(cx - e2X, cy - e2Y, maxDist: 0.45, power: 2);

        return Math.Max(band, Math.Max(bump1, bump2));
    }

    private static double ArchipelagoFalloff(IReadOnlyList<(double X, double Y, double Radius)> bumps, double cx, double cy)
    {
        var max = 0.0;
        foreach (var (bx, by, radius) in bumps)
        {
            var f = Radial(cx - bx, cy - by, maxDist: radius, power: 2);
            if (f > max)
            {
                max = f;
            }
        }

        return max;
    }

    private static double InlandSeaFalloff((double X, double Y, double Radius) depression, double cx, double cy)
    {
        var baseFalloff = Radial(cx, cy, maxDist: 0.8, power: 1.4);
        var depressionStrength = Radial(cx - depression.X, cy - depression.Y, maxDist: depression.Radius, power: 2);
        return Math.Clamp(baseFalloff * (1 - depressionStrength), 0, 1);
    }
}
