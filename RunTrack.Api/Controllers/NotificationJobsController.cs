using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;

namespace RunTrack.Api.Controllers
{
    [Authorize(Policy = "CoachOnly")]
    [ApiController]
    [Route("api/jobs/notifications")]
    public class NotificationJobsController : ControllerBase
    {
        private readonly RunTrackDbContext _context;

        public NotificationJobsController(RunTrackDbContext context)
        {
            _context = context;
        }

        // Genera recordatorios para eventos de una fecha
        [HttpPost("event-reminders")]
        public async Task<IActionResult> GenerateEventReminders([FromQuery] DateOnly? date = null)
        {
            var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

            var events = await _context.TrainingEvents
                .Where(e => e.Date == d)
                .ToListAsync();

            if (events.Count == 0) return Ok(new { created = 0 });

            // Tomamos asistencias Confirmed/Unknown como destinatarios (ajustable)
            var eventIds = events.Select(e => e.Id).ToList();

            var targets = await _context.Attendances
                .Where(a => eventIds.Contains(a.TrainingEventId))
                .Select(a => new { a.TrainingEventId, a.RunnerId, a.Status })
                .ToListAsync();

            int created = 0;

            foreach (var t in targets)
            {
                // Evitar duplicados: no crear si ya existe una notificación similar para ese evento+runner
                var exists = await _context.Notifications.AnyAsync(n =>
                    n.Type == "event_reminder" &&
                    n.TrainingEventId == t.TrainingEventId &&
                    n.RunnerId == t.RunnerId);

                if (exists) continue;

                // Buscar info del evento (en memoria)
                var ev = events.First(e => e.Id == t.TrainingEventId);

                _context.Notifications.Add(new Notification
                {
                    RunnerId = t.RunnerId,
                    Type = "event_reminder",
                    Title = $"Entrenamiento hoy: {ev.Title}",
                    Message = $"{ev.Location ?? "Ubicación a confirmar"} - {ev.Time:HH\\:mm}. {ev.Notes ?? ""}".Trim(),
                    TrainingEventId = ev.Id
                });

                created++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { created });
        }
        [HttpPost("missing-logs")]
        public async Task<IActionResult> GenerateMissingLogNotifications([FromQuery] DateOnly? date = null)
        {
            var d = date ?? DateOnly.FromDateTime(DateTime.UtcNow);

            // 1) Eventos de ese día
            var events = await _context.TrainingEvents
                .Where(e => e.Date == d)
                .ToListAsync();

            if (events.Count == 0) return Ok(new { created = 0 });

            var eventIds = events.Select(e => e.Id).ToList();

            // 2) Asistencias relevantes: Attended o Solo
            var attended = await _context.Attendances
                .Where(a => eventIds.Contains(a.TrainingEventId) &&
                            (a.Status == AttendanceStatus.Attended || a.Status == AttendanceStatus.Solo))
                .Select(a => new { a.TrainingEventId, a.RunnerId, a.Status })
                .ToListAsync();

            if (attended.Count == 0) return Ok(new { created = 0 });

            // 3) Logs existentes de ese día (para esos corredores)
            var runnerIds = attended.Select(x => x.RunnerId).Distinct().ToList();

            var runnersWithLog = await _context.WorkoutLogs
                .Where(w => w.Date == d && runnerIds.Contains(w.RunnerId))
                .Select(w => w.RunnerId)
                .Distinct()
                .ToListAsync();

            var runnersWithLogSet = runnersWithLog.ToHashSet();

            int created = 0;

            foreach (var a in attended)
            {
                // Si ya cargó log, no avisar
                if (runnersWithLogSet.Contains(a.RunnerId))
                    continue;

                // Evitar duplicado: (runner + date) para missing_log
                var alreadyNotified = await _context.Notifications.AnyAsync(n =>
                    n.Type == "missing_log" &&
                    n.RunnerId == a.RunnerId &&
                    n.TrainingEventId == a.TrainingEventId);

                if (alreadyNotified)
                    continue;

                var ev = events.First(e => e.Id == a.TrainingEventId);

                _context.Notifications.Add(new Notification
                {
                    RunnerId = a.RunnerId,
                    Type = "missing_log",
                    Title = "Te falta cargar tu entrenamiento",
                    Message = $"Registrá tu sesión de hoy ({ev.Title}) para que el profe pueda ver tu progreso.",
                    TrainingEventId = ev.Id
                });

                created++;
            }

            await _context.SaveChangesAsync();
            return Ok(new { created });
        }
    }
}
