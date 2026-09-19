using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class PlanetsController : ControllerBase
{
    /// <summary>
    /// Returns the planet a seed describes. The description depends only on
    /// the normalized seed, so it is the same planet whether asked for here
    /// or as a slot of a system.
    /// </summary>
    [HttpGet]
    public ActionResult<Planet> Get([FromQuery] string? seed)
    {
        if (!SeedNormalizer.TryNormalize(seed, out _))
        {
            return BadRequest($"seed is required and must be at most {SeedNormalizer.MaxLength} characters");
        }

        return Ok(PlanetGenerator.Generate(seed!));
    }
}
