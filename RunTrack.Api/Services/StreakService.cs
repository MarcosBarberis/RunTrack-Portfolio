using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Data;
using RunTrack.Api.Domain.Entities;

namespace RunTrack.Api.Services
{
    public sealed class StreakService
    {
        private readonly RunTrackDbContext _db;
        private readonly ILogger<StreakService> _logger;

        public StreakService(RunTrackDbContext db, ILogger<StreakService> logger)
        {
            _db = db;
            _logger = logger;
        }

        public async Task UpdateRunnerStreakAsync(int runnerId)
        {
            _logger.LogWarning("XXXXXXXX STREAK VERSION NUEVA XXXXXXXX");
            _logger.LogInformation($"[STREAK] RunnerId={runnerId}");

            var runner = await _db.Runners.FirstOrDefaultAsync(r => r.Id == runnerId);
            if (runner is null)
            {
                _logger.LogError($"[STREAK] Runner {runnerId} no existe");
                throw new InvalidOperationException($"Runner {runnerId} no existe.");
            }

            _logger.LogInformation($"[STREAK] Runner ANTES: CurrentStreak={runner.CurrentStreak}, BestStreak={runner.BestStreak}");

            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            _logger.LogInformation($"[STREAK] Hoy (UTC): {today}");
            _logger.LogInformation($"[STREAK] Runner CategoryId: {runner.CategoryId}");

            // Cargar eventos oficiales de la categoría hasta hoy, ordenados cronológicamente
            var officialEvents = await _db.TrainingEvents
                .AsNoTracking()
                .Where(e => e.IsActive)
                .Where(e => e.Date <= today)
                .Where(e => e.CategoryId == null || e.CategoryId == runner.CategoryId)
                .OrderBy(e => e.Date)
                .ThenBy(e => e.Time)
                .ThenBy(e => e.Id)
                .ToListAsync();

            _logger.LogInformation(
                "[STREAK DEBUG] Orden final eventos: {Eventos}",
                string.Join(" | ",
                    officialEvents.Select(x =>
                        $"{x.Id}-{x.Date}")
                )
            );
            _logger.LogInformation($"[STREAK V2] Eventos oficiales encontrados: {officialEvents.Count}");
            if (officialEvents.Any())
            {
                _logger.LogInformation($"[STREAK V2] Fechas: {string.Join(", ", officialEvents.Select(e => e.Date))}");
            }

            // Cargar TrainingEventIds para los cuales el runner tiene WorkoutLog válido
            var attendedEventIds = await _db.WorkoutLogs
                .AsNoTracking()
                .Where(w =>
                    w.RunnerId == runnerId &&
                    w.TrainingEventId != null &&
                    !w.IsSelfRegistered)
                .Select(w => w.TrainingEventId!.Value)
                .Distinct()
                .ToListAsync();
            _logger.LogInformation($"[STREAK V2] Eventos asistidos: {attendedEventIds.Count}");
            if (attendedEventIds.Any())
            {
                _logger.LogInformation($"[STREAK V2] EventIds asistidos: {string.Join(", ", attendedEventIds)}");
            }

            // Calcular CurrentStreak: recorrer eventos desde el más reciente hacia atrás
            var currentStreak = CalculateCurrentStreakFromEvents(officialEvents, attendedEventIds);
            _logger.LogInformation($"[STREAK V2] CurrentStreak calculado: {currentStreak}");

            // Calcular BestStreak: recorrer cronológicamente y encontrar la mayor secuencia
            var bestStreak = CalculateBestStreakFromEvents(officialEvents, attendedEventIds);
            _logger.LogInformation($"[STREAK V2] BestStreak calculado: {bestStreak}");

            runner.CurrentStreak = currentStreak;
            runner.BestStreak = bestStreak;

            _logger.LogInformation($"[STREAK] Runner DESPUÉS asignación: CurrentStreak={runner.CurrentStreak}, BestStreak={runner.BestStreak}");

            var changeCount = await _db.SaveChangesAsync();
            _logger.LogInformation($"[STREAK] SaveChangesAsync() retornó: {changeCount} cambios guardados");

            var runnerAfter = await _db.Runners.FirstOrDefaultAsync(r => r.Id == runnerId);
            if (runnerAfter is not null)
            {
                _logger.LogInformation($"[STREAK] Runner VERIFICACIÓN POST-SAVE: CurrentStreak={runnerAfter.CurrentStreak}, BestStreak={runnerAfter.BestStreak}");
            }
        }

        public async Task RecalculateRunnerStreakAsync(int runnerId)
        {
            _logger.LogInformation($"[STREAK AUTO] Recalculando racha RunnerId={runnerId}");
            await UpdateRunnerStreakAsync(runnerId);
            _logger.LogInformation($"[STREAK AUTO] Recalculo completado RunnerId={runnerId}");
        }

        /// <summary>
        /// Calcula la racha actual recorriendo los eventos oficiales desde el más reciente hacia atrás.
        /// Se detiene al encontrar el primer evento oficial no asistido.
        /// </summary>
        private static int CalculateCurrentStreakFromEvents(
            IReadOnlyCollection<TrainingEvent> officialEvents,
            IReadOnlyCollection<int> attendedEventIds)
        {
            if (!officialEvents.Any())
            {
                return 0;
            }

            var attended = attendedEventIds.ToHashSet();

            var orderedEvents = officialEvents
                .OrderBy(e => e.Date)
                .ThenBy(e => e.Time)
                .ThenBy(e => e.Id)
                .ToList();

            var streak = 0;

            for (var i = orderedEvents.Count - 1; i >= 0; i--)
            {
                if (attended.Contains(orderedEvents[i].Id))
                {
                    streak++;
                }
                else
                {
                    break;
                }
            }

    return streak;
}

        /// <summary>
        /// Calcula la mejor racha histórica recorriendo cronológicamente los eventos oficiales.
        /// Encuentra la mayor secuencia consecutiva de eventos asistidos.
        /// </summary>
        private static int CalculateBestStreakFromEvents(
            IReadOnlyCollection<TrainingEvent> officialEvents,
            IReadOnlyCollection<int> attendedEventIds)
        {
            if (!officialEvents.Any())
            {
                return 0;
            }

            var attended = attendedEventIds.ToHashSet();

            var orderedEvents = officialEvents
                .OrderBy(e => e.Date)
                .ThenBy(e => e.Time)
                .ThenBy(e => e.Id)
                .ToList();

            var currentRun = 0;
            var bestRun = 0;

            foreach (var trainingEvent in orderedEvents)
            {
                if (attended.Contains(trainingEvent.Id))
                {
                    currentRun++;
                    bestRun = Math.Max(bestRun, currentRun);
                }
                else
                {
                    currentRun = 0;
                }
            }

            return bestRun;
        }
    }
}
