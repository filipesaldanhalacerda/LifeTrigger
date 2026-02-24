using System.Collections.Generic;
using LifeTrigger.Engine.Domain.Constants;

namespace LifeTrigger.Engine.Application.Interfaces;

/// <summary>
/// Desacopla as mensagens fixadas no Core para fornecer textos de auditoria de forma limpa, permitindo I18N futuro.
/// </summary>
public interface IRuleJustificationProvider
{
    string GetJustification(string ruleConstant, params object[] formatArgs);
}
