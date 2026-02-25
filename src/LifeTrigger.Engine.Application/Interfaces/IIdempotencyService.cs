using System;
using System.Threading.Tasks;

namespace LifeTrigger.Engine.Application.Interfaces;

public interface IIdempotencyService
{
    Task<(bool Found, int StatusCode, string Body)> GetAsync(string key);
    Task StoreAsync(string key, int statusCode, string body, TimeSpan ttl);
}
