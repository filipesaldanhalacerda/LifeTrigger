using System;

namespace LifeTrigger.Engine.Infrastructure.Entities;

public class IdempotencyKey
{
    public string Key { get; set; } = string.Empty;
    public int StatusCode { get; set; }
    public string ResponseBody { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
}
