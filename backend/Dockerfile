FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Mundus.slnx ./
COPY src/Mundus.Api/Mundus.Api.csproj src/Mundus.Api/
COPY src/Mundus.Core/Mundus.Core.csproj src/Mundus.Core/
COPY src/Mundus.Infrastructure/Mundus.Infrastructure.csproj src/Mundus.Infrastructure/
COPY tests/Mundus.Core.Tests/Mundus.Core.Tests.csproj tests/Mundus.Core.Tests/
RUN dotnet restore src/Mundus.Api/Mundus.Api.csproj

COPY . .
RUN dotnet publish src/Mundus.Api/Mundus.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app .

ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
USER $APP_UID
ENTRYPOINT ["dotnet", "Mundus.Api.dll"]
