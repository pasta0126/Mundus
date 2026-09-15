using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mundus.Infrastructure;

/// <summary>
/// Design-time-only factory so `dotnet ef migrations add` works without a
/// running app or a real DATABASE_URL. The connection string here is never
/// used to actually connect - only to let EF Core generate SQL for the
/// configured provider.
/// </summary>
public sealed class MundusDbContextFactory : IDesignTimeDbContextFactory<MundusDbContext>
{
    public MundusDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<MundusDbContext>();
        optionsBuilder.UseNpgsql("Host=localhost;Database=mundus;Username=mundus_app;Password=design-time-only");
        return new MundusDbContext(optionsBuilder.Options);
    }
}
