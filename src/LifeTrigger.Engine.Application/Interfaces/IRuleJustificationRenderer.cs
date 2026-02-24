using LifeTrigger.Engine.Domain.ValueObjects;

namespace LifeTrigger.Engine.Application.Interfaces;

/// <summary>
/// Contrato de Apresentação/Interface.
/// Responsável por converter Dicionários Matemáticos (Argumentos Primitivos) e TemplateIds
/// em texto legível formatado de acordo com a cultura específica (moedas, locale pt-BR vs en-US).
/// Isolado inteiramente do Engine Atuarial.
/// </summary>
public interface IRuleJustificationRenderer
{
    string Render(RuleJustification justification);
}
