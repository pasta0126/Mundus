using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class WorldsController : ControllerBase
{
    /// <summary>Generates a World deterministically from the given seed.</summary>
    [HttpGet("{seed}")]
    public ActionResult<World> Get(string seed) => Ok(WorldGenerator.Generate(seed));
}
