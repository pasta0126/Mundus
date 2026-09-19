using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class PointsOfInterestController : ControllerBase
{
    /// <summary>
    /// The whole icon catalog - layers, every icon with its class, rarity,
    /// biomes and placement, and what each settlement size contains. The
    /// frontend derives its legend and layer toggles from this rather than
    /// keeping a second list.
    /// </summary>
    [HttpGet("catalog")]
    public ActionResult<PointOfInterestCatalogResponse> GetCatalog() =>
        Ok(new PointOfInterestCatalogResponse
        {
            Categories = PointOfInterestCatalog.Categories,
            Entries = PointOfInterestCatalog.Entries,
            Settlements = PointOfInterestCatalog.SettlementSpecs,
        });

    /// <summary>
    /// Returns the points of interest touching a window, mirroring
    /// <see cref="MapsController"/>'s seed/window/step contract, with an
    /// optional category filter (see <see cref="PointOfInterestGenerator.Categories"/>).
    /// </summary>
    [HttpGet]
    public ActionResult<PointsOfInterest> Get(
        [FromQuery] string? seed,
        [FromQuery] int? x,
        [FromQuery] int? y,
        [FromQuery] int? width,
        [FromQuery] int? height,
        [FromQuery] int? step,
        [FromQuery] string? category)
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

        if (!string.IsNullOrEmpty(category) && !PointOfInterestGenerator.Categories.Contains(category))
        {
            return BadRequest($"category must be one of: {string.Join(", ", PointOfInterestGenerator.Categories)}");
        }

        return Ok(PointOfInterestGenerator.Generate(seed, x.Value, y.Value, width.Value, height.Value, effectiveStep, string.IsNullOrEmpty(category) ? null : category));
    }
}

public sealed record PointOfInterestCatalogResponse
{
    public required IReadOnlyList<PoiCategory> Categories { get; init; }
    public required IReadOnlyList<PoiEntry> Entries { get; init; }
    public required IReadOnlyList<SettlementSpec> Settlements { get; init; }
}
