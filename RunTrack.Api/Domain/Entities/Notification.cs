namespace RunTrack.Api.Domain.Entities
{
    public class Notification
    {
        public int Id { get; set; }

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        // Notificación al corredor (opcional: más adelante agregamos para el profe/grupo)
        public int? RunnerId { get; set; }
        public Runner? Runner { get; set; }

        // Tipo/razón (para filtrar)
        public string Type { get; set; } = null!; // "event_reminder", "confirm_request", "missing_log", etc.

        public string Title { get; set; } = null!;
        public string Message { get; set; } = null!;

        public bool IsRead { get; set; } = false;
        public DateTime? ReadAtUtc { get; set; }

        // Link opcional a un objeto del sistema
        public int? TrainingEventId { get; set; }
        public int? PlannedWorkoutId { get; set; }
    }
}
