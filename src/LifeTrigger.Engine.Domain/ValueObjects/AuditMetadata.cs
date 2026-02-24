using System;
using System.Collections.Generic;

namespace LifeTrigger.Engine.Domain.ValueObjects;

public record AuditMetadata(
    string EngineVersion,
    string RuleSetVersion,
    IReadOnlyCollection<string> AppliedRules,
    DateTimeOffset Timestamp,
    string ConsentId
);
