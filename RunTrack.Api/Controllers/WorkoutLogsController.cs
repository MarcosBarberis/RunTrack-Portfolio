using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Auth;
using RunTrack.Api.Contracts;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;
using RunTrack.Api.Services;

namespace RunTrack.Api.Controllers
{
    [Authorize(Policy = "RunnerOnly")]
    [ApiController]
    [Route("api/workout-logs")]
    public class WorkoutLogsController : ControllerBase
    {
        private readonly RunTrackDbContext _context;
        private readonly IRunnerActionsPolicy _policy;
        private readonly StreakService _streakService;
        private readonly ILogger<WorkoutLogsController> _logger;

        public WorkoutLogsController(RunTrackDbContext context, IRunnerActionsPolicy policy, StreakService streakService, ILogger<WorkoutLogsController> logger)
        {
            _context = context;
            _policy = policy;
            _streakService = streakService;
            _logger = logger;
        }

        // Listado con filtros opcionales
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? runnerId = null,
            [FromQuery] DateOnly? dateFrom = null,
            [FromQuery] DateOnly? dateTo = null)
        {
            if (!(User.IsCoach() || User.IsRunner()))
                return Forbid();

            var query = _context.WorkoutLogs
                .Include(w => w.Runner)
                .Include(w => w.PlannedWorkout)
                .AsQueryable();

            if (User.IsRunner())
            {
                var runnerIdFromKey = User.GetRunnerId();
                if (runnerIdFromKey is null) return Forbid();

                query = query.Where(w => w.RunnerId == runnerIdFromKey.Value);
            }
            else if (User.IsCoach())
            {
                if (runnerId is not null)
                    query = query.Where(w => w.RunnerId == runnerId);
            }

            if (dateFrom is not null)
                query = query.Where(w => w.Date >= dateFrom);

            if (dateTo is not null)
                query = query.Where(w => w.Date <= dateTo);

            var items = await query
                .OrderByDescending(w => w.Date)
                .ThenByDescending(w => w.Id)
                .ToListAsync();

            var result = items.Select(w =>
            {
                var pace = w.DistanceKm <= 0 ? 0 : (decimal)w.DurationMin / w.DistanceKm;

                return new WorkoutLogResponseDto
                {
                    Id = w.Id,
                    Date = w.Date,
                    RunnerId = w.RunnerId,
                    RunnerName = w.Runner.FullName,
                    PlannedWorkoutId = w.PlannedWorkoutId,
                    PlannedType = w.PlannedWorkout?.Type,
                    DistanceKm = w.DistanceKm,
                    DurationMin = w.DurationMin,
                    PaceMinPerKm = Math.Round(pace, 2),
                    Rpe = w.Rpe,
                    HadPain = w.HadPain,
                    Notes = w.Notes,
                    IsSelfRegistered = w.IsSelfRegistered,
                    SelfRegisteredTitle = w.SelfRegisteredTitle
                };
            });

            return Ok(result);
        }

