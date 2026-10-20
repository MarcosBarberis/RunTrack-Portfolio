using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Contracts;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;
using RunTrack.Api.Auth;
using RunTrack.Api.Services;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/attendance")]
    public class AttendanceController : ControllerBase
    {
        private readonly RunTrackDbContext _context;
        private readonly IRunnerActionsPolicy _policy;
        private readonly StreakService _streakService;

        public AttendanceController(
        RunTrackDbContext context,
        IRunnerActionsPolicy policy,
        StreakService streakService)
    {
        _context = context;
        _policy = policy;
        _streakService = streakService;
    }

        [HttpGet("by-event/{trainingEventId:int}")]
        public async Task<IActionResult> GetByEvent(int trainingEventId)
        {
            if (!(User.IsCoach() || User.IsRunner()))
                return Forbid();

            var exists = await _context.TrainingEvents.AnyAsync(e => e.Id == trainingEventId);
            if (!exists) return NotFound("TrainingEventId no existe.");

            var query = _context.Attendances
                .Where(a => a.TrainingEventId == trainingEventId)
                .Include(a => a.Runner)
                .AsNoTracking();

            if (User.IsRunner())
            {
                var runnerIdFromKey = User.GetRunnerId();
                if (runnerIdFromKey is null) return Forbid();

                query = query.Where(a => a.RunnerId == runnerIdFromKey.Value);
            }

            var items = await query
                .OrderBy(a => a.Runner.FullName)
                .ToListAsync();

            var result = items.Select(a => new AttendanceResponseDto
            {
                Id = a.Id,
                TrainingEventId = a.TrainingEventId,
                RunnerId = a.RunnerId,
                RunnerName = a.Runner.FullName,
                Status = (int)a.Status,
                StatusText = a.Status.ToString(),
            });

            return Ok(result);
        }

        // Upsert (Coach): si existe (TrainingEventId+RunnerId) actualiza, si no crea
        [HttpPost]
        public async Task<IActionResult> Upsert(AttendanceUpsertDto dto)
        {
            if (!User.IsCoach())
                return Forbid();

            if (!await _context.TrainingEvents.AnyAsync(e => e.Id == dto.TrainingEventId))
                return BadRequest("TrainingEventId no existe.");

            if (!await _context.Runners.AnyAsync(r => r.Id == dto.RunnerId))
                return BadRequest("RunnerId no existe.");

            if (dto.Status < 0 || dto.Status > 4)
                return BadRequest("Status inválido. 0..4");

            var status = (AttendanceStatus)dto.Status;

            var entity = await _context.Attendances
                .FirstOrDefaultAsync(a => a.TrainingEventId == dto.TrainingEventId && a.RunnerId == dto.RunnerId);

            if (entity is null)
            {
                entity = new Attendance
                {
                    TrainingEventId = dto.TrainingEventId,
                    RunnerId = dto.RunnerId,
                    Status = status,
                };
                _context.Attendances.Add(entity);
            }
            else
            {
                entity.Status = status;
            }

            await _context.SaveChangesAsync();
            return Ok(new { entity.Id });
        }

        [HttpGet("my/{trainingEventId:int}")]
        public async Task<IActionResult> GetMy(int trainingEventId)
        {
            if (!User.IsRunner())
                return Forbid();

            var runnerId = User.GetRunnerId();
            if (runnerId is null) return Forbid();

            var att = await _context.Attendances
                .AsNoTracking()
                .FirstOrDefaultAsync(a => a.TrainingEventId == trainingEventId && a.RunnerId == runnerId.Value);

            if (att is null)
                return Ok(new { exists = false });

            return Ok(new
            {
                exists = true,
                att.Id,
                att.TrainingEventId,
                att.RunnerId,
                status = (int)att.Status,
                statusText = att.Status.ToString(),
            });
        }

        [HttpPut("my/{trainingEventId:int}")]
        public async Task<IActionResult> UpsertMy(int trainingEventId, [FromBody] AttendanceMyUpsertDto dto)
        {
            if (!User.IsRunner())
                return Forbid();

            var runnerId = User.GetRunnerId();
            if (runnerId is null) return Forbid();

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var decision = await _policy.CanUpsertTrainingData(trainingEventId, today);
            if (!decision.Allowed)
                return StatusCode(decision.StatusCode, decision.Message);

            if (dto.Status < 0 || dto.Status > 4)
                return BadRequest("Status inválido. 0..4");

            var status = (AttendanceStatus)dto.Status;

            var entity = await _context.Attendances
                .FirstOrDefaultAsync(a => a.TrainingEventId == trainingEventId && a.RunnerId == runnerId.Value);

            if (entity == null)
            {
                entity = new Attendance
                {
                    TrainingEventId = trainingEventId,
                    RunnerId = runnerId.Value,
                    Status = status,
                    SubmittedAtUtc = DateTime.UtcNow,
                    EditCount = 0
                };

                _context.Attendances.Add(entity);
            }
            else
            {
                // 🔒 SOLO UNA EDICIÓN PERMITIDA
                if (entity.EditCount >= 1)
                    return Conflict("Ya editaste tu asistencia una vez. No podés modificarla nuevamente.");

                entity.EditCount += 1;
                entity.UpdatedAtUtc = DateTime.UtcNow;

                entity.Status = status;
            }

            await _context.SaveChangesAsync();
            await _streakService.UpdateRunnerStreakAsync(runnerId.Value);

            return Ok(new
            {
                entity.Id,
                entity.TrainingEventId,
                entity.RunnerId,
                Status = (int)entity.Status,
                editCount = entity.EditCount
            });
        }
    }
}