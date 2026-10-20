using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Auth;
using RunTrack.Api.Data;
using RunTrack.Api.Models;
using System.Security.Claims;

namespace RunTrack.Api.Controllers;

[ApiController]
[Route("api/membership")]
[Authorize(Roles = "Runner")]
public class MembershipController : ControllerBase
{
    private readonly RunTrackDbContext _db;

    // Versión actual de términos (por ahora hardcodeada; después la pasamos a config/DB)
    private const string CurrentTermsVersion = "1";

    public MembershipController(RunTrackDbContext db)
    {
        _db = db;
    }

    [HttpGet("my-status")]
    public async Task<ActionResult<MyMembershipStatusDto>> GetMyStatus()
    {
        var runnerId = User.GetRunnerId();
        if (runnerId is null)
            return Unauthorized("Missing runner_id claim.");


        var runner = await _db.Runners
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == runnerId.Value);

        if (runner is null)
            return NotFound("Runner not found.");

        // Elegimos "hoy" en fecha sin hora en UTC
        var today = DateTime.UtcNow.Date;

        // --- CUOTA ---
        DateTime? dueDate = null;
        DateTime? hardBlockDate = null;

        var cycle = runner.BillingCycleDays <= 0 ? 30 : runner.BillingCycleDays;
        var grace = runner.GraceDays <= 0 ? 7 : runner.GraceDays;

        FeeStatus feeStatus;

        if (runner.LastPaymentDate is null)
        {
            feeStatus = FeeStatus.NotPaidYet;
        }
        else
        {
            dueDate = runner.LastPaymentDate.Value.Date.AddDays(cycle);
            hardBlockDate = dueDate.Value.AddDays(grace);

            var dueSoonFrom = dueDate.Value.AddDays(-5); // día 25
            if (today < dueDate.Value)
                feeStatus = today >= dueSoonFrom ? FeeStatus.DueSoon : FeeStatus.UpToDate;
            else
                feeStatus = FeeStatus.Overdue;
        }

        bool planVisible;

        if (runner.LastPaymentDate is null)
        {
            planVisible = false; // 👈 sin pago, no hay plan
        }
        else
        {
            planVisible = hardBlockDate is null ? true : today <= hardBlockDate.Value.Date;
        }


        // --- DOCUMENTOS ---
        var waiverStatus = runner.WaiverDeliveredAt is null ? DocStatus.Pending : DocStatus.Valid;

        DocStatus emacStatus;
        DateTime? emacValidUntil = runner.EmacValidUntil;

        if (runner.EmacDeliveredAt is null && emacValidUntil is null)
        {
            emacStatus = DocStatus.Pending;
        }
        else
        {
            // Si no está guardado validUntil pero está deliveredAt, lo calculamos 1 año
            if (emacValidUntil is null && runner.EmacDeliveredAt is not null)
                emacValidUntil = runner.EmacDeliveredAt.Value.Date.AddYears(1);

            // Si todavía sigue null, lo tratamos como pendiente
            if (emacValidUntil is null)
            {
                emacStatus = DocStatus.Pending;
            }
            else
            {
                emacStatus = today <= emacValidUntil.Value.Date ? DocStatus.Valid : DocStatus.Expired;
            }
        }

        // --- TÉRMINOS ---
        var termsAccepted = runner.TermsAcceptedAt is not null
                            && string.Equals(runner.TermsVersion, CurrentTermsVersion, StringComparison.Ordinal);

        var dto = new MyMembershipStatusDto
        {
            FeeStatus = feeStatus,
            LastPaymentDate = runner.LastPaymentDate?.Date,
            DueDate = dueDate?.Date,
            HardBlockDate = hardBlockDate?.Date,
            PlanVisible = planVisible,

            WaiverStatus = waiverStatus,

            EmacStatus = emacStatus,
            EmacValidUntil = emacValidUntil?.Date,

            TermsAccepted = termsAccepted,
            TermsVersion = CurrentTermsVersion
        };

        return Ok(dto);
    }
    [HttpPost("accept-terms")]
    public async Task<IActionResult> AcceptTerms()
    {
        var runnerId = User.GetRunnerId();
        if (runnerId is null)
            return Unauthorized("Missing runner_id claim.");

        var runner = await _db.Runners.FirstOrDefaultAsync(r => r.Id == runnerId.Value);
        if (runner is null)
            return NotFound("Runner not found.");

        runner.TermsAcceptedAt = DateTime.UtcNow;
        runner.TermsVersion = CurrentTermsVersion;

        await _db.SaveChangesAsync();
        return NoContent();
    }

}
