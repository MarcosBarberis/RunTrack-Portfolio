using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Auth;
using RunTrack.Api.Contracts;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;
using RunTrack.Api.Models;
using System.Net;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/runners")]
    public class RunnersController : ControllerBase
    {
        private readonly RunTrackDbContext _context;

        public RunnersController(RunTrackDbContext context)
        {
            _context = context;
        }

        private static DateTime BuildBirthdayForYear(int year, int month, int day)
        {
            if (month == 2 && day == 29 && !DateTime.IsLeapYear(year))
                return new DateTime(year, 2, 28);

            return new DateTime(year, month, day);
        }

        private static DateTime? CalculateEmacValidUntil(DateTime? birthDate, DateTime? emacDeliveredAt)
        {
            if (birthDate is null || emacDeliveredAt is null)
                return null;

            var delivered = emacDeliveredAt.Value.Date;
            var birth = birthDate.Value.Date;

            var candidate = BuildBirthdayForYear(delivered.Year, birth.Month, birth.Day);

            if (candidate < delivered)
                candidate = BuildBirthdayForYear(delivered.Year + 1, birth.Month, birth.Day);

            return candidate.Date;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            if (!User.IsCoach())
                return Forbid();

            var runners = await _context.Runners
                .Include(r => r.Category)
                .Select(r => new RunTrack.Api.Contracts.RunnerListDto
                {
                    Id = r.Id,
                    FullName = r.FullName,
                    Age = r.Age,
                    Goal = r.Goal,
                    IsActive = r.IsActive,
                    Dni = r.Dni,
                    CategoryId = r.CategoryId,
                    CategoryName = r.Category != null ? r.Category.Name : null,
                    BirthDate = r.BirthDate,
                    CurrentStreak = r.CurrentStreak,
                    BestStreak = r.BestStreak
                })
                .ToListAsync();

            return Ok(runners);
        }

        [HttpGet("top-streaks")]
        public async Task<IActionResult> GetTopStreaks()
        {
            if (!User.IsCoach())
                return Forbid();

            var top = await _context.Runners
                .AsNoTracking()
                .Where(r => r.IsActive)
                .OrderByDescending(r => r.BestStreak)
                .ThenBy(r => r.FullName)
                .Select(r => new RunTrack.Api.Contracts.RunnerTopStreakDto
                {
                    RunnerId = r.Id,
                    FullName = r.FullName,
                    BestStreak = r.BestStreak
                })
                .Take(5)
                .ToListAsync();

            return Ok(top);
        }

        [HttpPost]
        [Authorize(Policy = "CoachOnly")]
        public async Task<IActionResult> Create(RunnerCreateDto dto)
        {
            var categoryExists = await _context.Categories
                .AnyAsync(c => c.Id == dto.CategoryId);

            if (!categoryExists)
                return BadRequest("CategoryId no existe.");

            var dni = (dto.Dni ?? "").Trim();
            if (string.IsNullOrWhiteSpace(dni))
                return BadRequest("DNI es obligatorio");

            dni = new string(dni.Where(char.IsDigit).ToArray());
            if (dni.Length < 7 || dni.Length > 9)
                return BadRequest("DNI inválido");

            var exists = await _context.Runners.AnyAsync(r => r.Dni == dni);
            if (exists)
                return Conflict("Ya existe un runner con ese DNI");

            var runner = new Runner
            {
                FullName = dto.FullName,
                Age = dto.Age,
                Goal = dto.Goal,
                CategoryId = dto.CategoryId,
                Dni = dni,
                IsActive = true
            };

            _context.Runners.Add(runner);
            await _context.SaveChangesAsync();

            return Ok(runner);
        }

        [HttpPatch("{id:int}/status")]
        [Authorize(Policy = "CoachOnly")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] RunnerStatusUpdateDto dto)
        {
            var runner = await _context.Runners.FirstOrDefaultAsync(r => r.Id == id);
            if (runner is null) return NotFound("Runner no existe.");

            runner.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return Ok(new { runner.Id, runner.IsActive });
        }

        [Authorize(Policy = "CoachOnly")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateRunner(int id, RunnerUpdateDto dto)
        {
            var runner = await _context.Runners.FirstOrDefaultAsync(r => r.Id == id);
            if (runner is null) return NotFound("Runner no existe.");

            var dni = (dto.Dni ?? "").Trim();
            if (string.IsNullOrWhiteSpace(dni))
                return BadRequest("DNI es obligatorio");

            dni = new string(dni.Where(char.IsDigit).ToArray());
            if (dni.Length < 7 || dni.Length > 9)
                return BadRequest("DNI inválido");

            var exists = await _context.Runners.AnyAsync(r => r.Dni == dni && r.Id != id);
            if (exists)
                return Conflict("Ya existe un runner con ese DNI");

            runner.FullName = dto.FullName.Trim();
            runner.Age = dto.Age;
            runner.Goal = string.IsNullOrWhiteSpace(dto.Goal) ? null : dto.Goal.Trim();
            runner.CategoryId = dto.CategoryId;
            runner.Dni = dni;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                runner.Id,
                runner.FullName,
                runner.Age,
                runner.Goal,
                runner.IsActive,
                runner.CategoryId,
                runner.Dni
            });
        }

        [HttpDelete("{id:int}")]
        [Authorize(Policy = "CoachOnly")]
        public async Task<IActionResult> DeleteRunner(int id)
        {
            var runner = await _context.Runners.FindAsync(id);
            if (runner is null) return NotFound();

            _context.Runners.Remove(runner);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpGet("me")]
        public async Task<IActionResult> Me()
        {
            if (!User.IsRunner())
                return Forbid();

            var runnerId = User.GetRunnerId();
            if (runnerId is null) return Forbid();

            var r = await _context.Runners
                .Include(x => x.Category)
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == runnerId.Value);

            if (r is null) return NotFound();

            return Ok(new
            {
                r.Id,
                r.FullName,
                r.Age,
                r.Dni,
                r.Goal,
                r.IsActive,
                r.CategoryId,
                r.BirthDate,
                r.CurrentStreak,
                r.BestStreak,
                Category = r.Category is null
                    ? null
                    : new { r.Category.Id, r.Category.Name, r.Category.Description, r.Category.IsActive }
            });
        }

        [HttpGet("by-dni/{dni}")]
        [Authorize(Policy = "RunnerOnly")]
        public async Task<IActionResult> GetByDni(string dni)
        {
            var runner = await _context.Set<Runner>()
                .AsNoTracking()
                .Where(r => r.IsActive && r.Dni == dni)
                .Select(r => new
                {
                    r.Id,
                    r.FullName,
                    r.CategoryId
                })
                .FirstOrDefaultAsync();

            if (runner == null)
                return NotFound();

            return Ok(runner);
        }

        [HttpPatch("{id:int}/payment")]
        [Authorize(Policy = "CoachOnly")]
        public async Task<IActionResult> RegisterPayment(int id, [FromBody] RegisterPaymentDto? body)
        {
            var runner = await _context.Runners.FirstOrDefaultAsync(r => r.Id == id);
            if (runner is null) return NotFound("Runner not found.");

            var paidAt = (body?.PaidAt ?? DateTime.Today).Date;

            var months = body?.Months ?? 1;
            if (months < 1) months = 1;
            if (months > 12) months = 12;
            if (runner.BillingCycleDays <= 0) runner.BillingCycleDays = 30;
            if (runner.GraceDays <= 0) runner.GraceDays = 7;

            runner.LastPaymentDate = paidAt.AddDays(runner.BillingCycleDays * (months - 1));

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("billing")]
        [Authorize(Policy = "CoachOnly")]
        public async Task<ActionResult<List<RunnerBillingDto>>> GetBilling()
        {
            var today = DateTime.Today;

            var runners = await _context.Runners
                .AsNoTracking()
                .Where(r => r.IsActive)
                .OrderBy(r => r.FullName)
                .Select(r => new
                {
                    r.Id,
                    r.FullName,
                    r.Dni,
                    r.LastPaymentDate,
                    r.BillingCycleDays,
                    r.GraceDays
                })
                .ToListAsync();

            var result = runners.Select(r =>
            {
                DateTime? dueDate = null;
                DateTime? hardBlockDate = null;
                FeeStatus status;

                if (r.LastPaymentDate is null)
                {
                    status = FeeStatus.NotPaidYet;
                }
                else
                {
                    dueDate = r.LastPaymentDate.Value.Date.AddDays(r.BillingCycleDays);
                    hardBlockDate = dueDate.Value.AddDays(r.GraceDays);

                    var dueSoonFrom = dueDate.Value.AddDays(-5);
                    if (today < dueDate.Value)
                        status = today >= dueSoonFrom ? FeeStatus.DueSoon : FeeStatus.UpToDate;
                    else
                        status = FeeStatus.Overdue;
                }

                var planVisible = r.LastPaymentDate is not null &&
                                  hardBlockDate is not null &&
                                  today <= hardBlockDate.Value.Date;
                return new RunnerBillingDto
                {
                    Id = r.Id,
                    FullName = r.FullName,
                    Dni = r.Dni,
                    FeeStatus = status,
                    LastPaymentDate = r.LastPaymentDate?.Date,
                    DueDate = dueDate?.Date,
                    HardBlockDate = hardBlockDate?.Date,
                    PlanVisible = planVisible
                };
            }).ToList();

            return Ok(result);
        }

        [HttpPatch("{id:int}/documents")]
        [Authorize(Roles = "Coach")]
        public async Task<IActionResult> UpdateDocuments(int id, [FromBody] UpdateRunnerDocumentsDto dto)
        {
            var runner = await _context.Runners.FirstOrDefaultAsync(r => r.Id == id);
            if (runner is null) return NotFound("Runner not found.");

            if (dto.WaiverDeliveredAt.HasValue && dto.WaiverDeliveredAt.Value.Date > DateTime.Today)
                return BadRequest("La fecha del deslinde no puede ser futura.");

            if (dto.EmacDeliveredAt.HasValue && dto.EmacDeliveredAt.Value.Date > DateTime.Today)
                return BadRequest("La fecha del EMMAC no puede ser futura.");

            runner.WaiverDeliveredAt = dto.WaiverDeliveredAt?.Date;
            runner.EmacDeliveredAt = dto.EmacDeliveredAt?.Date;

            // Nueva regla: vence en el próximo cumpleaños posterior a la entrega
            runner.EmacValidUntil = CalculateEmacValidUntil(runner.BirthDate, runner.EmacDeliveredAt);

            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("documents")]
        [Authorize(Roles = "Coach")]
        public async Task<IActionResult> GetDocuments()
        {
            var list = await _context.Runners
                .AsNoTracking()
                .Where(r => r.IsActive)
                .OrderBy(r => r.FullName)
                .Select(r => new
                {
                    r.Id,
                    r.FullName,
                    r.Dni,
                    r.WaiverDeliveredAt,
                    r.EmacDeliveredAt,
                    r.EmacValidUntil
                })
                .ToListAsync();

            return Ok(list);
        }

        [HttpPatch("me/birthdate")]
        [Authorize(Roles = "Runner")]
        public async Task<IActionResult> UpdateMyBirthDate([FromBody] RunnerBirthDateDto dto)
        {
            var runnerId = User.GetRunnerId();
            if (runnerId is null)
                return Unauthorized("Missing runner_id claim.");

            var runner = await _context.Runners.FirstOrDefaultAsync(r => r.Id == runnerId.Value);
            if (runner is null)
                return NotFound("Runner not found.");

            var date = dto.BirthDate.Date;

            if (date > DateTime.Today)
                return BadRequest("BirthDate cannot be in the future");

            if (date < new DateTime(1900, 1, 1))
                return BadRequest("BirthDate too old");

            if (runner.BirthDate != null)
                return BadRequest("BirthDate already set");

            runner.BirthDate = date;

            // Recalcular EMMAC si ya existía una fecha de entrega cargada
            runner.EmacValidUntil = CalculateEmacValidUntil(runner.BirthDate, runner.EmacDeliveredAt);

            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}