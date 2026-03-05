FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY src/LifeTrigger.Engine.Domain/LifeTrigger.Engine.Domain.csproj src/LifeTrigger.Engine.Domain/
COPY src/LifeTrigger.Engine.Application/LifeTrigger.Engine.Application.csproj src/LifeTrigger.Engine.Application/
COPY src/LifeTrigger.Engine.Infrastructure/LifeTrigger.Engine.Infrastructure.csproj src/LifeTrigger.Engine.Infrastructure/
COPY src/LifeTrigger.Engine.Api/LifeTrigger.Engine.Api.csproj src/LifeTrigger.Engine.Api/
RUN dotnet restore src/LifeTrigger.Engine.Api/LifeTrigger.Engine.Api.csproj

COPY src/ src/
WORKDIR /src/src/LifeTrigger.Engine.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "LifeTrigger.Engine.Api.dll"]
