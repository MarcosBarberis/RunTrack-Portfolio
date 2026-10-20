using Microsoft.EntityFrameworkCore;
using RunTrack.Api.Data;

namespace RunTrack.Api.Services;

public sealed class RunnerActionDecision
{
    public bool Allowed { get; init; }
    public int StatusCode { get; init; } = 400;
    public string Message { get; init; } = "Acción no permitida.";
}

public interface IRunnerActionsPolicy
{
    Task<RunnerActionDecision> CanUpsertTrainingData(int trainingEventId, DateOnly today);
}

public sealed class RunnerActionsPolicy : IRunnerActionsPolicy
{
    private readonly RunTrackDbContext _db;

    public RunnerActionsPolicy(RunTrackDbContext db)
    {
        _db = db;
    }

    public async Task<RunnerActionDecision> CanUpsertTrainingData(int trainingEventId, DateOnly today)
    {
        var ev = await _db.TrainingEvents
            .AsNoTracking()
            .Where(e => e.Id == trainingEventId)
            .Select(e => new { e.Id, e.Date })
            .FirstOrDefaultAsync();

        if (ev is null)
        {
            return new RunnerActionDecision
            {
                Allowed = false,
                StatusCode = 404,
                Message = "TrainingEvent no existe."
            };
        }

        // ✅ REGLA #1: no permitir futuros
        if (ev.Date > today)
        {
            return new RunnerActionDecision
            {
                Allowed = false,
                StatusCode = 400,
                Message = "No podés cargar datos de un entrenamiento futuro."
            };
        }

        // ✅ REGLA #3: ventana de carga = hasta 2 días después (incluye el día 0)
        var lastAllowedDay = ev.Date.AddDays(2);
        if (today > lastAllowedDay)
        {
            return new RunnerActionDecision
            {
                Allowed = false,
                StatusCode = 400,
                Message = "Se venció el plazo de carga (2 días posteriores al entrenamiento)."
            };
        }

        return new RunnerActionDecision { Allowed = true };
    }
}