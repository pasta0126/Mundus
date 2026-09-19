using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class SystemsController : ControllerBase
{
    /// <summary>
    /// Returns the system a seed describes. Passing <c>planets</c> (repeat the
    /// parameter, one planet seed each, up to eight) and optionally <c>belt</c>
    /// (the slot after which the belt sits) makes it a custom system: the
    /// central group and orbits still come from <c>seed</c>. Nothing is stored;
    /// the request is the whole description.
    /// </summary>
    [HttpGet]
    public ActionResult<PlanetarySystem> Get(
        [FromQuery] string? seed,
        [FromQuery] string[]? planets,
        [FromQuery] int? belt)
    {
        if (!SeedNormalizer.TryNormalize(seed, out var normalized) || normalized.Length > SystemGenerator.MaxSeedLength)
        {
            return BadRequest($"seed is required and must be at most {SystemGenerator.MaxSeedLength} characters");
        }

        if (planets is not { Length: > 0 })
        {
            if (belt is not null)
            {
                return BadRequest("belt only applies to a custom system with planets");
            }
            return Ok(SystemGenerator.Generate(seed!));
        }

        if (planets.Length > SystemGenerator.MaxPlanets)
        {
            return BadRequest($"a system has at most {SystemGenerator.MaxPlanets} planets");
        }
        if (planets.Any(p => !SeedNormalizer.TryNormalize(p, out _)))
        {
            return BadRequest($"every planet seed must be 1 to {SeedNormalizer.MaxLength} characters");
        }
        if (belt is not null && (belt < 1 || belt > planets.Length - 1))
        {
            return BadRequest("belt must sit between two planets");
        }

        return Ok(SystemGenerator.GenerateCustom(seed!, planets, belt));
    }
}
