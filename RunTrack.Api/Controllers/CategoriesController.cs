using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Data;
using RunTrack.Api.Contracts;
using RunTrack.Api.Domain.Entities;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/categories")]
    public class CategoriesController : ControllerBase
    {
        private readonly RunTrackDbContext _context;

        public CategoriesController(RunTrackDbContext context)
        {
            _context = context;
        }

        // GET /api/categories
        // (permitimos a cualquier usuario autenticado; si querés solo coach, poné Policy CoachOnly)
        [HttpGet]
        [Authorize]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _context.Categories
                .OrderBy(c => c.Name)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Description,
                    c.IsActive
                })
                .ToListAsync();

            return Ok(categories);
        }

        // POST /api/categories
        [HttpPost]
        [Authorize(Policy = "CoachOnly")]
        public async Task<IActionResult> Create([FromBody] CategoryUpsertDto dto)
        {
            var name = (dto.Name ?? "").Trim();
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest("El nombre es obligatorio.");

            var exists = await _context.Categories
                .AnyAsync(c => c.Name.ToLower() == name.ToLower());

            if (exists)
                return Conflict("Ya existe una categoría con ese nombre.");

            var entity = new Category
            {
                Name = name,
                Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim(),
                IsActive = dto.IsActive
            };

            _context.Categories.Add(entity);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetAll), new { id = entity.Id }, new
            {
                entity.Id,
                entity.Name,
                entity.Description,
                entity.IsActive
            });
        }

        // PUT /api/categories/{id}
        [HttpPut("{id:int}")]
        [Authorize(Policy = "CoachOnly")]
        public async Task<IActionResult> Update(int id, [FromBody] CategoryUpsertDto dto)
        {
            var entity = await _context.Categories.FindAsync(id);
            if (entity is null) return NotFound();

            var name = (dto.Name ?? "").Trim();
            if (string.IsNullOrWhiteSpace(name))
                return BadRequest("El nombre es obligatorio.");

            var nameTaken = await _context.Categories
                .AnyAsync(c => c.Id != id && c.Name.ToLower() == name.ToLower());

            if (nameTaken)
                return Conflict("Ya existe una categoría con ese nombre.");

            entity.Name = name;
            entity.Description = string.IsNullOrWhiteSpace(dto.Description) ? null : dto.Description.Trim();
            entity.IsActive = dto.IsActive;

            await _context.SaveChangesAsync();
            return NoContent();
        }

        // PATCH /api/categories/{id}/status
        [HttpPatch("{id:int}/status")]
        [Authorize(Policy = "CoachOnly")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateStatusDto dto)
        {
            var entity = await _context.Categories.FindAsync(id);
            if (entity is null) return NotFound();

            entity.IsActive = dto.IsActive;
            await _context.SaveChangesAsync();

            return Ok(new { entity.Id, entity.IsActive });
        }
    }

    public class UpdateStatusDto
    {
        public bool IsActive { get; set; }
    }
}