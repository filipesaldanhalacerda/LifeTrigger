FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS base
WORKDIR /app
EXPOSE 8080

FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY src/LifeTrigger.Auth.Domain/LifeTrigger.Auth.Domain.csproj src/LifeTrigger.Auth.Domain/
COPY src/LifeTrigger.Auth.Application/LifeTrigger.Auth.Application.csproj src/LifeTrigger.Auth.Application/
COPY src/LifeTrigger.Auth.Infrastructure/LifeTrigger.Auth.Infrastructure.csproj src/LifeTrigger.Auth.Infrastructure/
COPY src/LifeTrigger.Auth.Api/LifeTrigger.Auth.Api.csproj src/LifeTrigger.Auth.Api/
RUN dotnet restore src/LifeTrigger.Auth.Api/LifeTrigger.Auth.Api.csproj

COPY src/ src/
WORKDIR /src/src/LifeTrigger.Auth.Api
RUN dotnet publish -c Release -o /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "LifeTrigger.Auth.Api.dll"]
