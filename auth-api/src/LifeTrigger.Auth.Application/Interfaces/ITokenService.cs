using LifeTrigger.Auth.Domain.Entities;

namespace LifeTrigger.Auth.Application.Interfaces;

public interface ITokenService
{
    string GenerateAccessToken(User user);
    (string RawToken, string Hash) GenerateRefreshToken();
}
