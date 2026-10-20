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
    [Route("api/analytics")]
    public class AnalyticsController : ControllerBase
    {
        private readonly RunTrackDbContext _context;
        private readonly ILogger<AnalyticsController> _logger;

        public AnalyticsController(RunTrackDbContext context, ILogger<AnalyticsController> logger)
        {
            _context = context;
            _logger = logger;
        }

        // DTO intermedio para materialización segura desde EF (tipos compatibles)
        private class WorkoutLogDto
        {
            public int Id { get; set; }
            public DateOnly Date { get; set; }
            public int RunnerId { get; set; }
            public double DistanceKm { get; set; }
            public double DurationMin { get; set; }
            public int Rpe { get; set; }
            public bool HadPain { get; set; }
        }

        // Convierte DTO intermedio a entidad WorkoutLog en memoria
        private static WorkoutLog DtoToWorkoutLog(WorkoutLogDto dto)
        {
            return new WorkoutLog
            {
                Id = dto.Id,
                Date = dto.Date,
                RunnerId = dto.RunnerId,
                DistanceKm = (decimal)dto.DistanceKm,
                DurationMin = (decimal)dto.DurationMin,
                Rpe = dto.Rpe,
                HadPain = dto.HadPain
            };
        }

        private static DateOnly GetWeekStart(DateOnly date)
        {
            // WeekStart = Lunes
            // DayOfWeek: Sunday=0 ... Saturday=6
            int dow = (int)date.DayOfWeek;
            int offset = dow == 0 ? 6 : dow - 1; // domingo => 6, lunes => 0
            return date.AddDays(-offset);
        }

        /// <summary>
        /// KPIs de un corredor en un rango (por defecto: últimas 4 semanas).
        /// </summary>
        [HttpGet("runner-summary")]
        public async Task<IActionResult> GetRunnerSummary(
        [FromQuery] int runnerId,
        [FromQuery] int weeks = 4,
        [FromQuery] DateOnly? from = null,
        [FromQuery] DateOnly? to = null)
        {
            if (weeks <= 0 || weeks > 52) return BadRequest("weeks debe estar entre 1 y 52.");

            var runner = await _context.Runners.FirstOrDefaultAsync(r => r.Id == runnerId);
            if (runner is null) return BadRequest("RunnerId no existe.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);

            var finalTo = to ?? today;
            var finalFrom = from ?? finalTo.AddDays(-(weeks * 7));

            if (finalFrom > finalTo) return BadRequest("from no puede ser mayor a to.");

            var logsDto = await _context.WorkoutLogs
                .AsNoTracking()
                .Where(w => w.Date >= finalFrom && w.Date <= finalTo)
                .Select(x => new WorkoutLogDto
                {
                    Id = x.Id,
                    Date = x.Date,
                    RunnerId = x.RunnerId,
                    DistanceKm = (double)x.DistanceKm,
                    DurationMin = (double)x.DurationMin,
                    Rpe = x.Rpe,
                    HadPain = x.HadPain
                })
                .ToListAsync();

            var logs = logsDto.Select(DtoToWorkoutLog).ToList();
            var validLogs = logs
                .Where(x => x.DistanceKm > 0 && x.DurationMin > 0)
                .ToList();

            int sessions = validLogs.Count();

            decimal totalKm = sessions > 0 ? validLogs.Sum(x => x.DistanceKm) : 0;
            decimal totalMin = sessions > 0 ? validLogs.Sum(x => x.DurationMin) : 0;

            decimal avgPace = totalKm > 0 ? totalMin / totalKm : 0;

            decimal painRate = sessions > 0
                ? (decimal)validLogs.Count(x => x.HadPain) / sessions
                : 0;

            decimal avgRpe = sessions > 0
                ? validLogs.Average(x => (decimal)x.Rpe)
                : 0;

            var dto = new RunnerKpiSummaryDto
            {
                RunnerId = runner.Id,
                RunnerName = runner.FullName,
                From = finalFrom,
                To = finalTo,
                Sessions = sessions,
                TotalKm = Math.Round(totalKm, 2),
                TotalMinutes = totalMin,
                AvgPaceMinPerKm = Math.Round(avgPace, 2),
                PainRate = Math.Round(painRate, 3),
                AvgRpe = Math.Round(avgRpe, 2)
            };

            return Ok(dto);
        }


        /// <summary>
        /// Resumen semanal del grupo (opcional filtrar por categoría).
        /// weekStart debe ser un lunes (si no, se normaliza al lunes de esa semana).
        /// </summary>
        [HttpGet("weekly-group")]
        public async Task<IActionResult> GetWeeklyGroup(
            [FromQuery] DateOnly? weekStart = null,
            [FromQuery] int? categoryId = null)
        {
            try
            {
                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var ws = weekStart is null ? GetWeekStart(today) : GetWeekStart(weekStart.Value);
                var we = ws.AddDays(6);

                // Base query de logs en la semana
                var query = _context.WorkoutLogs
                    .Where(w => w.Date >= ws && w.Date <= we)
                    .AsQueryable();

                if (categoryId is not null)
                {
                    // Filtrar por corredores de una categoría
                    query = query.Where(w => _context.Runners.Any(r => r.Id == w.RunnerId && r.CategoryId == categoryId));
                }

                var logsDto = await query
                    .Select(x => new WorkoutLogDto
                    {
                        Id = x.Id,
                        Date = x.Date,
                        RunnerId = x.RunnerId,
                        DistanceKm = (double)x.DistanceKm,
                        DurationMin = (double)x.DurationMin,
                        Rpe = x.Rpe,
                        HadPain = x.HadPain
                    })
                    .ToListAsync();

                var logs = logsDto.Select(DtoToWorkoutLog).ToList();

                int sessions = logs.Count();
                decimal totalKm = logs.Sum(x => x.DistanceKm);
                decimal totalMin = logs.Sum(x => x.DurationMin);

                decimal avgPace = totalKm <= 0 ? 0 : totalMin / totalKm;
                decimal painRate = sessions == 0 ? 0 : (decimal)logs.Count(x => x.HadPain) / sessions;
                decimal avgRpe = sessions == 0 ? 0 : (decimal)logs.Average(x => x.Rpe);

                int activeRunners = logs.Select(x => x.RunnerId).Distinct().Count();

                var dto = new WeeklyGroupSummaryDto
                {
                    WeekStart = ws,
                    WeekEnd = we,
                    Sessions = sessions,
                    TotalKm = Math.Round(totalKm, 2),
                    ActiveRunners = activeRunners,
                    AvgPaceMinPerKm = Math.Round(avgPace, 2),
                    PainRate = Math.Round(painRate, 3),
                    AvgRpe = Math.Round(avgRpe, 2)
                };

                return Ok(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in AnalyticsController.GetWeeklyGroup: weekStart={weekStart}, categoryId={categoryId}",
                    weekStart, categoryId);
                return Problem(detail: "Error calculating weekly group", statusCode: StatusCodes.Status500InternalServerError);
            }
        }
        [HttpGet("weekly-attendance")]
        public async Task<IActionResult> GetWeeklyAttendance(
    [FromQuery] DateOnly? weekStart = null,
    [FromQuery] int? categoryId = null)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var ws = weekStart is null ? GetWeekStart(today) : GetWeekStart(weekStart.Value);
            var we = ws.AddDays(6);

            // Eventos en la semana (opcional por categoría)
            var eventsQuery = _context.TrainingEvents
                .Where(e => e.Date >= ws && e.Date <= we)
                .AsQueryable();

            if (categoryId is not null)
                eventsQuery = eventsQuery.Where(e => e.CategoryId == categoryId || e.CategoryId == null);

            var eventIds = await eventsQuery.Select(e => e.Id).ToListAsync();
            var eventsCount = eventIds.Count();

            if (eventsCount == 0)
            {
                return Ok(new WeeklyAttendanceSummaryDto
                {
                    WeekStart = ws,
                    WeekEnd = we,
                    Events = 0,
                    TotalRecords = 0,
                    AttendanceRate = 0
                });
            }

            // Asistencias de esos eventos
            var attQuery = _context.Attendances.Where(a => eventIds.Contains(a.TrainingEventId));

            if (categoryId is not null)
            {
                // filtrar por corredores de esa categoría (si querés que el resumen sea solo esa categoría)
                attQuery = attQuery.Where(a => _context.Runners.Any(r => r.Id == a.RunnerId && r.CategoryId == categoryId));
            }

            var items = await attQuery.ToListAsync();

            int total = items.Count();
            int confirmed = items.Count(x => x.Status == AttendanceStatus.Confirmed);
            int attended = items.Count(x => x.Status == AttendanceStatus.Attended);
            int noShow = items.Count(x => x.Status == AttendanceStatus.NoShow);
            int solo = items.Count(x => x.Status == AttendanceStatus.Solo);
            int unknown = items.Count(x => x.Status == AttendanceStatus.Unknown);

            var rate = confirmed == 0 ? 0 : (decimal)attended / confirmed;

            return Ok(new WeeklyAttendanceSummaryDto
            {
                WeekStart = ws,
                WeekEnd = we,
                Events = eventsCount,
                TotalRecords = total,
                Confirmed = confirmed,
                Attended = attended,
                NoShow = noShow,
                Solo = solo,
                Unknown = unknown,
                AttendanceRate = Math.Round(rate, 3)
            });
        }

        [HttpGet("attendance-ranking")]
        public async Task<IActionResult> GetAttendanceRanking(
            [FromQuery] int weeks = 8,
            [FromQuery] int top = 10,
            [FromQuery] int? categoryId = null)
        {
            if (weeks <= 0 || weeks > 52) return BadRequest("weeks debe estar entre 1 y 52.");
            if (top <= 0 || top > 50) return BadRequest("top debe estar entre 1 y 50.");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var from = today.AddDays(-(weeks * 7));
            var to = today;

            // Eventos en rango
            var eventsQuery = _context.TrainingEvents
                .Where(e => e.Date >= from && e.Date <= to)
                .Select(e => e.Id);

            var attQuery = _context.Attendances.Where(a => eventsQuery.Contains(a.TrainingEventId));

            if (categoryId is not null)
            {
                attQuery = attQuery.Where(a => _context.Runners.Any(r => r.Id == a.RunnerId && r.CategoryId == categoryId));
            }

            var data = await attQuery
                .Include(a => a.Runner)
                .ToListAsync();

            var grouped = data
                .GroupBy(a => new { a.RunnerId, a.Runner.FullName })
                .Select(g =>
                {
                    int confirmed = g.Count(x => x.Status == AttendanceStatus.Confirmed);
                    int attended = g.Count(x => x.Status == AttendanceStatus.Attended);
                    int noShow = g.Count(x => x.Status == AttendanceStatus.NoShow);
                    int solo = g.Count(x => x.Status == AttendanceStatus.Solo);

                    decimal rate = confirmed == 0 ? 0 : (decimal)attended / confirmed;

                    return new AttendanceRankingItemDto
                    {
                        RunnerId = g.Key.RunnerId,
                        RunnerName = g.Key.FullName,
                        Confirmed = confirmed,
                        Attended = attended,
                        NoShow = noShow,
                        Solo = solo,
                        AttendanceRate = Math.Round(rate, 3)
                    };
                })
                .OrderByDescending(x => x.Attended)
                .ThenByDescending(x => x.AttendanceRate)
                .ThenByDescending(x => x.Confirmed)
                .Take(top)
                .ToList();

            return Ok(grouped);
        }

        [HttpGet("kpi-series")]
        public async Task<IActionResult> GetKpiSeries(
            [FromQuery] DateOnly? from = null,
            [FromQuery] DateOnly? to = null,
            [FromQuery] int weeks = 12,
            [FromQuery] int? runnerId = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] string groupBy = "week") // week | month
        {
            try
            {
                if (weeks <= 0 || weeks > 104) return BadRequest("weeks debe estar entre 1 y 104.");

                var today = DateOnly.FromDateTime(DateTime.UtcNow);
                var finalTo = to ?? today;
                var finalFrom = from ?? finalTo.AddDays(-(weeks * 7));
                if (finalFrom > finalTo) return BadRequest("from no puede ser mayor a to.");

                // regla segura: runnerId manda
                if (runnerId is not null) categoryId = null;

                // prefiltrar runners si viene categoryId (subquery IN, eficiente)
                IQueryable<int> runnerIdsByCategory = _context.Runners.Select(r => r.Id);
                if (categoryId is not null)
                    runnerIdsByCategory = _context.Runners.Where(r => r.CategoryId == categoryId).Select(r => r.Id);

                var logsDto = await _context.WorkoutLogs
                    .AsNoTracking()
                    .Where(w => w.Date >= finalFrom && w.Date <= finalTo)
                    .Select(x => new WorkoutLogDto
                    {
                        Id = x.Id,
                        Date = x.Date,
                        RunnerId = x.RunnerId,
                        DistanceKm = (double)x.DistanceKm,
                        DurationMin = (double)x.DurationMin,
                        Rpe = x.Rpe,
                        HadPain = x.HadPain
                    })
                    .ToListAsync();

                var logs = logsDto.Select(DtoToWorkoutLog).ToList();

                if (runnerId is not null)
                    logs = logs.Where(w => w.RunnerId == runnerId.Value).ToList();
                else if (categoryId is not null)
                    logs = logs.Where(w => runnerIdsByCategory.Contains(w.RunnerId)).ToList();

                var validLogs = logs;
                _logger.LogWarning("TOTAL LOGS VALIDOS: {count}", validLogs.Count());

                // Agrupación (en memoria para simplificar con DateOnly)
                var series = groupBy.ToLowerInvariant() == "month"
                    ? validLogs.GroupBy(x => new DateOnly(x.Date.Year, x.Date.Month, 1))
                          .OrderBy(g => g.Key)
                          .Select(g =>
                          {
                              var start = g.Key;
                              var end = start.AddMonths(1).AddDays(-1);
                              return BuildGroupDto(start, end, g.ToList());
                          })
                          .ToList()
                    : new List<WeeklyGroupSummaryDto>();

                if (groupBy.ToLowerInvariant() != "month")
                {
                    series = new List<WeeklyGroupSummaryDto>();

                    var current = GetWeekStart(finalFrom);

                    while (current <= finalTo)
                    {
                        var ws = current;
                        var we = ws.AddDays(6);

                        var items = validLogs
                            .Where(x => GetWeekStart(x.Date) == ws)
                            .ToList();

                        series.Add(BuildGroupDto(ws, we, items));

                        current = current.AddDays(7);
                    }
                }

                _logger.LogWarning("TOTAL SERIES GENERADAS: {count}", series.Count());

                return Ok(series);

            WeeklyGroupSummaryDto BuildGroupDto(DateOnly start, DateOnly end, List<WorkoutLog> items)
            {
                if (items == null || items.Count() == 0)
                {
                    return new WeeklyGroupSummaryDto
                    {
                        WeekStart = start,
                        WeekEnd = end,
                        Sessions = 0,
                        TotalKm = 0,
                        ActiveRunners = 0,
                        AvgPaceMinPerKm = 0,
                        PainRate = 0,
                        AvgRpe = 0
                    };
                }

                int sessions = items.Count();

                decimal totalKm = items.Sum(x => (decimal)x.DistanceKm);
                decimal totalMin = items.Sum(x => (decimal)x.DurationMin);

                decimal avgPace = totalKm > 0 ? totalMin / totalKm : 0;

                decimal painRate = sessions > 0
                    ? (decimal)items.Count(x => x.HadPain) / sessions
                    : 0;

                decimal avgRpe = items.Count() > 0
                    ? items.Average(x => (decimal)x.Rpe)
                    : 0;

                int activeRunners = items.Select(x => x.RunnerId).Distinct().Count();

                return new WeeklyGroupSummaryDto
                {
                    WeekStart = start,
                    WeekEnd = end,
                    Sessions = sessions,
                    TotalKm = Math.Round(totalKm, 2),
                    ActiveRunners = activeRunners,
                    AvgPaceMinPerKm = Math.Round(avgPace, 2),
                    PainRate = Math.Round(painRate, 3),
                    AvgRpe = Math.Round(avgRpe, 2)
                };
            }
            }
           catch (Exception ex)
            {
                _logger.LogError(ex, "ERROR REAL en kpi-series");
                return Problem("No se pudo calcular la serie de KPIs.");
            }
        }
        [HttpGet("attendance-series")]
        public async Task<IActionResult> GetAttendanceSeries(
            [FromQuery] DateOnly? from = null,
            [FromQuery] DateOnly? to = null,
            [FromQuery] int weeks = 12,
            [FromQuery] int? runnerId = null,
            [FromQuery] int? categoryId = null,
            [FromQuery] string groupBy = "week") // week | month
        {
            if (weeks <= 0 || weeks > 104) return BadRequest("weeks debe estar entre 1 y 104.");

            var today = DateOnly.FromDateTime(DateTime.Today);
            var finalTo = to ?? today;
            var finalFrom = from ?? finalTo.AddDays(-(weeks * 7));
            if (finalFrom > finalTo) return BadRequest("from no puede ser mayor a to.");

            if (runnerId is not null) categoryId = null;

            // Eventos en rango (si categoryId, incluye eventos "para todos" null como ya hacés)
            var eventsQuery = _context.TrainingEvents
                .AsNoTracking()
                .Where(e => e.Date >= finalFrom && e.Date <= finalTo);

            if (categoryId is not null)
                eventsQuery = eventsQuery.Where(e => e.CategoryId == categoryId || e.CategoryId == null);

            var eventIds = await eventsQuery.Select(e => e.Id).ToListAsync();
            if (eventIds.Count() == 0) return Ok(new List<WeeklyAttendanceSummaryDto>());

            // asistencias + fecha del evento
            var attQuery = _context.Attendances
                .AsNoTracking()
                .Include(a => a.TrainingEvent)
                .Where(a => eventIds.Contains(a.TrainingEventId));

            if (runnerId is not null)
                attQuery = attQuery.Where(a => a.RunnerId == runnerId.Value);
            else if (categoryId is not null)
                attQuery = attQuery.Where(a => _context.Runners.Any(r => r.Id == a.RunnerId && r.CategoryId == categoryId));

            var items = await attQuery.ToListAsync();

            var series = groupBy.ToLowerInvariant() == "month"
                ? items.GroupBy(x => new DateOnly(x.TrainingEvent.Date.Year, x.TrainingEvent.Date.Month, 1))
                      .OrderBy(g => g.Key)
                      .Select(g => BuildAttendanceDto(g.Key, g.Key.AddMonths(1).AddDays(-1), g.ToList()))
                      .ToList()
                : items.GroupBy(x => GetWeekStart(x.TrainingEvent.Date))
                      .OrderBy(g => g.Key)
                      .Select(g => BuildAttendanceDto(g.Key, g.Key.AddDays(6), g.ToList()))
                      .ToList();

            return Ok(series);

            WeeklyAttendanceSummaryDto BuildAttendanceDto(DateOnly start, DateOnly end, List<Attendance> g)
            {
                int total = g.Count();
                int confirmed = g.Count(x => x.Status == AttendanceStatus.Confirmed);
                int attended = g.Count(x => x.Status == AttendanceStatus.Attended);
                int noShow = g.Count(x => x.Status == AttendanceStatus.NoShow);
                int solo = g.Count(x => x.Status == AttendanceStatus.Solo);
                int unknown = g.Count(x => x.Status == AttendanceStatus.Unknown);

                decimal rate = confirmed == 0 ? 0 : (decimal)attended / confirmed;

                return new WeeklyAttendanceSummaryDto
                {
                    WeekStart = start,
                    WeekEnd = end,
                    // "Events" acá sería la cantidad de eventos únicos en ese bucket
                    Events = g.Select(x => x.TrainingEventId).Distinct().Count(),
                    TotalRecords = total,
                    Confirmed = confirmed,
                    Attended = attended,
                    NoShow = noShow,
                    Solo = solo,
                    Unknown = unknown,
                    AttendanceRate = Math.Round(rate, 3)
                };
            }
        }


    }
}
