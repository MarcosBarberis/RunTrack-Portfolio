using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using RunTrack.Api.Auth;
using RunTrack.Api.Data;
using RunTrack.Api.Services;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/auth")]
    [AllowAnonymous]
    [EnableRateLimiting(AuthRateLimit.PolicyName)]
    public class AuthController : ControllerBase
    {
        private readonly CoachAuthOptions _coach;
        private readonly JwtService _jwt;
        private readonly RunTrackDbContext _db;

        public AuthController(IOptions<CoachAuthOptions> coach, JwtService jwt, RunTrackDbContext db)
        {
            _coach = coach.Value;
            _jwt = jwt;
            _db = db;
        }

        public record CoachLoginRequest(string Username, string Password);
        public record RunnerLoginRequest(string Dni);
        public record LoginResponse(string Token, string Role);

        /// <summary>Login del coach con usuario y contraseña (hash BCrypt en configuración).</summary>
        [HttpPost("coach-login")]
        public ActionResult<LoginResponse> CoachLogin([FromBody] CoachLoginRequest req)
        {
            const string invalid = "Usuario o contraseña incorrectos.";

            if (string.IsNullOrWhiteSpace(_coach.Username) || string.IsNullOrWhiteSpace(_coach.PasswordHash))
                return Problem("El acceso del coach no está configurado.", statusCode: StatusCodes.Status503ServiceUnavailable);

            var user = (req.Username ?? "").Trim();
            var pass = req.Password ?? "";

            if (!string.Equals(user, _coach.Username, StringComparison.Ordinal))
                return Unauthorized(invalid);

            if (!BCrypt.Net.BCrypt.Verify(pass, _coach.PasswordHash))
                return Unauthorized(invalid);

            return Ok(new LoginResponse(_jwt.GenerateCoachToken(user), "Coach"));
        }

        /// <summary>Login del runner por DNI. El token queda atado al id del runner.</summary>
        [HttpPost("runner-login")]
        public async Task<ActionResult<LoginResponse>> RunnerLogin([FromBody] RunnerLoginRequest req)
        {
            var dni = new string((req.Dni ?? "").Where(char.IsDigit).ToArray());
            if (dni.Length is < 7 or > 9)
                return BadRequest("DNI inválido.");

            var runner = await _db.Runners
                .AsNoTracking()
                .Where(r => r.Dni == dni)
                .Select(r => new { r.Id, r.IsActive })
                .FirstOrDefaultAsync();

            if (runner is null)
                return Unauthorized("No encontramos un runner con ese DNI.");

            if (!runner.IsActive)
                return StatusCode(StatusCodes.Status403Forbidden,
                    "Runner fuera de actividad, contactarse con su profesor para más info.");

            return Ok(new LoginResponse(_jwt.GenerateRunnerToken(runner.Id), "Runner"));
        }
    }
}