        [Authorize(Policy = "RunnerOnly")]
        [HttpPost]
        public async Task<IActionResult> Create(WorkoutLogCreateDto dto)
        {
            var runnerIdFromKey = User.GetRunnerId();
            if (runnerIdFromKey is null)
                return Forbid(); // Runner policy debería traer runner_id

            // Fuerza el RunnerId del dto (evita spoofing)
            dto.RunnerId = runnerIdFromKey.Value;

            var validationError = ValidateWorkoutLog(dto.DistanceKm, dto.DurationMin, dto.Rpe, dto.Notes);
            if (validationError is not null)
                return BadRequest(validationError);

            var runnerExists = await _context.Runners.AnyAsync(r => r.Id == dto.RunnerId);
            if (!runnerExists) return BadRequest("RunnerId no existe.");

            if (dto.PlannedWorkoutId is not null)
            {
                var planExists = await _context.PlannedWorkouts.AnyAsync(p => p.Id == dto.PlannedWorkoutId);
                if (!planExists) return BadRequest("PlannedWorkoutId no existe.");
            }

            var entity = new WorkoutLog
            {
                Date = dto.Date,
                RunnerId = dto.RunnerId,
                PlannedWorkoutId = dto.PlannedWorkoutId,
                DistanceKm = dto.DistanceKm,
                DurationMin = dto.DurationMin,
                Rpe = dto.Rpe,
                HadPain = dto.HadPain,
                Notes = dto.Notes
            };

            _context.WorkoutLogs.Add(entity);

            // Cerrar notificaciones "missing_log" del runner para ese día
            var missingNotifs = await _context.Notifications
                .Where(n =>
                    n.RunnerId == dto.RunnerId &&
                    n.Type == "missing_log" &&
                    !n.IsRead)
                .ToListAsync();

            if (missingNotifs.Count > 0)
            {
                // Cerrar las que correspondan al mismo día del log:
                // - Si la notificación tiene TrainingEventId, comprobamos si ese evento es del mismo día.
                // - Si no tiene TrainingEventId, la cerramos igual (fallback).
                var eventIdsSameDay = await _context.TrainingEvents
                    .Where(e => e.Date == dto.Date)
                    .Select(e => e.Id)
                    .ToListAsync();

                var eventIdsSet = eventIdsSameDay.ToHashSet();

                foreach (var n in missingNotifs)
                {
                    bool sameDayMatch = n.TrainingEventId is null || eventIdsSet.Contains(n.TrainingEventId.Value);
                    if (!sameDayMatch) continue;

                    n.IsRead = true;
                    n.ReadAtUtc = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, new { entity.Id });
        }

        [HttpPost("self")]
        public async Task<IActionResult> CreateSelf(SelfWorkoutCreateDto dto)
        {
            if (!TryGetRunnerId(out var runnerId))
                return Forbid();

            var title = dto.Title?.Trim();
            if (string.IsNullOrWhiteSpace(title))
                return BadRequest("Title es requerido.");

            if (title.Length > 100)
                return BadRequest("Title no puede superar los 100 caracteres.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            if (dto.Date > today)
                return BadRequest("No puede crear entrenamiento para una fecha futura.");

            var notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
            var validationError = ValidateWorkoutLog(dto.DistanceKm, dto.DurationMin, dto.Rpe, notes);
            if (validationError is not null)
                return BadRequest(validationError);

            var runnerExists = await _context.Runners.AnyAsync(r => r.Id == runnerId);
            if (!runnerExists)
                return BadRequest("RunnerId no existe.");

            var entity = new WorkoutLog
            {
                Date = dto.Date,
                RunnerId = runnerId,
                PlannedWorkoutId = null,
                TrainingEventId = null,
                DistanceKm = dto.DistanceKm,
                DurationMin = dto.DurationMin,
                Rpe = dto.Rpe,
                HadPain = dto.HadPain,
                Notes = notes,
                IsSelfRegistered = true,
                SelfRegisteredTitle = title,
                SubmittedAtUtc = DateTime.UtcNow
            };

            _context.WorkoutLogs.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, new { entity.Id });
        }

        [HttpDelete("self/{id:int}")]
        public async Task<IActionResult> DeleteSelf(int id)
        {
            if (!TryGetRunnerId(out var runnerId))
                return Forbid();

            var log = await _context.WorkoutLogs.FirstOrDefaultAsync(w => w.Id == id);
            if (log == null || !log.IsSelfRegistered)
                return NotFound();

            if (log.RunnerId != runnerId)
                return Forbid();

            _context.WorkoutLogs.Remove(log);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        public record WorkoutLogMyUpsertDto(
            decimal DistanceKm,
            int DurationMin,
            int Rpe,
            bool HadPain,
            string? Notes
        );

        private bool TryGetRunnerId(out int runnerId)
        {
            runnerId = 0;
            var rid = User.FindFirst("runner_id")?.Value;
            return int.TryParse(rid, out runnerId);
        }
        private string? ValidateWorkoutLog(decimal distanceKm, int durationMin, int rpe, string? notes)
        {
            if (distanceKm < 0.5m || distanceKm > 60m)
                return "La distancia debe estar entre 0.5 y 60 km.";

            if (durationMin < 5 || durationMin > 480)
                return "La duración debe estar entre 5 y 480 minutos.";

            if (rpe < 1 || rpe > 5)
                return "El RPE debe estar entre 1 y 5.";

            var pace = durationMin / distanceKm;

            if (pace < 2.5m || pace > 20m)
                return "Los valores de distancia y duración no parecen realistas.";

            if (!string.IsNullOrWhiteSpace(notes) && notes.Trim().Length > 500)
                return "Las notas no pueden superar los 500 caracteres.";

            return null;
        }

        [Authorize(Policy = "RunnerOnly")]
        [HttpGet("my/{trainingEventId:int}")]
        public async Task<IActionResult> GetMy(int trainingEventId)
        {
            if (!TryGetRunnerId(out var runnerId)) return Forbid();

            var log = await _context.WorkoutLogs
                .AsNoTracking()
                .FirstOrDefaultAsync(w => w.RunnerId == runnerId && w.TrainingEventId == trainingEventId);

            if (log == null)
                return Ok(null); // No existe workout log para este evento

            return Ok(new
            {
                distanceKm = log.DistanceKm,
                durationMin = log.DurationMin,
                rpe = log.Rpe,
                hadPain = log.HadPain,
                notes = log.Notes,
                exists = true
            });
        }

        [Authorize(Policy = "RunnerOnly")]
        [HttpPut("my/{trainingEventId:int}")]
        public async Task<IActionResult> UpsertMy(int trainingEventId, [FromBody] WorkoutLogMyUpsertDto dto)
        {
            if (!TryGetRunnerId(out var runnerId)) return Forbid();

            // ✅ REGLA #1 (centralizada)
            var today = DateOnly.FromDateTime(DateTime.Today);
            var decision = await _policy.CanUpsertTrainingData(trainingEventId, today);
            if (!decision.Allowed)
                return StatusCode(decision.StatusCode, decision.Message);

            var validationError = ValidateWorkoutLog(dto.DistanceKm, dto.DurationMin, dto.Rpe, dto.Notes);
            if (validationError is not null)
                return BadRequest(validationError);

            var ev = await _context.TrainingEvents
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == trainingEventId);

            if (ev == null) return NotFound("TrainingEvent no existe.");

            // Buscar existente por runner+evento
            var log = await _context.WorkoutLogs
                .FirstOrDefaultAsync(w => w.RunnerId == runnerId && w.TrainingEventId == trainingEventId);

            if (log == null)
            {
                log = new WorkoutLog
                {
                    RunnerId = runnerId,
                    TrainingEventId = trainingEventId,
                    Date = ev.Date, // importante: queda atado al día del evento
                    SubmittedAtUtc = DateTime.UtcNow
                };
                _context.WorkoutLogs.Add(log);
            }

            log.DistanceKm = dto.DistanceKm;
            log.DurationMin = dto.DurationMin;
            log.Rpe = dto.Rpe;
            log.HadPain = dto.HadPain;
            log.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();

            _logger.LogInformation($"[WORKOUT_LOG] Guardando WorkoutLog: RunnerId={runnerId}, TrainingEventId={trainingEventId}, IsSelfRegistered={log.IsSelfRegistered}, TrainingEventId!=null={log.TrainingEventId != null}");

            await _context.SaveChangesAsync();
            
            _logger.LogInformation($"[WORKOUT_LOG] WorkoutLog guardado. ID={log.Id}. Invocando StreakService...");
            
            await _streakService.RecalculateRunnerStreakAsync(runnerId);
            
            _logger.LogInformation($"[WORKOUT_LOG] StreakService completado para runner {runnerId}");

            return Ok(new { ok = true, id = log.Id });
        }


    }
}