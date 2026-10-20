using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Contracts.Reports;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;

namespace RunTrack.Api.Controllers
{
    [ApiController]
    [Route("api/reports")]
    [Authorize(Policy = "CoachOnly")]
    public class ReportsController : ControllerBase
    {
        private readonly RunTrackDbContext _context;
        private readonly ILogger<ReportsController> _logger;

        public ReportsController(RunTrackDbContext context, ILogger<ReportsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ✅ 1) Runners (flat)
        [HttpGet("runners")]
        public async Task<IActionResult> Runners()
        {
            var rows = await _context.Runners
                .AsNoTracking()
                .Join(_context.Categories.AsNoTracking(),
                    r => r.CategoryId,
                    c => c.Id,
                    (r, c) => new RunnerReportRowDto
                    {
                        RunnerId = r.Id,
                        FullName = r.FullName,
                        Age = r.Age,
                        Goal = r.Goal,
                        CategoryId = c.Id,
                        CategoryName = c.Name
                    })
                .OrderBy(x => x.CategoryName)
                .ThenBy(x => x.FullName)
                .ToListAsync();

            return Ok(rows);
        }

        // ✅ 2) WorkoutLogs (flat + filtros)
        [HttpGet("workout-logs")]
                public async Task<IActionResult> WorkoutLogs(
                [FromQuery] int skip = 0,
                [FromQuery] int take = 500,
                [FromQuery] DateOnly? from = null,
                [FromQuery] DateOnly? to = null,
                [FromQuery] int? runnerId = null,
                [FromQuery] int? categoryId = null)
        {
            try
            {
                if (skip < 0) return BadRequest("skip debe ser >= 0.");
                if (take <= 0 || take > 5000) return BadRequest("take debe estar entre 1 y 5000.");

                var q = _context.WorkoutLogs.AsNoTracking()
                    .Join(_context.Runners.AsNoTracking(),
                        w => w.RunnerId,
                        r => r.Id,
                        (w, r) => new { w, r })
                    .Join(_context.Categories.AsNoTracking(),
                        wr => wr.r.CategoryId,
                        c => c.Id,
                        (wr, c) => new { wr.w, wr.r, c })
                    .AsQueryable();

                if (from is not null) q = q.Where(x => x.w.Date >= from);
                if (to is not null) q = q.Where(x => x.w.Date <= to);
                if (runnerId is not null) q = q.Where(x => x.w.RunnerId == runnerId);
                if (categoryId is not null) q = q.Where(x => x.r.CategoryId == categoryId);

                var rows = await q
                    .OrderByDescending(x => x.w.Date)
                    .ThenByDescending(x => x.w.Id)
                    .Skip(skip)
                    .Take(take)
                    .Select(x => new WorkoutLogReportRowDto
                    {
                        WorkoutLogId = x.w.Id,
                        Date = x.w.Date,
                        RunnerId = x.r.Id,
                        RunnerName = x.r.FullName,
                        CategoryId = x.c.Id,
                        CategoryName = x.c.Name,
                        DistanceKm = x.w.DistanceKm > 0 ? x.w.DistanceKm : 0,
                        DurationMin = x.w.DurationMin > 0 ? x.w.DurationMin : 0,
                        PaceMinPerKm = x.w.DistanceKm <= 0 ? 0 : Math.Round((decimal)x.w.DurationMin / x.w.DistanceKm, 2),
                        Rpe = x.w.Rpe >= 1 && x.w.Rpe <= 5 ? x.w.Rpe : 1,
                        HadPain = x.w.HadPain,
                        Notes = x.w.Notes,

                    })
                    .ToListAsync();

                return Ok(rows);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReportsController.WorkoutLogs: from={from}, to={to}, runnerId={runnerId}, categoryId={categoryId}", from, to, runnerId, categoryId);
                return Problem(detail: "Error retrieving workout logs", statusCode: StatusCodes.Status500InternalServerError);
            }
        }


