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

    /// <summary>
    /// Hash md5/sha estrito representando a fotografia exata de regras (TenantSettings + Weights) no momento do cálculo.
    /// </summary>
    string RuleSetHash { get; }

    /// <summary>
    /// Snapshot serializado (opcional) usado para Replays e Deep-Audits.
    /// </summary>
    string? ParametersSnapshotJson { get; }

    /// <summary>
    /// Injeta os parâmetros de regras antes do cálculo para compor o Hash Criptográfico final.
    /// </summary>
    void SetParametersSnapshot(string jsonSnapshot, string hash);
}
