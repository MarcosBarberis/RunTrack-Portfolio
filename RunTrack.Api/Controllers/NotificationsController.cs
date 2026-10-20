using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Contracts;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;
using RunTrack.Api.Auth;


namespace RunTrack.Api.Controllers
{
    [Authorize(Policy = "RunnerOnly")]
    [ApiController]
    [Route("api/notifications")]
    public class NotificationsController : ControllerBase
    {
        private readonly RunTrackDbContext _context;

        public NotificationsController(RunTrackDbContext context)
        {
            _context = context;
        }

        // Pendientes o todas
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? runnerId = null, [FromQuery] bool unreadOnly = true)
        {
            if (!(User.IsCoach() || User.IsRunner()))
                return Forbid();

            var q = _context.Notifications
                .Include(n => n.Runner)
                .AsQueryable();

            if (User.IsRunner())
            {
                var runnerIdFromKey = User.GetRunnerId();
                if (runnerIdFromKey is null) return Forbid();

                q = q.Where(n => n.RunnerId == runnerIdFromKey.Value);
            }
            else if (User.IsCoach())
            {
                if (runnerId is not null)
                    q = q.Where(n => n.RunnerId == runnerId);
            }


            if (unreadOnly)
                q = q.Where(n => !n.IsRead);

            var items = await q
                .OrderByDescending(n => n.CreatedAtUtc)
                .Take(200)
                .ToListAsync();

            var result = items.Select(n => new NotificationResponseDto
            {
                Id = n.Id,
                CreatedAtUtc = n.CreatedAtUtc,
                RunnerId = n.RunnerId,
                RunnerName = n.Runner?.FullName,
                Type = n.Type,
                Title = n.Title,
                Message = n.Message,
                IsRead = n.IsRead,
                ReadAtUtc = n.ReadAtUtc,
                TrainingEventId = n.TrainingEventId,
                PlannedWorkoutId = n.PlannedWorkoutId
            });

            return Ok(result);
        }

        // Crear notificación manual (útil para admin/profe por ahora)
        [Authorize(Policy = "CoachOnly")]
        [HttpPost]
        public async Task<IActionResult> Create(NotificationCreateDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Type)) return BadRequest("Type requerido.");
            if (string.IsNullOrWhiteSpace(dto.Title)) return BadRequest("Title requerido.");
            if (string.IsNullOrWhiteSpace(dto.Message)) return BadRequest("Message requerido.");

            if (dto.RunnerId is not null && !await _context.Runners.AnyAsync(r => r.Id == dto.RunnerId))
                return BadRequest("RunnerId no existe.");

            var entity = new Notification
            {
                RunnerId = dto.RunnerId,
                Type = dto.Type.Trim(),
                Title = dto.Title.Trim(),
                Message = dto.Message.Trim(),
                TrainingEventId = dto.TrainingEventId,
                PlannedWorkoutId = dto.PlannedWorkoutId
            };

            _context.Notifications.Add(entity);
            await _context.SaveChangesAsync();

            return Ok(new { entity.Id });
        }

        // Marcar como leída
        [HttpPost("{id:int}/read")]
        public async Task<IActionResult> MarkRead(int id)
        {
            var n = await _context.Notifications.FirstOrDefaultAsync(x => x.Id == id);
            if (n is null) return NotFound();

            if (!n.IsRead)
            {
                n.IsRead = true;
                n.ReadAtUtc = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return Ok();
        }
    }
}
