using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Auth;
using RunTrack.Api.Data;

namespace RunTrack.Api.Controllers;

[ApiController]
[Route("api/terms")]
[Authorize(Roles = "Runner")]
public class TermsController : ControllerBase
{
    private readonly RunTrackDbContext _db;
    private const string CurrentTermsVersion = "1";

    public TermsController(RunTrackDbContext db) { _db = db; }

    [HttpPost("accept")]
    public async Task<IActionResult> Accept()
    {
        var runnerId = User.GetRunnerId();
        if (runnerId is null) return Unauthorized("Missing runner_id claim.");

        var runner = await _db.Runners.FirstOrDefaultAsync(r => r.Id == runnerId.Value);
        if (runner is null) return NotFound("Runner not found.");

        runner.TermsAcceptedAt = DateTime.UtcNow;
        runner.TermsVersion = CurrentTermsVersion;

        await _db.SaveChangesAsync();
        return NoContent();
    }
    [HttpPost("accept-terms")]
    public async Task<IActionResult> AcceptTerms()
    {
        var runnerId = User.GetRunnerId();
        if (runnerId is null)
            return Unauthorized();

        var runner = await _db.Runners.FindAsync(runnerId.Value);
        if (runner is null)
            return NotFound();

        runner.TermsAcceptedAt = DateTime.UtcNow;
        runner.TermsVersion = CurrentTermsVersion;

        await _db.SaveChangesAsync();

        return Ok();
    }


}
