namespace Mundus.Core;

/// <summary>
/// The data a viewer needs to place an orbiting body at any time: its
/// position is a pure function of these and the elapsed time, so the
/// starting positions are identical for everyone. Radius is in the units of
/// whatever it orbits (planet radii for a moon).
/// </summary>
public sealed record Orbit
{
    public required double Radius { get; init; }

    /// <summary>Seconds of viewer time for one full turn.</summary>
    public required double PeriodSeconds { get; init; }

    /// <summary>Starting angle along the orbit, in degrees [0, 360).</summary>
    public required double PhaseDegrees { get; init; }

    /// <summary>Tilt of the orbit plane from the reference plane, in degrees.</summary>
    public required double InclinationDegrees { get; init; }
}
