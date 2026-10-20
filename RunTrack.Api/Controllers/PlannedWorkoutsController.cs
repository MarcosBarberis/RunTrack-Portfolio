using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Contracts;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;

namespace RunTrack.Api.Controllers
{
    [Authorize(Policy = "CoachOnly")]
    [ApiController]
    [Route("api/planned-workouts")]
    public class PlannedWorkoutsController : ControllerBase
    {
        private readonly RunTrackDbContext _context;

        public PlannedWorkoutsController(RunTrackDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] DateOnly? date = null)
        {
            var query = _context.PlannedWorkouts
                .Include(p => p.Category)
                .Include(p => p.Runner)
                .AsQueryable();

            if (date is not null)
                query = query.Where(p => p.Date == date);

            var items = await query
                .OrderBy(p => p.Date)
                .ThenBy(p => p.Type)
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create(PlannedWorkoutCreateDto dto)
        {
            // Regla mínima: debe venir CategoryId o RunnerId
            if (dto.CategoryId is null && dto.RunnerId is null)
                return BadRequest("Debe indicar CategoryId o RunnerId.");

            // Validaciones simples de existencia
            if (dto.CategoryId is not null && !await _context.Categories.AnyAsync(c => c.Id == dto.CategoryId))
                return BadRequest("CategoryId no existe.");

            if (dto.RunnerId is not null && !await _context.Runners.AnyAsync(r => r.Id == dto.RunnerId))
                return BadRequest("RunnerId no existe.");

            var entity = new PlannedWorkout
            {
                Date = dto.Date,
                Type = dto.Type,
                Notes = dto.Notes,
                TargetDistanceKm = dto.TargetDistanceKm,
                TargetDurationMin = dto.TargetDurationMin,
                CategoryId = dto.CategoryId,
                RunnerId = dto.RunnerId
            };

            _context.PlannedWorkouts.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, entity);
        }
    }
}
