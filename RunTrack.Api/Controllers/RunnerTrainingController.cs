using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Auth;
using RunTrack.Api.Contracts;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;
using RunTrack.Api.Services;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/runner-training")]
    public class RunnerTrainingController : ControllerBase
    {
        private readonly RunTrackDbContext _context;
        private readonly IRunnerActionsPolicy _policy;
        private readonly StreakService _streakService;

        public RunnerTrainingController(RunTrackDbContext context, IRunnerActionsPolicy policy, StreakService streakService)
        {
            _context = context;
            _policy = policy;
            _streakService = streakService;
        }

        [HttpPost("{trainingEventId:int}")]
        public async Task<IActionResult> Submit(int trainingEventId, [FromBody] RunnerTrainingSubmissionDto dto)
        {
            if (!User.IsRunner())
                return Unauthorized("Solo runners.");

            var runnerId = User.GetRunnerId();
            if (!runnerId.HasValue)
                return Unauthorized("Runner inválido.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var decision = await _policy.CanUpsertTrainingData(trainingEventId, today);
            if (!decision.Allowed)
                return StatusCode(decision.StatusCode, decision.Message);

            var trainingEvent = await _context.TrainingEvents
                .AsNoTracking()
                .FirstOrDefaultAsync(e => e.Id == trainingEventId);

            if (trainingEvent == null)
                return NotFound("TrainingEvent no existe.");

            var alreadyHasAttendance = await _context.Attendances
                .AnyAsync(a => a.RunnerId == runnerId.Value && a.TrainingEventId == trainingEventId);

            var alreadyHasWorkout = await _context.WorkoutLogs
                .AnyAsync(w => w.RunnerId == runnerId.Value && w.TrainingEventId == trainingEventId);

            if (alreadyHasAttendance || alreadyHasWorkout)
                return Conflict("Ya cargaste este entrenamiento. No se puede modificar.");

            if (!Enum.IsDefined(typeof(AttendanceStatus), dto.Status))
                return BadRequest("Estado de asistencia inválido.");

            var attendanceStatus = (AttendanceStatus)dto.Status;

            if (attendanceStatus == AttendanceStatus.Unknown)
                return BadRequest("Debés seleccionar un estado de asistencia válido.");

            if (attendanceStatus == AttendanceStatus.Confirmed || attendanceStatus == AttendanceStatus.NoShow)
                return BadRequest("Solo podés cargar resultados si el estado es Attended o Solo.");

            if (dto.DistanceKm <= 0)
                return BadRequest("La distancia debe ser mayor a 0.");

            if (dto.DurationMin <= 0)
                return BadRequest("La duración debe ser mayor a 0.");

            if (dto.Rpe < 1 || dto.Rpe > 5)
                return BadRequest("El esfuerzo debe estar entre 1 y 5.");

            var nowUtc = DateTime.UtcNow;

            var attendance = new Attendance
            {
                RunnerId = runnerId.Value,
                TrainingEventId = trainingEventId,
                Status = attendanceStatus,
                SubmittedAtUtc = nowUtc,
                UpdatedAtUtc = null,
                EditCount = 0
            };

            var workout = new WorkoutLog
            {
                RunnerId = runnerId.Value,
                TrainingEventId = trainingEventId,
                Date = trainingEvent.Date,
                DistanceKm = dto.DistanceKm,
                DurationMin = dto.DurationMin,
                Rpe = dto.Rpe,
                HadPain = dto.HadPain,
                Notes = dto.Notes,
                SubmittedAtUtc = nowUtc,
                UpdatedAtUtc = null,
                EditCount = 0
            };

            _context.Attendances.Add(attendance);
            _context.WorkoutLogs.Add(workout);

            await _context.SaveChangesAsync();

            await _streakService.RecalculateRunnerStreakAsync(runnerId.Value);

            return Ok(new
            {
                message = "Entrenamiento registrado correctamente."
            });
        }
    }
}