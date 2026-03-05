namespace LifeTrigger.Auth.Domain.Enums;

public enum UserRole
{
    /// <summary>Lifetrigger platform administrator. Full access to all tenants.</summary>
    SuperAdmin,

    /// <summary>Owner of a corretora. Purchases the plan, manages subscription and settings.</summary>
    TenantOwner,

    /// <summary>Team manager inside a corretora. Manages brokers and views team metrics.</summary>
    Manager,

    /// <summary>Broker (corretor). Creates evaluations and triggers for their own clients.</summary>
    Broker,

    /// <summary>Read-only observer. Views evaluations and reports without creating anything.</summary>
    Viewer,
}