        // ✅ 3) Attendance (flat + filtros)
        [HttpGet("attendance")]
        public async Task<IActionResult> Attendance(
        [FromQuery] int skip = 0,
        [FromQuery] int take = 5000,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null,
        [FromQuery] int? runnerId = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] int? trainingEventId = null)
        {
            if (skip < 0) return BadRequest("skip debe ser >= 0.");
            if (take <= 0 || take > 20000) return BadRequest("take debe estar entre 1 y 20000.");

            var today = DateOnly.FromDateTime(DateTime.Today);

            // 1️⃣ Eventos
            var eventsQuery = _context.TrainingEvents.AsNoTracking().AsQueryable();

            if (from is not null) eventsQuery = eventsQuery.Where(e => e.Date >= from);
            if (to is not null) eventsQuery = eventsQuery.Where(e => e.Date <= to);
            if (trainingEventId is not null) eventsQuery = eventsQuery.Where(e => e.Id == trainingEventId);

            var events = await eventsQuery.ToListAsync();

            // 2️⃣ Runners activos
            var runnersQuery = _context.Runners
                .AsNoTracking()
                .Where(r => r.IsActive);

            if (runnerId is not null) runnersQuery = runnersQuery.Where(r => r.Id == runnerId);
            if (categoryId is not null) runnersQuery = runnersQuery.Where(r => r.CategoryId == categoryId);

            var runners = await runnersQuery.ToListAsync();

            // 3️⃣ Attendances reales
            var eventIds = events.Select(e => e.Id).ToList();
            var runnerIds = runners.Select(r => r.Id).ToList();

            var attendances = await _context.Attendances
                .AsNoTracking()
                .Where(a => eventIds.Contains(a.TrainingEventId) && runnerIds.Contains(a.RunnerId))
                .ToListAsync();

            // 4️⃣ Categorías (para nombre)
            var categories = await _context.Categories.AsNoTracking().ToListAsync();

            // 5️⃣ Armado final
            var result = new List<AttendanceReportRowDto>();

            foreach (var ev in events)
            {
                foreach (var runner in runners.Where(r => r.CategoryId == ev.CategoryId))
                {
                    var attendance = attendances
                        .FirstOrDefault(a => a.TrainingEventId == ev.Id && a.RunnerId == runner.Id);

                    AttendanceStatus finalStatus;
                    bool include = true;

                    if (attendance != null)
                    {
                        finalStatus = attendance.Status;
                    }
                    else
                    {
                        // 🔥 lógica clave
                        if (ev.Date < today)
                        {
                            finalStatus = AttendanceStatus.NoShow; // AUSENTE automático
                        }
                        else
                        {
                            include = false; // todavía puede cargar → no mostrar
                            finalStatus = AttendanceStatus.Unknown;
                        }
                    }

                    if (!include) continue;

                    var category = categories.First(c => c.Id == runner.CategoryId);

                    result.Add(new AttendanceReportRowDto
                    {
                        AttendanceId = attendance?.Id ?? 0,
                        TrainingEventId = ev.Id,
                        EventDate = ev.Date,
                        EventTime = ev.Time,
                        EventTitle = ev.Title,
                        Location = ev.Location,
                        RunnerId = runner.Id,
                        RunnerName = runner.FullName,
                        CategoryId = category.Id,
                        CategoryName = category.Name,
                        Status = (int)finalStatus,
                        StatusText = finalStatus == AttendanceStatus.NoShow ? "Ausente" : finalStatus.ToString()
                    });
                }
            }

            var ordered = result
                .OrderByDescending(x => x.EventDate)
                .ThenBy(x => x.EventTime)
                .ThenBy(x => x.RunnerName)
                .Skip(skip)
                .Take(take)
                .ToList();

            return Ok(ordered);
        }


        // ✅ 4) KPIs semanales (simple, ideal para Power BI)
        [HttpGet("weekly-kpis")]
        public async Task<IActionResult> WeeklyKpis([FromQuery] DateOnly? from = null, [FromQuery] DateOnly? to = null)
        {
            try
            {
                var min = from ?? DateOnly.FromDateTime(DateTime.Today).AddDays(-56);
                var max = to ?? DateOnly.FromDateTime(DateTime.Today);

                var logs = await _context.WorkoutLogs.AsNoTracking()
                    .Where(w => w.Date >= min && w.Date <= max)
                    .ToListAsync();

                // Filtrar logs inválidos
                var validLogs = logs
                    .Where(w => w.DistanceKm >= 0 && w.DurationMin >= 0 && w.Rpe >= 1 && w.Rpe <= 5)
                    .ToList();

                if (!validLogs.Any()) return Ok(new List<object>());

                static DateOnly WeekStart(DateOnly d)
                {
                    int dow = (int)d.DayOfWeek;
                    int offset = dow == 0 ? 6 : dow - 1;
                    return d.AddDays(-offset);
                }

                var rows = validLogs
                    .GroupBy(w => WeekStart(w.Date))
                    .Select(g =>
                    {
                        var validInGroup = g.Where(x => x.DistanceKm > 0 && x.DurationMin > 0).ToList();
                        var totalKm = g.Sum(x => x.DistanceKm);
                        var totalMin = g.Sum(x => x.DurationMin);
                        var sessions = g.Count();

                        var pace = validInGroup.Any() && totalKm > 0 ? (decimal)totalMin / totalKm : 0;
                        var painRate = sessions == 0 ? 0 : (decimal)g.Count(x => x.HadPain) / sessions;
                        var avgRpe = sessions == 0 ? 0 : (decimal)g.Average(x => x.Rpe);

                        return new
                        {
                            WeekStart = g.Key,
                            WeekEnd = g.Key.AddDays(6),
                            Sessions = sessions,
                            TotalKm = Math.Round(totalKm, 2),
                            TotalMinutes = totalMin,
                            AvgPaceMinPerKm = Math.Round(pace, 2),
                            PainRate = Math.Round(painRate, 3),
                            AvgRpe = Math.Round(avgRpe, 2)
                        };
                    })
                    .OrderBy(x => x.WeekStart)
                    .ToList();

                return Ok(rows);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in ReportsController.WeeklyKpis: from={from}, to={to}", from, to);
                return Problem(detail: "Error calculating weekly KPIs", statusCode: StatusCodes.Status500InternalServerError);
            }
        }

    }
}
