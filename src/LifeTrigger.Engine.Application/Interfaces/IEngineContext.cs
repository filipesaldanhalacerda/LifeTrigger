using System;

namespace LifeTrigger.Engine.Application.Interfaces;

/// <summary>
/// Provedor determinístico de contexto de execução para o Motor.
/// Essencial para garantir testes (Golden Files), reprodutibilidade e abolição de varíaveis globais baseadas no tempo ou hardware local.
/// </summary>
public interface IEngineContext
{
    /// <summary>
    /// Versão do binário do Motor (Ex: "1.0.0").
    /// </summary>
    string EngineVersion { get; }

    /// <summary>
    /// Versão das Regras de Negócio e Tabela de Atuária (Ex: "2026.02").
    /// </summary>
    string RuleSetVersion { get; }

    /// <summary>
    /// Relógio determinístico ancorado para a avaliação. Substitui o DateTimeOffset.UtcNow proibido no Core.
    /// </summary>
    DateTimeOffset CurrentTime { get; }
}
