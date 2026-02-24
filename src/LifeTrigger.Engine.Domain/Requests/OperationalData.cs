using System;

namespace LifeTrigger.Engine.Domain.Requests;

public record OperationalData(
    DateTimeOffset? LastReviewDate,
    string OriginChannel,
    bool HasExplicitActiveConsent,
    string ConsentId,
    Guid? TenantId = null,
    bool HasUnconfirmedData = false,
    bool RecentLifeTrigger = false
);
