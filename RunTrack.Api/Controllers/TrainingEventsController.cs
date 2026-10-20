using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Auth;
using RunTrack.Api.Contracts;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/training-events")]
    public class TrainingEventsController : ControllerBase
    {
        private readonly RunTrackDbContext _context;

        public TrainingEventsController(RunTrackDbContext context)
        {
            _context = context;
        }
        [Authorize(Policy = "CoachOnly")]
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null)
        {
            var query = _context.TrainingEvents
                .Include(e => e.Category)
                .AsQueryable();

            if (from is not null) query = query.Where(e => e.Date >= from);
            if (to is not null) query = query.Where(e => e.Date <= to);

            var items = await query
                .OrderByDescending(e => e.Date)
                .ThenByDescending(e => e.Time)
                .ToListAsync();

            return Ok(items);
        }
        [Authorize(Policy = "CoachOnly")]
        [HttpPost]
        public async Task<IActionResult> Create(TrainingEventCreateDto dto)
        {
            if (dto.CategoryId is not null &&
                !await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId))
                return BadRequest("CategoryId no existe.");

            var entity = new TrainingEvent
            {
                Date = dto.Date,
                Time = dto.Time,
                Title = dto.Title,
                Location = dto.Location,
                Notes = dto.Notes,
                CategoryId = dto.CategoryId
            };

            _context.TrainingEvents.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = entity.Id }, new { entity.Id });
        }
        [Authorize(Policy = "CoachOnly")]
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var ev = await _context.TrainingEvents
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (ev is null) return NotFound();
            return Ok(ev);
        }
        [Authorize(Policy = "CoachOnly")]
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] TrainingEventUpsertDto dto)
        {
            // Validación CategoryId si viene
            if (dto.CategoryId is not null &&
                !await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId))
                return BadRequest("CategoryId no existe.");

            var ev = await _context.TrainingEvents.FindAsync(id);
            if (ev is null) return NotFound();

            // Actualizar campos (según tu entidad real)
            ev.Date = dto.Date;
            ev.Time = dto.Time;
            ev.Title = string.IsNullOrWhiteSpace(dto.Title) ? null : dto.Title.Trim();
            ev.Location = string.IsNullOrWhiteSpace(dto.Location) ? null : dto.Location.Trim();
            ev.Notes = string.IsNullOrWhiteSpace(dto.Notes) ? null : dto.Notes.Trim();
            ev.CategoryId = dto.CategoryId;

            await _context.SaveChangesAsync();
            return NoContent();
        }
        [Authorize(Policy = "CoachOnly")]
        [HttpPatch("{id:int}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var ev = await _context.TrainingEvents.FindAsync(id);
            if (ev is null) return NotFound();

            ev.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { ev.Id, ev.IsActive });
        }
        [Authorize(Policy = "RunnerOnly")]
        [HttpGet("my")]
        public async Task<IActionResult> GetMy([FromQuery] DateTime? from = null, [FromQuery] DateTime? to = null)
        {
            try
            {
                // 👇 evita helpers que puedan tirar excepción
                var ridClaim = User.FindFirst("runner_id");
                if (ridClaim == null || !int.TryParse(ridClaim.Value, out var runnerId))
                    return Forbid();

                var runner = await _context.Runners
                    .AsNoTracking()
                    .FirstOrDefaultAsync(r => r.Id == runnerId);

                if (runner is null) return NotFound("Runner no existe.");
                if (!runner.IsActive)
                    return StatusCode(403, "Runner fuera de actividad, contactarse con su profesor para más info.");

                var today = DateOnly.FromDateTime(DateTime.Today);
                var windowFrom = today.AddDays(-15);
                var windowTo = today.AddDays(15);

                var query = _context.TrainingEvents
                    .AsNoTracking()
                    .Where(e => e.IsActive)
                    .Where(e => e.CategoryId == null || e.CategoryId == runner.CategoryId)
                    .Where(e => e.Date >= windowFrom && e.Date <= windowTo);

                // Si el front manda filtros, solo se aplican dentro de la ventana permitida
                if (from.HasValue)
                {
                    var fromDate = DateOnly.FromDateTime(from.Value);
                    if (fromDate > windowFrom)
                        query = query.Where(e => e.Date >= fromDate);
                }

                if (to.HasValue)
                {
                    var toDate = DateOnly.FromDateTime(to.Value);
                    if (toDate < windowTo)
                        query = query.Where(e => e.Date <= toDate);
                }

                var items = await query
                    .OrderBy(e => e.Date)
                    .ThenBy(e => e.Time)
                    .ToListAsync();

                return Ok(items);
            }
            catch (Exception)
            {
                // No exponemos el detalle interno del error al cliente
                return Problem("No se pudieron cargar los entrenamientos.");
            }
        }
    }
    
}
