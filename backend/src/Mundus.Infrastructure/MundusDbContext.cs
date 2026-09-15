using Microsoft.EntityFrameworkCore;

namespace Mundus.Infrastructure;

/// <summary>
/// EF Core context against the "mundus" tenant database on the shared
/// platform Postgres instance. Connection string comes from configuration
/// (DATABASE_URL-style), never hardcoded - see backend/README.md.
/// </summary>
public sealed class MundusDbContext(DbContextOptions<MundusDbContext> options) : DbContext(options)
{
}
