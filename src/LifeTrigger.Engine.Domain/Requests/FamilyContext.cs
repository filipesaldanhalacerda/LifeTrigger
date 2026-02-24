using System.Collections.Generic;

namespace LifeTrigger.Engine.Domain.Requests;

public record FamilyContext(
    int DependentsCount,
    IReadOnlyCollection<int>? DependentsAges
);
