using Microsoft.AspNetCore.Mvc;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/health")]
    [Microsoft.AspNetCore.Authorization.AllowAnonymous]
    public class HealthController : ControllerBase
    {
        [HttpGet]
        public IActionResult Get() => Ok(new { status = "ok", service = "RunTrack.Api" });
    }
}
