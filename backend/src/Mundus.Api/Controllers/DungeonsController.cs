using Microsoft.AspNetCore.Mvc;
using Mundus.Core;

namespace Mundus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class DungeonsController : ControllerBase
{
    /// <summary>Map seeds are free text; this only bounds how much a query may carry.</summary>
    private const int MaxSeedLength = 256;

    /// <summary>
    /// The dungeon under a point of interest: layout, entrance, treasures and
    /// bosses. It is a pure function of the map seed, the point's coordinate and
    /// its type, so it needs nothing stored - and does not check that the point
    /// really holds a dungeon on its map.
    /// </summary>
    [HttpGet]
    public ActionResult<Dungeon> Get([FromQuery] string? seed, [FromQuery] int? x, [FromQuery] int? y, [FromQuery] string? type)
    {
        if (string.IsNullOrWhiteSpace(seed) || seed.Length > MaxSeedLength)
        {
            return BadRequest($"seed is required and must be at most {MaxSeedLength} characters");
        }

        if (x is null || y is null)
        {
            return BadRequest("x and y are required");
        }

        if (string.IsNullOrEmpty(type) || PointOfInterestCatalog.Find(type)?.Dungeon is null)
        {
            return BadRequest($"type must be one that can hold a dungeon: {string.Join(", ", DungeonTypes)}");
        }

        return Ok(DungeonGenerator.Generate(seed, x.Value, y.Value, type));
    }

    /// <summary>What can fill a dungeon - bosses, treasures, layouts - and the icons that can hold one, so the frontend names things from here rather than keeping a second list.</summary>
    [HttpGet("catalog")]
    public ActionResult<DungeonCatalogResponse> GetCatalog() =>
        Ok(new DungeonCatalogResponse
        {
            Styles = DungeonCatalog.Styles,
            Bosses = DungeonCatalog.Bosses,
            Treasures = DungeonCatalog.Treasures,
            Hoard = DungeonCatalog.Hoard,
        });

    private static IEnumerable<string> DungeonTypes =>
        PointOfInterestCatalog.Entries.Where(e => e.Dungeon is not null).Select(e => e.Id);
}

public sealed record DungeonCatalogResponse
{
    public required IReadOnlyList<DungeonStyleEntry> Styles { get; init; }
    public required IReadOnlyList<BossEntry> Bosses { get; init; }
    public required IReadOnlyList<TreasureEntry> Treasures { get; init; }
    public required TreasureEntry Hoard { get; init; }
}
