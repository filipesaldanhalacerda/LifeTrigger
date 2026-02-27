namespace LifeTrigger.Engine.Domain.Enums;

public enum InsightCategory
{
    /// <summary>How to open the client conversation.</summary>
    ABERTURA,

    /// <summary>The central argument to develop during the meeting.</summary>
    ARGUMENTO_PRINCIPAL,

    /// <summary>Most likely objection and its counter-argument.</summary>
    OBJECAO_PREVISTA,

    /// <summary>Product(s) most appropriate for this profile.</summary>
    PRODUTO_SUGERIDO,

    /// <summary>Concrete next actions the broker should take.</summary>
    PROXIMO_PASSO,
}
