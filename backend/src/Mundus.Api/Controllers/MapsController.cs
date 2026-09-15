using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class MapsController : ControllerBase
{
    /// <summary>
    /// Generates a window of terrain deterministically from the given seed.
    /// Each cell's biome depends only on the seed and its own (x, y) -
    /// never on this window's origin or size - so panning into unexplored
    /// territory never changes previously-seen terrain.
    /// </summary>
    [HttpGet]
    public ActionResult<Map> Get(
        [FromQuery] string? seed,
        [FromQuery] int? x,
        [FromQuery] int? y,
        [FromQuery] int? width,
        [FromQuery] int? height,
        [FromQuery] int? step)
    {
        if (string.IsNullOrWhiteSpace(seed))
        {
            return BadRequest("seed is required");
        }

        if (x is null || y is null || width is null || height is null)
        {
            return BadRequest("x, y, width, and height are all required");
        }

        if (width < 1 || width > MapGenerator.MaxWindowDimension)
        {
            return BadRequest($"width must be between 1 and {MapGenerator.MaxWindowDimension}");
        }

        if (height < 1 || height > MapGenerator.MaxWindowDimension)
        {
            return BadRequest($"height must be between 1 and {MapGenerator.MaxWindowDimension}");
        }

        var effectiveStep = step ?? 1;
        if (effectiveStep < 1 || effectiveStep > MapGenerator.MaxStep)
        {
            return BadRequest($"step must be between 1 and {MapGenerator.MaxStep}");
        }

        return Ok(MapGenerator.Generate(seed, x.Value, y.Value, width.Value, height.Value, effectiveStep));
    }
}
