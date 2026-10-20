namespace RunTrack.Api.Domain.Entities
{
    public class PlannedWorkout
    {
        public int Id { get; set; }

        // Fecha del entrenamiento (día)
        public DateOnly Date { get; set; }

        // Tipo: Fondo, Series, Técnica, etc.
        public string Type { get; set; } = null!;

        // Indicaciones del profe
        public string? Notes { get; set; }

        // Objetivos opcionales
        public decimal? TargetDistanceKm { get; set; }   // ej: 8.5
        public decimal? TargetDurationMin { get; set; }      // ej: 45.25

        // Asignación: o por categoría, o por corredor (o ambos null NO debería pasar)
        public int? CategoryId { get; set; }
        public Category? Category { get; set; }

        public int? RunnerId { get; set; }
        public Runner? Runner { get; set; }
    }
}
