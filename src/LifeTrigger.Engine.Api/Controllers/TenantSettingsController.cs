using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using LifeTrigger.Engine.Application.Interfaces;
using LifeTrigger.Engine.Domain.Entities;

namespace LifeTrigger.Engine.Api.Controllers;

/// <summary>
/// Endpoint Administrativo para configurar os pesos matemáticos do Motor por Corretora (Tenant).
/// </summary>
[ApiController]
[Route("api/v1/admin/tenants/{tenantId}/settings")]
public class TenantSettingsController : ControllerBase
{
    private readonly ITenantSettingsRepository _repository;

    public TenantSettingsController(ITenantSettingsRepository repository)
    {
        _repository = repository;
    }

    /// <summary>
    /// Recupera os pesos matemáticos custodiados para a Corretora (Tenant).
    /// </summary>
    /// <param name="tenantId">UUID do Tenant.</param>
    /// <returns>Objeto de configurações.</returns>
    [HttpGet]
    [ProducesResponseType(typeof(TenantSettings), 200)]
    public async Task<IActionResult> GetSettings(Guid tenantId)
    {
        var settings = await _repository.GetByTenantIdAsync(tenantId);
        
        if (settings == null)
            return Ok(new { Message = "Este tenant utiliza a Matemática Universal Padrão (Sem Overrides)." });
            
        return Ok(settings);
    }

    /// <summary>
    /// Modifica as regras matemáticas do Algoritmo para esta Corretora específica.
    /// </summary>
    /// <param name="tenantId">UUID do Tenant.</param>
    /// <param name="settings">Configurações com os multiplicadores alterados.</param>
    [HttpPut]
    [ProducesResponseType(typeof(TenantSettings), 200)]
    public async Task<IActionResult> UpdateSettings(Guid tenantId, [FromBody] TenantSettings settings)
    {
        if (tenantId != settings.TenantId)
        {
            return BadRequest(new { Message = "O TenantId da Rota não bate com o TenantId do Payload." });
        }

        await _repository.UpsertAsync(settings);

        return Ok(settings);
    }
}
