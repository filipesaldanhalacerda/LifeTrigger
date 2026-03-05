using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LifeTrigger.Engine.Api.Controllers;

[ApiController]
[Route("api/v1/[controller]")]
[Authorize]
public class EngineController : ControllerBase
{
    [HttpGet("versions")]
    [ProducesResponseType(200)]
    public IActionResult GetVersions()
    {
        return Ok(new
        {
            EngineVersion = "1.0.0",
            RuleSetVersion = "2026.02",
            Description = "LifeTrigger Calculadora Determinística de Necessidade de Proteção"
        });
    }
}
