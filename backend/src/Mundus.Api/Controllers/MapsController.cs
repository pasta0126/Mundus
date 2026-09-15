using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class MapsController : ControllerBase
{
    /// <summary>Generates a Map deterministically from the given seed and parameters.</summary>
    [HttpGet]
    public ActionResult<Map> Get(
        [FromQuery] string? seed,
        [FromQuery] GridType? gridType,
        [FromQuery] SizePreset? sizePreset)
    {
        if (string.IsNullOrWhiteSpace(seed))
        {
            return BadRequest("seed is required");
        }

        if (gridType is null || sizePreset is null)
        {
            return BadRequest("gridType and sizePreset are both required");
        }

        return Ok(MapGenerator.Generate(seed, gridType.Value, sizePreset.Value));
    }
}
