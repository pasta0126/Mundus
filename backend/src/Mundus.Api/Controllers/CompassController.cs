using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class CompassController : ControllerBase
{
    /// <summary>
    /// Returns the seed's fixed north bearing. Unlike <see cref="MapsController"/>,
    /// this takes no window/coordinate/step - the bearing is a single value
    /// per seed, independent of what's currently being viewed.
    /// </summary>
    [HttpGet]
    public ActionResult<Compass> Get([FromQuery] string? seed)
    {
        if (string.IsNullOrWhiteSpace(seed))
        {
            return BadRequest("seed is required");
        }

        return Ok(CompassGenerator.Generate(seed));
    }
}
